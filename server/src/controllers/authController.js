const pool = require('../config/db');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const zxcvbn = require('zxcvbn');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const redisSession = require('../config/redisSession');
const JWT_CONFIG = require('../config/jwtConfig');
const logger = require('../utils/logger');
const otpService = require('../services/otpService');
const otpDeliveryService = require('../services/otpDeliveryService');
const mlFraudScoringService = require('../services/mlFraudScoringService');
const riskTelemetryService = require('../services/riskTelemetryService');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1
};

const DUMMY_ARGON_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$9eLY+7rUQEB+HZa217oMNQ$6HQEI495JcdVXPUdDHibTnZECqFl+K+ffBXzMB+4dKM';

const runQuery = (text, values = []) =>
  pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });

let sessionSchemaCheckPromise = null;

const hashSha256 = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

const safeTextEqual = (a, b) => {
  const left = Buffer.from(String(a), 'utf8');
  const right = Buffer.from(String(b), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const parsePositiveInt = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const hasAdminAccess = (req) => {
  const role = String(req.user?.role || '').toLowerCase();
  return role === 'admin' || role === 'superadmin';
};

const parseOtpCallbackEvents = (provider, req) => {
  const payload = req.body;
  const query = req.query || {};

  const normalizeSingle = (raw) => {
    const body = raw && typeof raw === 'object' ? raw : {};
    const providerMessageId =
      body.MessageSid ||
      body.SmsSid ||
      body.messageSid ||
      body.message_sid ||
      body.sid ||
      body.request_id ||
      body.requestId ||
      body.message_id ||
      body.sg_message_id ||
      body.provider_message_id ||
      query.message_id ||
      null;

    const callbackStatus = String(
      body.MessageStatus ||
      body.SmsStatus ||
      body.status ||
      body.delivery_status ||
      body.event ||
      body.type ||
      'unknown'
    ).toLowerCase();

    const callbackEvent = String(
      body.EventType ||
      body.event ||
      body.type ||
      callbackStatus
    ).toLowerCase();

    const deliveryId =
      body.delivery_id ||
      body.deliveryId ||
      query.delivery_id ||
      null;

    return {
      provider,
      providerMessageId: providerMessageId ? String(providerMessageId) : null,
      callbackStatus,
      callbackEvent,
      deliveryId: deliveryId ? String(deliveryId) : null,
      payload: body
    };
  };

  if (Array.isArray(payload)) {
    return payload.map((entry) => normalizeSingle(entry));
  }

  return [normalizeSingle(payload)];
};

const compareStoredToken = async (incomingToken, storedToken) => {
  if (!incomingToken || !storedToken) return false;

  if (storedToken.startsWith('$2a$') || storedToken.startsWith('$2b$')) {
    return bcrypt.compare(incomingToken, storedToken);
  }

  if (storedToken.startsWith('$argon2')) {
    try {
      return await argon2.verify(storedToken, incomingToken);
    } catch {
      return false;
    }
  }

  return safeTextEqual(incomingToken, storedToken);
};

const ensureUserSessionsSchema = async () => {
  if (!sessionSchemaCheckPromise) {
    sessionSchemaCheckPromise = (async () => {
      const [usersTypeResult, sessionsTypeResult] = await Promise.all([
        runQuery(
          "SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id' LIMIT 1"
        ),
        runQuery(
          "SELECT data_type FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'user_id' LIMIT 1"
        )
      ]);

      const usersType = usersTypeResult.rows[0]?.data_type;
      const sessionsType = sessionsTypeResult.rows[0]?.data_type;

      if (!usersType) {
        throw new Error('[AUTH] users.user_id column not found.');
      }
      if (!sessionsType) {
        throw new Error('[AUTH] user_sessions table/column missing. Run auth session migration.');
      }
      if (usersType !== sessionsType) {
        throw new Error(
          `[AUTH] Schema mismatch users.user_id=${usersType}, user_sessions.user_id=${sessionsType}. Run migration: database/migrations/fix_user_sessions_user_id_type.sql`
        );
      }

      return true;
    })();
  }

  return sessionSchemaCheckPromise;
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, JWT_CONFIG.ACCESS_COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, JWT_CONFIG.COOKIE_OPTIONS);
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: JWT_CONFIG.ACCESS_COOKIE_OPTIONS.secure,
    sameSite: JWT_CONFIG.ACCESS_COOKIE_OPTIONS.sameSite,
    path: JWT_CONFIG.ACCESS_COOKIE_OPTIONS.path
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: JWT_CONFIG.COOKIE_OPTIONS.secure,
    sameSite: JWT_CONFIG.COOKIE_OPTIONS.sameSite,
    path: JWT_CONFIG.COOKIE_OPTIONS.path
  });
};

const buildAuthPayload = (accessToken, refreshToken, user) => {
  const payload = {
    token: accessToken,
    user
  };

  if (JWT_CONFIG.RETURN_REFRESH_TOKEN_IN_BODY) {
    payload.refreshToken = refreshToken;
  }

  return payload;
};

const storeRefreshSession = async (userId, refreshToken, req) => {
  await ensureUserSessionsSchema();
  const tokenHash = await bcrypt.hash(refreshToken, 10);

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  const deviceFingerprint = req.body?.deviceSpecs || userAgent;

  const insertResult = await runQuery(
    `INSERT INTO user_sessions (user_id, token_hash, device_fingerprint, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 days')
     RETURNING session_id`,
    [userId, tokenHash, deviceFingerprint, clientIp, userAgent]
  );
  return { sessionId: insertResult.rows[0]?.session_id || null };
};

const findMatchingRefreshSession = async (userId, incomingToken) => {
  await ensureUserSessionsSchema();
  const sessions = await runQuery(
    `SELECT session_id, token_hash
     FROM user_sessions
     WHERE user_id = $1
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC`,
    [userId]
  );

  for (const session of sessions.rows) {
    const isMatch = await compareStoredToken(incomingToken, session.token_hash);
    if (isMatch) {
      return { sessionId: session.session_id };
    }
  }

  return null;
};

const rotateRefreshSession = async (userId, newRefreshToken, sessionRef) => {
  await ensureUserSessionsSchema();
  const tokenHash = await bcrypt.hash(newRefreshToken, 10);
  await runQuery(
    `UPDATE user_sessions
     SET token_hash = $1, last_activity = NOW(), expires_at = NOW() + INTERVAL '30 days'
     WHERE session_id = $2 AND user_id = $3`,
    [tokenHash, sessionRef.sessionId, userId]
  );
};

const revokeAllRefreshSessions = async (userId) => {
  if (!userId) return;
  await ensureUserSessionsSchema();
  await runQuery('UPDATE user_sessions SET is_active = false WHERE user_id = $1', [userId]);
};

const toSafeUserResponse = (user) => {
  const userName = user.full_name || user.name || 'User';
  return {
    id: user.user_id,
    name: userName,
    email: user.email || null,
    phone: user.phone_number || null,
    role: user.role || 'user',
    tier: user.tier || null
  };
};

const createSession = async (user, req, res) => {
  const userName = user.full_name || user.name || 'User';

  const accessToken = jwt.sign(
    { id: user.user_id, role: user.role, name: userName },
    JWT_CONFIG.SECRET,
    { expiresIn: JWT_CONFIG.ACCESS_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user.user_id },
    JWT_CONFIG.REFRESH_SECRET,
    { expiresIn: JWT_CONFIG.REFRESH_EXPIRY }
  );

  await storeRefreshSession(user.user_id, refreshToken, req);
  setAuthCookies(res, accessToken, refreshToken);

  return buildAuthPayload(accessToken, refreshToken, toSafeUserResponse(user));
};

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { phone, password, fullName, email } = req.body;
  const phoneNumber = phone || req.body.phone_number;
  const normalizedEmail = email?.trim().toLowerCase();
  const client = await pool.connect();

  try {
    const strength = zxcvbn(password || '');
    if (strength.score < 2) {
      return res.status(400).json({
        error: 'Password is too weak. Add numbers, symbols, or make it longer.',
        suggestions: strength.feedback.suggestions
      });
    }

    await client.query('BEGIN');

    const userCheck = await client.query(
      'SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) OR phone_number = $2',
      [normalizedEmail, phoneNumber]
    );
    if (userCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await argon2.hash(password, PASSWORD_HASH_OPTIONS);

    const usernameBase = (normalizedEmail || 'user')
      .split('@')[0]
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 20) || 'user';
    const username = `${usernameBase}_${crypto.randomBytes(4).toString('hex')}`;

    const newUserResult = await client.query(
      `INSERT INTO users (username, name, phone_number, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'user')
       RETURNING user_id, phone_number, email, name, role`,
      [username, fullName?.trim() || 'User', phoneNumber, normalizedEmail, hashedPassword]
    );
    const newUser = newUserResult.rows[0];

    await client.query(
      `INSERT INTO profiles (user_id, full_name, phone)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [newUser.user_id, fullName?.trim() || newUser.name || 'User', phoneNumber || null]
    );

    await client.query('COMMIT');

    const sessionData = await createSession(newUser, req, res);

    try {
      await runQuery(
        'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
        [newUser.user_id, 'SIGNUP_SUCCESS', req.ip, req.headers['user-agent']]
      );
    } catch (logErr) {
      logger.warn('[AUDIT] Failed to log signup, continuing anyway:', logErr.message);
    }

    res.status(201).json({
      success: true,
      ...sessionData
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[SIGNUP ERROR]', err);
    res.status(500).json({ error: 'Server error during signup' });
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  const { email, phone, password, identifier } = req.body;
  const loginIdentifier = (identifier || email || phone || '').trim();

  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    const result = await runQuery(
      `SELECT
         u.user_id,
         u.name,
         u.email,
         u.phone_number,
         u.role,
         u.tier,
         u.password_hash,
         u.is_active,
         u.lock_until,
         NULLIF(to_jsonb(u)->>'locked_until', '') AS locked_until_legacy,
         u.login_attempts
       FROM users u
       WHERE LOWER(u.email) = LOWER($1) OR u.phone_number = $1
       LIMIT 1`,
      [loginIdentifier]
    );

    if (result.rows.length === 0) {
      try {
        await argon2.verify(DUMMY_ARGON_HASH, password || '');
      } catch {
        // Intentionally ignored.
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
    }

    const lockUntil = user.lock_until || user.locked_until_legacy || null;
    if (lockUntil && new Date(lockUntil) > new Date()) {
      return res.status(403).json({
        error: 'Account temporarily locked. Try again in 15 minutes.'
      });
    }

    if (!user.password_hash) {
      return res.status(400).json({
        error: 'No password set for this account. Please use OTP login.',
        useOtp: true
      });
    }

    let isMatch = false;
    if (user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      try {
        isMatch = await argon2.verify(user.password_hash, password);
      } catch {
        isMatch = false;
      }
    }

    if (!isMatch) {
      const attempts = (user.login_attempts || 0) + 1;
      if (attempts >= 5) {
        await runQuery(
          "UPDATE users SET login_attempts = 0, lock_until = NOW() + INTERVAL '15 minutes' WHERE user_id = $1",
          [user.user_id]
        );
        return res.status(403).json({
          error: 'Too many failed login attempts. Account locked for 15 minutes.',
          locked: true
        });
      }

      await runQuery('UPDATE users SET login_attempts = $1 WHERE user_id = $2', [attempts, user.user_id]);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const fraudAssessment = await mlFraudScoringService.scoreLoginAttempt({
      userId: user.user_id,
      ipAddress: clientIp,
      deviceId: req.headers['x-device-id'] || req.headers['user-agent'] || 'unknown-device',
      signals: {
        recentFailedLogins: user.login_attempts || 0,
        newDevice: false
      }
    });

    if (fraudAssessment.enabled) {
      logger.info(
        `[LOGIN RISK] user=${user.user_id} score=${fraudAssessment.score} action=${fraudAssessment.recommendedAction} challenge=${fraudAssessment.shouldChallenge} enforce=${fraudAssessment.shouldEnforce}`
      );
    }

    riskTelemetryService.recordDecision({
      userId: user.user_id,
      flow: 'auth_login',
      enabled: fraudAssessment.enabled,
      score: fraudAssessment.score,
      recommendedAction: fraudAssessment.recommendedAction,
      shouldChallenge: fraudAssessment.shouldChallenge,
      shouldEnforce: fraudAssessment.shouldEnforce,
      shadowMode: fraudAssessment.shadowMode,
      flagReason: fraudAssessment.flag?.reason,
      modelVersion: fraudAssessment.modelVersion,
      explainability: fraudAssessment.explainability
    });

    if (fraudAssessment.shouldEnforce) {
      return res.status(403).json({
        error: 'Login blocked by risk policy. Please contact support if this is unexpected.',
        code: 'RISK_BLOCKED'
      });
    }

    await runQuery(
      `UPDATE users
       SET login_attempts = 0,
           lock_until = NULL,
           last_login = NOW(),
           last_login_ip = $2
       WHERE user_id = $1`,
      [user.user_id, clientIp]
    );

    const sessionData = await createSession(user, req, res);

    try {
      await runQuery(
        `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
         VALUES ($1, 'LOGIN_SUCCESS', $2, $3)`,
        [user.user_id, clientIp, req.headers['user-agent']]
      );
    } catch (logErr) {
      logger.warn('[AUDIT] Failed to log login, continuing anyway:', logErr.message);
    }

    const challengeMode = String(process.env.FRAUD_ML_CHALLENGE_MODE || 'observe').toLowerCase();
    if (fraudAssessment.shouldChallenge && challengeMode === 'enforce') {
      return res.status(401).json({
        error: 'Additional verification required before login can continue.',
        code: 'RISK_CHALLENGE_REQUIRED',
        challengeType: 'otp'
      });
    }

    res.json({
      success: true,
      ...sessionData,
      riskChallenge: fraudAssessment.shouldChallenge
        ? {
            required: true,
            mode: challengeMode,
            challengeType: 'otp',
            recommendedAction: fraudAssessment.recommendedAction
          }
        : null
    });
  } catch (err) {
    logger.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

exports.sendOTP = async (req, res) => {
  const { phone } = req.body;

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({
      error: 'Invalid phone number. Must be 10 digits starting with 6-9.'
    });
  }

  try {
    const rateKey = `OTP_RATE:${phone}`;
    const attempts = (await redisSession.get(rateKey)) || 0;

    if (attempts >= 3) {
      return res.status(429).json({
        error: 'Too many OTP requests. Please wait 10 minutes.',
        retryAfter: 600
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashSha256(otp);

    await Promise.all([
      redisSession.set(`OTP:${phone}`, otpHash, 300),
      redisSession.del(`OTP_VERIFY_ATTEMPTS:${phone}`),
      redisSession.incr(rateKey, 600)
    ]);

    const destination = `+91${phone}`;
    const deliveryResult = await otpService.sendOTP('sms', destination, otp, {
      flow: 'auth',
      purpose: 'login_otp',
      metadata: {
        phone_last4: phone.slice(-4)
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      logger.info(
        `[OTP REQUEST] Phone: ${phone}, OTP Hash: ${otpHash.substring(0, 16)}, Delivery: ${deliveryResult.provider || (deliveryResult.mock ? 'mock' : 'unknown')}, DeliveryID: ${deliveryResult.deliveryId || 'n/a'}, Timestamp: ${new Date().toISOString()}`
      );
    }

    res.json({
      message: 'OTP sent successfully',
      expiresIn: 300,
      deliveryId: deliveryResult.deliveryId || null
    });
  } catch (err) {
    logger.error('[SEND OTP ERROR]', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

exports.handleOtpDeliveryCallback = async (req, res) => {
  const provider = String(req.params.provider || '').trim().toLowerCase();

  if (!provider) {
    return res.status(400).json({ error: 'Provider is required' });
  }

  try {
    const callbackSecret = process.env.OTP_CALLBACK_SECRET;
    if (callbackSecret) {
      const providedSecret =
        req.headers['x-otp-callback-secret'] ||
        req.query.secret ||
        req.body?.secret;

      if (!providedSecret || String(providedSecret) !== String(callbackSecret)) {
        return res.status(403).json({ error: 'Invalid OTP callback secret' });
      }
    }

    const events = parseOtpCallbackEvents(provider, req);
    const outcomes = await Promise.all(
      events.map(async (event) => {
        const outcome = await otpDeliveryService.recordProviderCallback(event);
        return {
          provider_message_id: event.providerMessageId,
          delivery_id: event.deliveryId,
          callback_status: event.callbackStatus,
          matched: outcome.matched,
          reason: outcome.reason || null
        };
      })
    );

    const matchedCount = outcomes.filter((entry) => entry.matched).length;
    return res.json({
      success: true,
      provider,
      processed: outcomes.length,
      matched: matchedCount,
      unmatched: outcomes.length - matchedCount,
      outcomes
    });
  } catch (err) {
    logger.error('[OTP CALLBACK ERROR]', err);
    return res.status(500).json({ error: 'Failed to process OTP callback' });
  }
};

exports.getOtpDeliveryMetrics = async (req, res) => {
  try {
    if (!req.user?.id || !hasAdminAccess(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const lookbackHours = parsePositiveInt(req.query.lookback_hours, 24, 24 * 30);
    const flow = req.query.flow ? String(req.query.flow).trim() : null;
    const purpose = req.query.purpose ? String(req.query.purpose).trim() : null;

    const metrics = await otpDeliveryService.getDeliveryMetrics({
      lookbackHours,
      flow,
      purpose
    });

    return res.json({
      success: true,
      metrics
    });
  } catch (err) {
    logger.error('[OTP METRICS ERROR]', err);
    return res.status(500).json({ error: 'Failed to fetch OTP delivery metrics' });
  }
};

exports.getRiskDecisionMetrics = async (req, res) => {
  try {
    if (!req.user?.id || !hasAdminAccess(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const lookbackMinutes = parsePositiveInt(req.query.lookback_minutes, 60, 24 * 60);
    const metrics = riskTelemetryService.getMetrics({ lookbackMinutes });

    return res.json({
      success: true,
      metrics
    });
  } catch (err) {
    logger.error('[RISK METRICS ERROR]', err);
    return res.status(500).json({ error: 'Failed to fetch risk metrics' });
  }
};

exports.verifyOTP = async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  try {
    const verifyAttemptsKey = `OTP_VERIFY_ATTEMPTS:${phone}`;
    const verifyAttempts = (await redisSession.get(verifyAttemptsKey)) || 0;
    if (verifyAttempts >= 5) {
      return res.status(429).json({
        error: 'Too many invalid OTP attempts. Please request a new OTP.',
        retryAfter: 300
      });
    }

    const storedOtpHash = await redisSession.get(`OTP:${phone}`);
    const incomingOtpHash = hashSha256(otp);

    if (!storedOtpHash || !safeTextEqual(storedOtpHash, incomingOtpHash)) {
      const nextAttempts = await redisSession.incr(verifyAttemptsKey, 300);
      return res.status(400).json({
        error: 'Invalid or expired OTP',
        attemptsRemaining: Math.max(0, 5 - Number(nextAttempts || 0))
      });
    }

    let userResult = await runQuery(
      `SELECT user_id, phone_number, name, email, role, tier
       FROM users
       WHERE phone_number = $1
       LIMIT 1`,
      [phone]
    );
    let user = userResult.rows[0];
    let isNewUser = false;

    if (!user) {
      const autoUsername = `phone_${phone}_${crypto.randomBytes(3).toString('hex')}`;
      const newUser = await runQuery(
        `INSERT INTO users (username, name, phone_number, phone_verified, role)
         VALUES ($1, $2, $3, true, 'user')
         RETURNING user_id, phone_number, name, email, role`,
        [autoUsername, 'User', phone]
      );
      user = newUser.rows[0];
      await runQuery(
        `INSERT INTO profiles (user_id, full_name, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.user_id, user.name || 'User', phone]
      );
      isNewUser = true;
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[AUTH] New user registered via OTP: ${phone}`);
      }
    } else {
      await runQuery('UPDATE users SET phone_verified = true WHERE user_id = $1', [user.user_id]);
    }

    await Promise.all([
      redisSession.del(`OTP:${phone}`),
      redisSession.del(verifyAttemptsKey)
    ]);

    const sessionData = await createSession(user, req, res);

    res.json({
      success: true,
      isNewUser,
      ...sessionData
    });
  } catch (err) {
    logger.error('[VERIFY OTP ERROR]', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

exports.refreshToken = async (req, res) => {
  const incomingToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }

  try {
    const payload = jwt.verify(incomingToken, JWT_CONFIG.REFRESH_SECRET);

    const matchingSession = await findMatchingRefreshSession(payload.id, incomingToken);
    if (!matchingSession) {
      logger.warn(`[SECURITY] Refresh token mismatch/reuse detected for user ${payload.id}`);
      await revokeAllRefreshSessions(payload.id);
      clearAuthCookies(res);
      return res.status(403).json({ error: 'Session invalidated. Please login again.' });
    }

    const userResult = await runQuery(
      'SELECT user_id, name, role, email, phone_number FROM users WHERE user_id = $1',
      [payload.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const userName = user.name || 'User';

    const newAccessToken = jwt.sign(
      { id: user.user_id, role: user.role, name: userName },
      JWT_CONFIG.SECRET,
      { expiresIn: JWT_CONFIG.ACCESS_EXPIRY }
    );

    const newRefreshToken = jwt.sign(
      { id: user.user_id },
      JWT_CONFIG.REFRESH_SECRET,
      { expiresIn: JWT_CONFIG.REFRESH_EXPIRY }
    );

    await rotateRefreshSession(user.user_id, newRefreshToken, matchingSession);
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json(buildAuthPayload(newAccessToken, newRefreshToken, toSafeUserResponse(user)));
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    logger.error('[REFRESH TOKEN ERROR]', err);
    clearAuthCookies(res);
    res.status(403).json({ error: 'Invalid token' });
  }
};

exports.logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;

  try {
    if (refreshToken) {
      const payload = jwt.verify(refreshToken, JWT_CONFIG.REFRESH_SECRET);
      await revokeAllRefreshSessions(payload.id);
    }
  } catch {
    // Token may already be expired/invalid; still clear cookies.
  } finally {
    clearAuthCookies(res);
  }

  res.json({ message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
  try {
    const user = await runQuery(
      'SELECT user_id, name, phone_number, email, role FROM users WHERE user_id = $1',
      [req.user.id]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = user.rows[0];

    let userTier = 'Bronze';
    try {
      const rewardsResult = await runQuery('SELECT tier FROM rewards WHERE user_id = $1', [req.user.id]);
      if (rewardsResult.rows.length > 0) {
        userTier = rewardsResult.rows[0].tier;
      }
    } catch {
      // rewards table is optional for auth identity response
    }

    res.json({
      id: u.user_id,
      name: u.name || 'User',
      role: u.role,
      phone: u.phone_number,
      email: u.email,
      tier: userTier
    });
  } catch (err) {
    logger.error('[GET ME ERROR]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.setPassword = async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id;

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const strength = zxcvbn(password);
    if (strength.score < 2) {
      return res.status(400).json({
        error: 'Password is too weak. Add numbers, symbols, or make it longer.',
        suggestions: strength.feedback.suggestions
      });
    }

    const hash = await argon2.hash(password, PASSWORD_HASH_OPTIONS);

    await runQuery(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE user_id = $2',
      [hash, userId]
    );

    await revokeAllRefreshSessions(userId);
    clearAuthCookies(res);

    res.json({ message: 'Password set successfully. Please login again.' });
  } catch (err) {
    logger.error('[SET PASSWORD ERROR]', err);
    res.status(500).json({ error: 'Failed to set password' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { identifier, phone } = req.body;
  const lookupValue = (identifier || phone || '').trim();

  if (!lookupValue) {
    return res.status(400).json({ error: 'Email or phone number is required' });
  }

  try {
    const userResult = await runQuery(
      'SELECT user_id, email, phone_number FROM users WHERE LOWER(email) = LOWER($1) OR phone_number = $1',
      [lookupValue]
    );

    if (userResult.rows.length === 0) {
      return res.json({ message: 'If this account exists, a reset link/OTP has been sent.' });
    }

    const user = userResult.rows[0];

    const rateKey = `RESET_RATE:${lookupValue}`;
    const attempts = (await redisSession.get(rateKey)) || 0;
    if (attempts >= 5) {
      return res.status(429).json({
        error: 'Too many reset requests. Please wait 30 minutes.',
        retryAfter: 1800
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashSha256(resetToken);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashSha256(otp);
    const resetOtpKey = user.phone_number || lookupValue;

    await Promise.all([
      redisSession.set(`RESET_TOKEN:${resetTokenHash}`, user.user_id, 900),
      redisSession.set(`RESET_OTP:${resetOtpKey}`, otpHash, 900),
      redisSession.incr(rateKey, 1800)
    ]);

    if (process.env.NODE_ENV !== 'production') {
      logger.info(
        `[PASSWORD RESET REQUEST] User: ${user.user_id}, Token Hash: ${resetTokenHash.substring(0, 16)}, OTP Hash: ${otpHash.substring(0, 16)}`
      );
    }

    const responsePayload = {
      message: 'If this account exists, a reset link/OTP has been sent.',
      expiresIn: 900
    };

    // Test-only hook for real integration tests where Redis is process-local.
    if (process.env.NODE_ENV === 'test' && process.env.AUTH_EXPOSE_TEST_SECRETS === 'true') {
      responsePayload.resetToken = resetToken;
      responsePayload.otp = otp;
    }

    res.json(responsePayload);
  } catch (err) {
    logger.error('[FORGOT PASSWORD ERROR]', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, phone, otp, newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!token && (!phone || !otp)) {
    return res.status(400).json({ error: 'Token or Phone+OTP is required' });
  }

  try {
    let userId;

    if (token) {
      const tokenHash = hashSha256(token);
      userId =
        (await redisSession.get(`RESET_TOKEN:${tokenHash}`)) ||
        (await redisSession.get(`RESET_TOKEN:${token}`)); // Backward compatibility.

      if (!userId) {
        return res.status(400).json({ error: 'Invalid or expired reset link' });
      }
    } else if (phone && otp) {
      const storedOtpHash = await redisSession.get(`RESET_OTP:${phone}`);
      const incomingOtpHash = hashSha256(otp);

      if (!storedOtpHash || !safeTextEqual(storedOtpHash, incomingOtpHash)) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      const userResult = await runQuery('SELECT user_id FROM users WHERE phone_number = $1', [phone]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      userId = userResult.rows[0].user_id;
    }

    const strength = zxcvbn(newPassword);
    if (strength.score < 2) {
      return res.status(400).json({
        error: 'Password is too weak. Add numbers, symbols, or make it longer.',
        suggestions: strength.feedback.suggestions
      });
    }

    const hash = await argon2.hash(newPassword, PASSWORD_HASH_OPTIONS);

    await runQuery(
      `UPDATE users
       SET password_hash = $1,
           login_attempts = 0,
           lock_until = NULL,
           password_changed_at = NOW()
       WHERE user_id = $2`,
      [hash, userId]
    );

    const cleanupOps = [];
    if (token) {
      const tokenHash = hashSha256(token);
      cleanupOps.push(redisSession.del(`RESET_TOKEN:${tokenHash}`));
      cleanupOps.push(redisSession.del(`RESET_TOKEN:${token}`));
    }
    if (phone) cleanupOps.push(redisSession.del(`RESET_OTP:${phone}`));
    if (cleanupOps.length) await Promise.all(cleanupOps);

    await revokeAllRefreshSessions(userId);
    clearAuthCookies(res);

    res.json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (err) {
    logger.error('[RESET PASSWORD ERROR]', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
