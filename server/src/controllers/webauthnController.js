const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const { runQuery, parseOptionalString } = require("../utils/dbHelpers");
const redisSession = require("../config/redisSession");
const logger = require("../utils/logger");
const { createSession } = require("./authController");

const CHALLENGE_TTL_SECONDS = Number.parseInt(process.env.WEBAUTHN_CHALLENGE_TTL_SECONDS, 10) || 300;

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");

const parseOriginList = (...rawLists) =>
  rawLists
    .flatMap((raw) => String(raw || "").split(","))
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const resolveWebAuthnConfig = (req) => {
  const rpName = process.env.WEBAUTHN_RP_NAME || "MHub";
  const host = String(req.hostname || req.headers.host || "").split(":")[0];
  const rpID = process.env.WEBAUTHN_RP_ID || host || "localhost";

  const configuredOrigins = parseOriginList(
    process.env.WEBAUTHN_ORIGINS,
    process.env.CORS_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.CLIENT_URL,
  );

  const requestOrigin = normalizeOrigin(req.headers.origin);
  if (requestOrigin && !configuredOrigins.includes(requestOrigin)) {
    const allowDynamic = process.env.NODE_ENV !== "production";
    if (allowDynamic) configuredOrigins.push(requestOrigin);
  }

  const expectedOrigins = configuredOrigins.length
    ? configuredOrigins
    : requestOrigin
      ? [requestOrigin]
      : [];

  return { rpID, rpName, expectedOrigins };
};

const toBase64Url = (buffer) => {
  if (!buffer) return null;
  return Buffer.from(buffer).toString("base64url");
};

const fromBase64Url = (value) => {
  if (!value) return null;
  return Buffer.from(String(value), "base64url");
};

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  return digits;
};

const isEmail = (value) => /@/.test(String(value || ""));

async function lookupUserByIdentifier(identifier) {
  const normalized = parseOptionalString(identifier);
  if (!normalized) return null;
  const phone = normalizePhone(normalized);
  const params = [];

  let where = "";
  if (isEmail(normalized)) {
    params.push(normalized.toLowerCase());
    where = "LOWER(u.email) = $1";
  } else if (/^\d{10}$/.test(phone)) {
    params.push(phone);
    where = "u.phone_number = $1 OR u.phone_number = CONCAT('+91', $1)";
  } else {
    params.push(normalized.toLowerCase());
    where = "LOWER(u.username) = $1";
  }

  const result = await runQuery(
    `
      SELECT u.user_id, u.username, u.name, u.full_name, u.email, u.phone_number, u.role, u.tier
      FROM users u
      WHERE ${where}
      LIMIT 1
    `,
    params,
  );

  return result.rows[0] || null;
}

async function listCredentialsForUser(userId) {
  const result = await runQuery(
    `
      SELECT credential_id, public_key, counter, transports, device_label, created_at, last_used_at
      FROM webauthn_credentials
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId],
  );
  return result.rows || [];
}

exports.getRegistrationOptions = async (req, res) => {
  try {
    const userId = parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { rpID, rpName, expectedOrigins } = resolveWebAuthnConfig(req);
    if (!expectedOrigins.length) {
      return res.status(400).json({ error: "WebAuthn origin not configured" });
    }

    const userResult = await runQuery(
      "SELECT user_id, username, name, full_name, email, phone_number FROM users WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    if (!userResult.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    const existingCredentials = await listCredentialsForUser(userId);

    const options = generateRegistrationOptions({
      rpID,
      rpName,
      userID: user.user_id,
      userName: user.email || user.username || user.phone_number || user.user_id,
      userDisplayName: user.full_name || user.name || user.username || "MHub User",
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
      excludeCredentials: existingCredentials.map((cred) => ({
        id: fromBase64Url(cred.credential_id),
        type: "public-key",
        transports: cred.transports || undefined,
      })),
    });

    await redisSession.set(
      `WEBAUTHN_REG:${userId}`,
      { challenge: options.challenge },
      CHALLENGE_TTL_SECONDS,
    );

    return res.json(options);
  } catch (error) {
    logger.error("[WebAuthn] registration options failed", { message: error.message });
    return res.status(500).json({ error: "Failed to generate passkey options" });
  }
};

exports.verifyRegistration = async (req, res) => {
  try {
    const userId = parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { rpID, expectedOrigins } = resolveWebAuthnConfig(req);
    if (!expectedOrigins.length) {
      return res.status(400).json({ error: "WebAuthn origin not configured" });
    }

    const payload =
      req.body?.attestation ||
      req.body?.credential ||
      req.body?.response ||
      req.body;
    if (!payload?.id) {
      return res.status(400).json({ error: "Missing passkey response" });
    }

    const challengePayload = await redisSession.get(`WEBAUTHN_REG:${userId}`);
    if (!challengePayload?.challenge) {
      return res.status(400).json({ error: "Registration challenge expired. Please retry." });
    }

    const verification = await verifyRegistrationResponse({
      response: payload,
      expectedChallenge: challengePayload.challenge,
      expectedOrigin: expectedOrigins.length === 1 ? expectedOrigins[0] : expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification?.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: "Passkey verification failed" });
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    const credentialId = toBase64Url(credentialID);
    const publicKey = toBase64Url(credentialPublicKey);
    const transports = payload?.transports || payload?.response?.transports || null;
    const deviceLabel = parseOptionalString(req.body?.deviceLabel || req.body?.deviceName);

    await runQuery(
      `
        INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports, device_label)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (credential_id) DO NOTHING
      `,
      [userId, credentialId, publicKey, counter || 0, transports, deviceLabel],
    );

    await redisSession.del(`WEBAUTHN_REG:${userId}`);

    return res.json({ verified: true });
  } catch (error) {
    logger.error("[WebAuthn] registration verify failed", { message: error.message });
    return res.status(500).json({ error: "Failed to verify passkey" });
  }
};

exports.getAuthenticationOptions = async (req, res) => {
  try {
    const identifier = parseOptionalString(req.body?.identifier || req.body?.username || req.body?.email || req.body?.phone);
    if (!identifier) {
      return res.status(400).json({ error: "Identifier required for passkey login" });
    }

    const user = await lookupUserByIdentifier(identifier);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { rpID, expectedOrigins } = resolveWebAuthnConfig(req);
    if (!expectedOrigins.length) {
      return res.status(400).json({ error: "WebAuthn origin not configured" });
    }

    const credentials = await listCredentialsForUser(user.user_id);
    if (!credentials.length) {
      return res.status(404).json({ error: "No passkeys registered for this account" });
    }

    const options = generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: credentials.map((cred) => ({
        id: fromBase64Url(cred.credential_id),
        type: "public-key",
        transports: cred.transports || undefined,
      })),
    });

    await redisSession.set(
      `WEBAUTHN_AUTH:${user.user_id}`,
      { challenge: options.challenge },
      CHALLENGE_TTL_SECONDS,
    );

    return res.json(options);
  } catch (error) {
    logger.error("[WebAuthn] auth options failed", { message: error.message });
    return res.status(500).json({ error: "Failed to generate passkey challenge" });
  }
};

exports.verifyAuthentication = async (req, res) => {
  try {
    const identifier = parseOptionalString(req.body?.identifier || req.body?.username || req.body?.email || req.body?.phone);
    if (!identifier) {
      return res.status(400).json({ error: "Identifier required for passkey login" });
    }

    const user = await lookupUserByIdentifier(identifier);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const payload = req.body?.assertion || req.body?.credential || req.body?.response || req.body;
    if (!payload?.id) {
      return res.status(400).json({ error: "Missing passkey response" });
    }

    const { rpID, expectedOrigins } = resolveWebAuthnConfig(req);
    if (!expectedOrigins.length) {
      return res.status(400).json({ error: "WebAuthn origin not configured" });
    }

    const challengePayload = await redisSession.get(`WEBAUTHN_AUTH:${user.user_id}`);
    if (!challengePayload?.challenge) {
      return res.status(400).json({ error: "Authentication challenge expired. Please retry." });
    }

    const credentialId = parseOptionalString(payload.id);
    const credResult = await runQuery(
      `
        SELECT credential_id, public_key, counter, transports
        FROM webauthn_credentials
        WHERE user_id = $1 AND credential_id = $2
        LIMIT 1
      `,
      [user.user_id, credentialId],
    );
    if (!credResult.rows.length) {
      return res.status(404).json({ error: "Passkey not registered for this account" });
    }

    const credential = credResult.rows[0];

    const verification = await verifyAuthenticationResponse({
      response: payload,
      expectedChallenge: challengePayload.challenge,
      expectedOrigin: expectedOrigins.length === 1 ? expectedOrigins[0] : expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: true,
      authenticator: {
        credentialID: fromBase64Url(credential.credential_id),
        credentialPublicKey: fromBase64Url(credential.public_key),
        counter: Number(credential.counter || 0),
        transports: credential.transports || undefined,
      },
    });

    if (!verification?.verified) {
      return res.status(401).json({ error: "Passkey verification failed" });
    }

    const newCounter = verification.authenticationInfo?.newCounter ?? null;
    await runQuery(
      `
        UPDATE webauthn_credentials
        SET counter = COALESCE($3, counter),
            last_used_at = NOW()
        WHERE user_id = $1 AND credential_id = $2
      `,
      [user.user_id, credentialId, newCounter],
    );

    await redisSession.del(`WEBAUTHN_AUTH:${user.user_id}`);

    const sessionPayload = await createSession(user, req, res);
    return res.json({ success: true, ...sessionPayload });
  } catch (error) {
    logger.error("[WebAuthn] authentication verify failed", { message: error.message });
    return res.status(500).json({ error: "Failed to verify passkey login" });
  }
};

exports.listCredentials = async (req, res) => {
  try {
    const userId = parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const credentials = await runQuery(
      `
        SELECT credential_id, device_label, transports, created_at, last_used_at
        FROM webauthn_credentials
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return res.json({ credentials: credentials.rows || [] });
  } catch (error) {
    logger.error("[WebAuthn] list credentials failed", { message: error.message });
    return res.status(500).json({ error: "Failed to load passkeys" });
  }
};

exports.revokeCredential = async (req, res) => {
  try {
    const userId = parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const credentialId = parseOptionalString(req.params?.credentialId);
    if (!credentialId) {
      return res.status(400).json({ error: "Credential ID required" });
    }

    const result = await runQuery(
      `DELETE FROM webauthn_credentials WHERE user_id = $1 AND credential_id = $2 RETURNING credential_id`,
      [userId, credentialId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Passkey not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error("[WebAuthn] revoke credential failed", { message: error.message });
    return res.status(500).json({ error: "Failed to revoke passkey" });
  }
};
