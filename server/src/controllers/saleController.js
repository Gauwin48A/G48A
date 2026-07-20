const { pool, runQuery, getAuthUserId, DB_QUERY_TIMEOUT_MS } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt, parsePositiveNumber } = require("../utils/parseHelpers");
const crypto = require("crypto");
const otpService = require("../services/otpService");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");
const { emitNotification } = require("../services/notificationEmitter");
const {
  applyRewardDeltaInTransaction,
  afterCommitRewardMutation,
} = require("../services/rewardsLedgerService");
const {
  applyReferralChainRewards,
  CHAIN_MAX_DEPTH,
} = require("../services/referralChainRewards");
const {
  calculateSaleRewardPoints,
  hasPriorCompletedTransactions,
} = require("../services/transactionRewardService");

/* ── Constants ─────────────────────────────────────────────────── */

const DEFAULT_PENDING_SALES_LIMIT = 50;
const MAX_PENDING_SALES_LIMIT = 200;
const PENDING_SALES_CACHE_TTL_SECONDS = 15;
const PENDING_SALE_STATUSES = ["pending_buyer_confirm", "initiated", "pending"];
const FIRST_SALE_BONUS_POINTS = Number.parseInt(process.env.FIRST_SALE_BONUS_POINTS, 10) || 100;
const FIRST_PURCHASE_BONUS_POINTS =
  Number.parseInt(process.env.FIRST_PURCHASE_BONUS_POINTS, 10) || 50;
const DIRECT_REFERRAL_BONUS_POINTS =
  Number.parseInt(process.env.DIRECT_REFERRAL_BONUS_POINTS, 10) || 50;
const COMPLETED_TRANSACTION_STATUSES = ["completed", "success"];

let txSchemaCache = { value: null, expiresAt: 0 };

/* ── Helpers ───────────────────────────────────────────────────── */

function idsEqual(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function normalizeImagesPayload(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (value === null || value === undefined) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // fall through
    }
    return [trimmed];
  }
  return [];
}

async function hasAnyCompletedTransactions(client, userId, excludeTransactionId) {
  if (!client || !userId) return false;
  const result = await client.query(
    {
      text: `
        SELECT 1
        FROM transactions
        WHERE (seller_id::text = $1 OR buyer_id::text = $1)
          AND status = ANY($2::text[])
          AND transaction_id::text <> $3
        LIMIT 1
      `,
      values: [
        String(userId),
        COMPLETED_TRANSACTION_STATUSES,
        String(excludeTransactionId || ""),
      ],
      query_timeout: DB_QUERY_TIMEOUT_MS,
    },
  );
  return result.rows.length > 0;
}

async function getReferrerId(client, userId) {
  if (!client || !userId) return null;
  const result = await client.query(
    {
      text: `
        SELECT referred_by::text AS referrer_id
        FROM users
        WHERE user_id::text = $1
        LIMIT 1
      `,
      values: [String(userId)],
      query_timeout: DB_QUERY_TIMEOUT_MS,
    },
  );
  const referrerId = parseOptionalString(result.rows[0]?.referrer_id);
  if (!referrerId || referrerId === String(userId)) return null;
  return referrerId;
}

function hashOtp(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function invalidateSaleCache(userId) {
  if (!userId) return;
  cacheService.clearPattern(`sale:${userId}:*`);
}

function otpHashCacheKey(transactionId) {
  return `sale:otp:${transactionId}`;
}

function otpAttemptsCacheKey(transactionId) {
  return `sale:otp_attempts:${transactionId}`;
}

function isPendingStatus(status) {
  return PENDING_SALE_STATUSES.includes(String(status || "").toLowerCase());
}

function isLegacyTransactionSchemaError(error) {
  if (!error || error.code !== "42703") return false;
  const message = String(error.message || "").toLowerCase();
  return (
    message.includes("agreed_price") ||
    message.includes("secret_otp") ||
    message.includes("otp_hash") ||
    message.includes("otp_expires_at") ||
    message.includes("otp_attempts") ||
    message.includes("expires_at") ||
    message.includes("cancelled_by") ||
    message.includes("cancel_reason")
  );
}

async function getTransactionSchema(queryable) {
  const now = Date.now();
  if (txSchemaCache.value && txSchemaCache.expiresAt > now) {
    return txSchemaCache.value;
  }

  const result = await queryable.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'transactions'
    `,
  );

  const columns = new Set((result.rows || []).map((row) => String(row.column_name || "").toLowerCase()));

  const schema = {
    columns,
    transactionId: columns.has("transaction_id"),
    postId: columns.has("post_id"),
    sellerId: columns.has("seller_id"),
    buyerId: columns.has("buyer_id"),
    status: columns.has("status"),
    agreedPrice: columns.has("agreed_price"),
    amount: columns.has("amount"),
    secretOtp: columns.has("secret_otp"),
    otpHash: columns.has("otp_hash"),
    otpExpiresAt: columns.has("otp_expires_at"),
    otpAttempts: columns.has("otp_attempts"),
    expiresAt: columns.has("expires_at"),
    completedAt: columns.has("completed_at"),
    cancelledBy: columns.has("cancelled_by"),
    cancelReason: columns.has("cancel_reason"),
    createdAt: columns.has("created_at"),
  };

  schema.priceColumn = schema.agreedPrice ? "agreed_price" : schema.amount ? "amount" : null;

  txSchemaCache = {
    value: schema,
    expiresAt: now + 30_000,
  };

  return schema;
}

function supportsSaleTransactions(schema) {
  return Boolean(
    schema &&
      schema.transactionId &&
      schema.postId &&
      schema.sellerId &&
      schema.buyerId &&
      schema.status &&
      schema.priceColumn,
  );
}

async function updatePostStatus(client, postId, preferredStatus, fallbackStatus = null) {
  const statuses = [preferredStatus];
  if (fallbackStatus && fallbackStatus !== preferredStatus) {
    statuses.push(fallbackStatus);
  }

  for (let index = 0; index < statuses.length; index += 1) {
    const nextStatus = statuses[index];
    try {
      await client.query("UPDATE posts SET status = $2 WHERE post_id = $1", [postId, nextStatus]);
      return nextStatus;
    } catch (error) {
      const isStatusConstraint =
        error?.code === "23514" ||
        error?.code === "22P02" ||
        error?.code === "42703" ||
        String(error?.message || "").toLowerCase().includes("status");
      const hasFallback = index < statuses.length - 1;
      if (isStatusConstraint && hasFallback) {
        continue;
      }
      if (isStatusConstraint) {
        logger.warn("[Sale] Unable to persist preferred post status; continuing", {
          post_id: postId,
          status: nextStatus,
          code: error?.code,
          message: error?.message,
        });
        return null;
      }
      throw error;
    }
  }

  return null;
}

async function setTransactionStatus(client, schema, transactionId, candidates, options = {}) {
  if (!schema.status) return null;

  for (const status of candidates) {
    try {
      const values = [transactionId, status];
      const setClauses = ["status = $2"];

      if (options.withCompletedAt && schema.completedAt) {
        setClauses.push("completed_at = NOW()");
      }

      if (options.resetOtpAttempts && schema.otpAttempts) {
        setClauses.push("otp_attempts = 0");
      }

      if (options.cancelledBy !== undefined && schema.cancelledBy) {
        values.push(options.cancelledBy);
        setClauses.push(`cancelled_by = $${values.length}`);
      }

      if (options.cancelReason !== undefined && schema.cancelReason) {
        values.push(options.cancelReason);
        setClauses.push(`cancel_reason = $${values.length}`);
      }

      await client.query(
        `UPDATE transactions SET ${setClauses.join(", ")} WHERE transaction_id = $1`,
        values,
      );

      return status;
    } catch (error) {
      if (error?.code === "23514") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Could not update transaction status with available schema constraints");
}


const initiateSale = async (req, res) => {
  const sellerId = getAuthUserId(req);
  const { postId, buyerId, agreedPrice } = req.body || {};

  if (!sellerId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!postId || !buyerId || agreedPrice === undefined || agreedPrice === null) {
    return res.status(400).json({ error: "Post ID, Buyer ID, and Agreed Price are required" });
  }

  const normalizedPrice = parsePositiveNumber(agreedPrice);
  if (!normalizedPrice) {
    return res.status(400).json({ error: "Agreed price must be a positive number" });
  }

  if (idsEqual(sellerId, buyerId)) {
    return res.status(400).json({ error: "Cannot sell to yourself" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const schema = await getTransactionSchema(client);
    if (!supportsSaleTransactions(schema)) {
      await client.query("ROLLBACK");
      return res.status(500).json({
        error:
          "Transactions table is missing sale columns (transaction_id/post_id/seller_id/buyer_id/status/price).",
      });
    }

    const postCheck = await client.query(
      `
        SELECT post_id, user_id, status, title
        FROM posts
        WHERE post_id = $1
        FOR UPDATE
      `,
      [postId],
    );

    if (postCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postCheck.rows[0];
    if (!idsEqual(post.user_id, sellerId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "You are not the owner of this post" });
    }

    if (String(post.status || "").toLowerCase() !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Post is not available for sale" });
    }

    const existingCheck = await client.query(
      `
        SELECT transaction_id
        FROM transactions
        WHERE post_id = $1
          AND status = ANY($2::text[])
        LIMIT 1
      `,
      [postId, PENDING_SALE_STATUSES],
    );

    if (existingCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "A sale is already in progress for this item" });
    }

    const secretOTP =
      typeof otpService.generateOTP === "function"
        ? otpService.generateOTP()
        : crypto.randomInt(100000, 1000000).toString();
    const hashedOTP = hashOtp(secretOTP);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const otpExpiresAt = new Date(Date.now() + (otpService.OTP_EXPIRY_MINUTES || 10) * 60 * 1000);

    const insertColumns = ["post_id", "seller_id", "buyer_id", schema.priceColumn];
    const insertValues = [postId, sellerId, buyerId, normalizedPrice];

    if (schema.secretOtp) {
      insertColumns.push("secret_otp");
      insertValues.push(secretOTP);
    }
    if (schema.otpHash) {
      insertColumns.push("otp_hash");
      insertValues.push(hashedOTP);
    }
    if (schema.otpExpiresAt) {
      insertColumns.push("otp_expires_at");
      insertValues.push(otpExpiresAt);
    }
    if (schema.otpAttempts) {
      insertColumns.push("otp_attempts");
      insertValues.push(0);
    }
    if (schema.status) {
      insertColumns.push("status");
      insertValues.push("pending_buyer_confirm");
    }
    if (schema.expiresAt) {
      insertColumns.push("expires_at");
      insertValues.push(expiresAt);
    }

    const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(", ");
    const insertResult = await client.query(
      `
        INSERT INTO transactions (${insertColumns.join(", ")})
        VALUES (${placeholders})
        RETURNING transaction_id
      `,
      insertValues,
    );

    const transactionId = insertResult.rows[0]?.transaction_id;

    await updatePostStatus(client, postId, "sale_pending", "active");

    try {
      await client.query(
        `
          INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
          VALUES ($1, $2, $3, 'sale_confirmation', $4, NOW())
        `,
        [
          buyerId,
          "Confirm Your Purchase",
          `The seller has initiated a sale for "${post.title || "an item"}". Please confirm with the OTP code they provide.`,
          transactionId,
        ],
      );
    } catch (notifyErr) {
      logger.warn("[Sale] Notification insert failed during initiate (non-blocking):", notifyErr.message);
    }

    await client.query("COMMIT");

    if (!schema.secretOtp && !schema.otpHash) {
      cacheService.set(otpHashCacheKey(transactionId), hashedOTP, (otpService.OTP_EXPIRY_MINUTES || 10) * 60);
      cacheService.set(otpAttemptsCacheKey(transactionId), 0, (otpService.OTP_EXPIRY_MINUTES || 10) * 60);
    }

    invalidateSaleCache(sellerId);
    invalidateSaleCache(buyerId);

    try {
      const buyerInfo = await runQuery(
        `
          SELECT
            email,
            COALESCE(
              NULLIF(to_jsonb(users)->>'phone_number', ''),
              NULLIF(to_jsonb(users)->>'phone', '')
            ) AS phone
          FROM users
          WHERE user_id::text = $1
          LIMIT 1
        `,
        [String(buyerId)],
      );

      const buyerEmail = buyerInfo.rows[0]?.email ? String(buyerInfo.rows[0].email).trim() : null;
      const numericPhone = buyerInfo.rows[0]?.phone
        ? String(buyerInfo.rows[0].phone).replace(/\D/g, "")
        : "";

      if (numericPhone) {
        const destination = numericPhone.length === 10
          ? `+91${numericPhone}`
          : numericPhone.startsWith("91")
            ? `+${numericPhone}`
            : `+${numericPhone}`;
        await otpService.sendOTP("sms", destination, secretOTP, {
          flow: "sale",
          purpose: "sale_confirm",
          metadata: {
            transaction_id: String(transactionId),
            post_id: String(postId),
            buyer_id: String(buyerId),
          },
        });
      } else if (buyerEmail) {
        await otpService.sendOTP("email", buyerEmail, secretOTP, {
          flow: "sale",
          purpose: "sale_confirm",
          metadata: {
            transaction_id: String(transactionId),
            post_id: String(postId),
            buyer_id: String(buyerId),
          },
        });
      }
    } catch (notifyErr) {
      logger.warn("[Sale] OTP notification failed (non-blocking):", notifyErr.message);
    }

    return res.status(201).json({
      message: "Sale initiated successfully",
      transaction: {
        transactionId,
        status: "pending_buyer_confirm",
        otpExpiresIn: `${otpService.OTP_EXPIRY_MINUTES || 10} minutes`,
        expiresAt,
      },
      instructions:
        "The OTP has been sent to the buyer. The buyer must enter transaction id + OTP to complete the sale.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("[Sale] Initiate error:", error);
    if (isLegacyTransactionSchemaError(error)) {
      return res.status(500).json({
        error: "Transactions schema mismatch. Apply sale transaction migrations and retry.",
      });
    }
    return res.status(500).json({ error: "Failed to initiate sale" });
  } finally {
    client.release();
  }
};

const confirmSale = async (req, res) => {
  const buyerId = getAuthUserId(req);
  const { transactionId, sellerId, postId, otp } = req.body || {};

  if (!buyerId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if ((!transactionId && (!sellerId || !postId)) || !otp) {
    return res.status(400).json({ error: "Seller ID + Post ID (or Transaction ID) and OTP are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const schema = await getTransactionSchema(client);
    if (!supportsSaleTransactions(schema)) {
      await client.query("ROLLBACK");
      return res.status(500).json({
        error:
          "Transactions table is missing sale columns (transaction_id/post_id/seller_id/buyer_id/status/price).",
      });
    }

    const txResult = transactionId
      ? await client.query(
          `
            SELECT
              transaction_id,
              post_id,
              seller_id,
              buyer_id,
              ${schema.priceColumn} AS agreed_price,
              ${schema.secretOtp ? "secret_otp" : "NULL::text AS secret_otp"},
              ${schema.otpHash ? "otp_hash" : "NULL::text AS otp_hash"},
              ${schema.otpExpiresAt ? "otp_expires_at" : "NULL::timestamp AS otp_expires_at"},
              ${schema.otpAttempts ? "otp_attempts" : "0::int AS otp_attempts"},
              status,
              ${schema.expiresAt ? "expires_at" : "NULL::timestamp AS expires_at"}
            FROM transactions
            WHERE transaction_id = $1
            FOR UPDATE
          `,
          [transactionId],
        )
      : await client.query(
          `
            SELECT
              transaction_id,
              post_id,
              seller_id,
              buyer_id,
              ${schema.priceColumn} AS agreed_price,
              ${schema.secretOtp ? "secret_otp" : "NULL::text AS secret_otp"},
              ${schema.otpHash ? "otp_hash" : "NULL::text AS otp_hash"},
              ${schema.otpExpiresAt ? "otp_expires_at" : "NULL::timestamp AS otp_expires_at"},
              ${schema.otpAttempts ? "otp_attempts" : "0::int AS otp_attempts"},
              status,
              ${schema.expiresAt ? "expires_at" : "NULL::timestamp AS expires_at"}
            FROM transactions
            WHERE (seller_id = $1 OR seller_id::text = $1)
              AND (post_id = $2 OR post_id::text = $2)
              AND status IN ('pending_buyer_confirm', 'initiated', 'pending')
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE
          `,
          [sellerId, postId],
        );

    if (txResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pending sale transaction not found" });
    }

    const transaction = txResult.rows[0];

    if (!idsEqual(transaction.buyer_id, buyerId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "You are not the buyer for this transaction" });
    }

    if (!isPendingStatus(transaction.status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Transaction is ${transaction.status}, cannot confirm`,
      });
    }

    const now = new Date();

    if (schema.expiresAt && transaction.expires_at && now > new Date(transaction.expires_at)) {
      await setTransactionStatus(client, schema, transactionId, ["expired", "failed"]);
      await updatePostStatus(client, transaction.post_id, "active");
      await client.query("COMMIT");
      invalidateSaleCache(transaction.seller_id);
      invalidateSaleCache(transaction.buyer_id);
      return res.status(400).json({ error: "Transaction has expired" });
    }

    const otpTtlSeconds = (otpService.OTP_EXPIRY_MINUTES || 10) * 60;
    const maxAttempts = otpService.MAX_ATTEMPTS || 3;
    const hashedInput = hashOtp(otp);

    if (schema.otpExpiresAt && transaction.otp_expires_at && now > new Date(transaction.otp_expires_at)) {
      await setTransactionStatus(client, schema, transactionId, ["expired", "failed"]);
      await updatePostStatus(client, transaction.post_id, "active");
      await client.query("COMMIT");
      invalidateSaleCache(transaction.seller_id);
      invalidateSaleCache(transaction.buyer_id);
      return res.status(400).json({
        error: "OTP has expired. Ask the seller to initiate a new sale.",
      });
    }

    let attempts = Number(transaction.otp_attempts || 0);
    if (!schema.otpAttempts) {
      attempts = Number(cacheService.get(otpAttemptsCacheKey(transactionId)) || attempts || 0);
    }

    if (attempts >= maxAttempts) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Too many failed OTP attempts. Ask the seller to initiate a new sale.",
      });
    }

    let otpValid = false;
    if (schema.otpHash || schema.secretOtp) {
      otpValid =
        (schema.otpHash && transaction.otp_hash && transaction.otp_hash === hashedInput) ||
        (schema.secretOtp && String(transaction.secret_otp || "") === String(otp));
    } else {
      const cachedHash = cacheService.get(otpHashCacheKey(transactionId));
      if (!cachedHash) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "OTP has expired. Ask the seller to initiate a new sale.",
        });
      }
      otpValid = cachedHash === hashedInput;
    }

    if (!otpValid) {
      if (schema.otpAttempts) {
        const attemptsResult = await client.query(
          `
            UPDATE transactions
            SET otp_attempts = COALESCE(otp_attempts, 0) + 1
            WHERE transaction_id = $1
            RETURNING otp_attempts
          `,
          [transactionId],
        );
        await client.query("COMMIT");
        invalidateSaleCache(transaction.seller_id);
        invalidateSaleCache(transaction.buyer_id);
        const updatedAttempts = Number(attemptsResult.rows[0]?.otp_attempts || attempts + 1);
        const remaining = Math.max(0, maxAttempts - updatedAttempts);
        return res.status(400).json({
          error: `Invalid OTP code. ${remaining} attempt(s) remaining.`,
        });
      }

      const updatedAttempts = attempts + 1;
      cacheService.set(otpAttemptsCacheKey(transactionId), updatedAttempts, otpTtlSeconds);
      await client.query("ROLLBACK");
      const remaining = Math.max(0, maxAttempts - updatedAttempts);
      return res.status(400).json({
        error: `Invalid OTP code. ${remaining} attempt(s) remaining.`,
      });
    }

    await setTransactionStatus(client, schema, transactionId, ["completed", "success"], {
      withCompletedAt: true,
      resetOtpAttempts: true,
    });

    const appliedPostStatus = await updatePostStatus(client, transaction.post_id, "sold", "active");

    const rewardReferenceId = String(transaction.transaction_id || transactionId);
    const rewardPoints = calculateSaleRewardPoints(transaction.agreed_price);
    let sellerRewardChange = null;
    let buyerRewardChange = null;
    const chainRewardChanges = [];

    if (rewardPoints.sellerPoints > 0) {
      sellerRewardChange = await applyRewardDeltaInTransaction({
        client,
        userId: transaction.seller_id,
        pointsDelta: rewardPoints.sellerPoints,
        action: "sale_completed",
        description: `Sale completion reward for transaction ${rewardReferenceId}`,
        idempotencyKey: `sale:${rewardReferenceId}:seller`,
      });
    }

    if (rewardPoints.buyerPoints > 0) {
      buyerRewardChange = await applyRewardDeltaInTransaction({
        client,
        userId: transaction.buyer_id,
        pointsDelta: rewardPoints.buyerPoints,
        action: "purchase_completed",
        description: `Purchase verification reward for transaction ${rewardReferenceId}`,
        idempotencyKey: `sale:${rewardReferenceId}:buyer`,
      });
    }

    const [
      sellerHasPrior,
      buyerHasPrior,
      sellerHadAny,
      buyerHadAny,
      sellerReferrerId,
      buyerReferrerId,
    ] = await Promise.all([
      hasPriorCompletedTransactions(client, "seller_id", transaction.seller_id, rewardReferenceId),
      hasPriorCompletedTransactions(client, "buyer_id", transaction.buyer_id, rewardReferenceId),
      hasAnyCompletedTransactions(client, transaction.seller_id, rewardReferenceId),
      hasAnyCompletedTransactions(client, transaction.buyer_id, rewardReferenceId),
      getReferrerId(client, transaction.seller_id),
      getReferrerId(client, transaction.buyer_id),
    ]);

    const bonusRewardChanges = [];
    if (!sellerHasPrior && FIRST_SALE_BONUS_POINTS > 0) {
      const bonus = await applyRewardDeltaInTransaction({
        client,
        userId: transaction.seller_id,
        pointsDelta: FIRST_SALE_BONUS_POINTS,
        action: "first_sale_bonus",
        description: "Bonus for completing your first sale",
        idempotencyKey: `sale:first:${transaction.seller_id}`,
      });
      if (bonus?.applied) {
        bonusRewardChanges.push(bonus);
      }
    }

    if (!buyerHasPrior && FIRST_PURCHASE_BONUS_POINTS > 0) {
      const bonus = await applyRewardDeltaInTransaction({
        client,
        userId: transaction.buyer_id,
        pointsDelta: FIRST_PURCHASE_BONUS_POINTS,
        action: "first_purchase_bonus",
        description: "Bonus for completing your first purchase",
        idempotencyKey: `purchase:first:${transaction.buyer_id}`,
      });
      if (bonus?.applied) {
        bonusRewardChanges.push(bonus);
      }
    }

    const directReferralChanges = [];
    if (!sellerHadAny && sellerReferrerId && DIRECT_REFERRAL_BONUS_POINTS > 0) {
      const referralChange = await applyRewardDeltaInTransaction({
        client,
        userId: sellerReferrerId,
        pointsDelta: DIRECT_REFERRAL_BONUS_POINTS,
        action: "qualified_referral_bonus",
        description: `Qualified referral bonus for ${transaction.seller_id}`,
        idempotencyKey: `referral:qualified:${transaction.seller_id}`,
      });
      if (referralChange?.applied) {
        directReferralChanges.push(referralChange);
      }
    }

    if (!buyerHadAny && buyerReferrerId && DIRECT_REFERRAL_BONUS_POINTS > 0) {
      const referralChange = await applyRewardDeltaInTransaction({
        client,
        userId: buyerReferrerId,
        pointsDelta: DIRECT_REFERRAL_BONUS_POINTS,
        action: "qualified_referral_bonus",
        description: `Qualified referral bonus for ${transaction.buyer_id}`,
        idempotencyKey: `referral:qualified:${transaction.buyer_id}`,
      });
      if (referralChange?.applied) {
        directReferralChanges.push(referralChange);
      }
    }

    const sellerChainChanges = await applyReferralChainRewards({
      client,
      subjectUserId: transaction.seller_id,
      referenceId: rewardReferenceId,
      eventKey: "sale_completed",
      maxDepth: CHAIN_MAX_DEPTH,
    });
    chainRewardChanges.push(...sellerChainChanges);

    const buyerChainChanges = await applyReferralChainRewards({
      client,
      subjectUserId: transaction.buyer_id,
      referenceId: rewardReferenceId,
      eventKey: "purchase_completed",
      maxDepth: CHAIN_MAX_DEPTH,
    });
    chainRewardChanges.push(...buyerChainChanges);

    await client.query("COMMIT");

    cacheService.del(otpHashCacheKey(transactionId));
    cacheService.del(otpAttemptsCacheKey(transactionId));

    invalidateSaleCache(transaction.seller_id);
    invalidateSaleCache(transaction.buyer_id);

    if (sellerRewardChange?.applied) {
      afterCommitRewardMutation(sellerRewardChange);
    }
    if (buyerRewardChange?.applied) {
      afterCommitRewardMutation(buyerRewardChange);
    }
    bonusRewardChanges.forEach((change) => {
      if (change?.applied) {
        afterCommitRewardMutation(change);
      }
    });
    directReferralChanges.forEach((change) => {
      if (change?.applied) {
        afterCommitRewardMutation(change);
      }
    });
    chainRewardChanges.forEach((change) => {
      if (change?.applied) {
        afterCommitRewardMutation(change);
      }
    });

    setImmediate(async () => {
      try {
        const { applyReferralJoinCoinRewards } = require("../services/referralJoinRewards");
        await applyReferralJoinCoinRewards({
          subjectUserId: transaction.seller_id,
          requireVerified: true,
          requireActivity: true,
          context: {
            trigger: "sale_completed",
            transactionId,
          },
        });
        await applyReferralJoinCoinRewards({
          subjectUserId: transaction.buyer_id,
          requireVerified: true,
          requireActivity: true,
          context: {
            trigger: "purchase_completed",
            transactionId,
          },
        });
      } catch (err) {
        logger.warn("[Sale] Deferred referral join rewards failed", { message: err.message });
      }
    });

    try {
      const notificationResult = await runQuery(
        `
          INSERT INTO notifications (user_id, title, message, type, reference_id, post_id, sender_id, action_path, metadata, created_at)
          VALUES ($1, 'Sale Completed!', 'Your item has been sold successfully.', 'sale_completed', $2, $3, $4, $5, $6, NOW())
          RETURNING notification_id, created_at
        `,
        [
          transaction.seller_id,
          transactionId,
          transaction.post_id,
          transaction.buyer_id,
          "/my-home?tab=sold",
          JSON.stringify({ action_label: "View Sold Items" }),
        ],
      );

      emitNotification(String(transaction.seller_id), {
        notification_id: notificationResult.rows[0]?.notification_id,
        title: "Sale Completed!",
        message: "Your item has been sold successfully.",
        type: "sale_completed",
        sender_id: transaction.buyer_id,
        post_id: transaction.post_id,
        action: { path: "/my-home?tab=sold", label: "View Sold Items" },
        created_at: notificationResult.rows[0]?.created_at || new Date().toISOString(),
      });
    } catch (notifyError) {
      logger.warn("[Sale] Post-completion notification failed:", notifyError.message);
    }

    const sumRewardPoints = (changes = []) =>
      changes.reduce((sum, change) => {
        const delta =
          Number(change?.pointsDelta ?? change?.points_delta ?? change?.delta ?? 0);
        return sum + (Number.isFinite(delta) ? delta : 0);
      }, 0);

    let detail = null;
    try {
      const detailResult = await runQuery(
        `
          SELECT
            t.transaction_id,
            t.status,
            t.created_at,
            ${schema.completedAt ? "t.completed_at" : "NULL::timestamp AS completed_at"},
            t.${schema.priceColumn} AS agreed_price,
            p.post_id,
            p.title,
            p.price AS listing_price,
            p.images,
            p.location,
            p.category_id,
            p.subcategory_id,
            c.name AS category_name,
            sc.name AS subcategory_name,
            p.user_id AS seller_id,
            seller.username AS seller_username,
            COALESCE(seller_profile.full_name, seller.username) AS seller_name,
            seller_profile.avatar_url AS seller_avatar,
            buyer.user_id AS buyer_id,
            buyer.username AS buyer_username,
            COALESCE(buyer_profile.full_name, buyer.username) AS buyer_name,
            buyer_profile.avatar_url AS buyer_avatar
          FROM transactions t
          JOIN posts p ON p.post_id::text = t.post_id::text
          LEFT JOIN categories c ON p.category_id = c.category_id
          LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
          LEFT JOIN users seller ON p.user_id::text = seller.user_id::text
          LEFT JOIN profiles seller_profile ON p.user_id::text = seller_profile.user_id::text
          LEFT JOIN users buyer ON t.buyer_id::text = buyer.user_id::text
          LEFT JOIN profiles buyer_profile ON t.buyer_id::text = buyer_profile.user_id::text
          WHERE t.transaction_id::text = $1
          LIMIT 1
        `,
        [String(transaction.transaction_id || transactionId)],
      );
      if (detailResult.rows.length) {
        detail = detailResult.rows[0];
      }
    } catch (detailError) {
      logger.warn("[Sale] Failed to fetch confirmation details", { message: detailError.message });
      detail = null;
    }

    const completedAt = detail?.completed_at
      ? new Date(detail.completed_at).toISOString()
      : new Date().toISOString();
    const receiptId = String(transaction.transaction_id || transactionId);
    const itemImages = detail?.images ? normalizeImagesPayload(detail.images) : [];

    return res.json({
      message: "Sale confirmed successfully!",
      transaction: {
        transactionId: transaction.transaction_id,
        status: "completed",
        completedAt,
        agreedPrice: detail?.agreed_price ?? transaction.agreed_price ?? null,
      },
      postStatus: appliedPostStatus || "sold",
      item: detail
        ? {
            post_id: detail.post_id,
            title: detail.title,
            price: detail.listing_price,
            agreed_price: detail.agreed_price,
            location: detail.location,
            category_id: detail.category_id,
            subcategory_id: detail.subcategory_id,
            category_name: detail.category_name,
            subcategory_name: detail.subcategory_name,
            images: itemImages,
            image_url: itemImages[0] || null,
          }
        : null,
      buyer: detail
        ? {
            id: detail.buyer_id,
            name: detail.buyer_name,
            username: detail.buyer_username,
            avatar_url: detail.buyer_avatar || null,
          }
        : null,
      seller: detail
        ? {
            id: detail.seller_id,
            name: detail.seller_name,
            username: detail.seller_username,
            avatar_url: detail.seller_avatar || null,
          }
        : null,
      rewards: {
        sellerPoints: rewardPoints.sellerPoints,
        buyerPoints: rewardPoints.buyerPoints,
        bonusPoints: sumRewardPoints(bonusRewardChanges),
        referralPoints: sumRewardPoints(directReferralChanges),
        chainPoints: sumRewardPoints(chainRewardChanges),
      },
      receipt: {
        receiptId,
        transactionId: receiptId,
        amount: detail?.agreed_price ?? transaction.agreed_price ?? null,
        currency: "INR",
        completedAt,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("[Sale] Confirm error:", error);
    if (isLegacyTransactionSchemaError(error)) {
      return res.status(500).json({
        error: "Transactions schema mismatch. Apply sale transaction migrations and retry.",
      });
    }
    return res.status(500).json({ error: "Failed to confirm sale" });
  } finally {
    client.release();
  }
};

const cancelSale = async (req, res) => {
  const userId = getAuthUserId(req);
  const { transactionId, reason } = req.body || {};

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!transactionId) {
    return res.status(400).json({ error: "Transaction ID is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const schema = await getTransactionSchema(client);
    if (!supportsSaleTransactions(schema)) {
      await client.query("ROLLBACK");
      return res.status(500).json({
        error:
          "Transactions table is missing sale columns (transaction_id/post_id/seller_id/buyer_id/status/price).",
      });
    }

    const txResult = await client.query(
      `
        SELECT
          transaction_id,
          post_id,
          seller_id,
          buyer_id,
          status
        FROM transactions
        WHERE transaction_id = $1
        FOR UPDATE
      `,
      [transactionId],
    );

    if (txResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Transaction not found" });
    }

    const transaction = txResult.rows[0];

    if (!idsEqual(transaction.seller_id, userId) && !idsEqual(transaction.buyer_id, userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "You are not part of this transaction" });
    }

    if (!isPendingStatus(transaction.status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cannot cancel - transaction is not pending" });
    }

    await setTransactionStatus(client, schema, transactionId, ["cancelled", "failed"], {
      cancelledBy: userId,
      cancelReason: reason || "No reason provided",
    });

    await updatePostStatus(client, transaction.post_id, "active");

    const otherPartyId = idsEqual(transaction.seller_id, userId)
      ? transaction.buyer_id
      : transaction.seller_id;

    try {
      await client.query(
        `
          INSERT INTO notifications (user_id, title, message, type, created_at)
          VALUES ($1, 'Sale Cancelled', 'The pending sale has been cancelled.', 'sale_cancelled', NOW())
        `,
        [otherPartyId],
      );
    } catch (notifyErr) {
      logger.warn("[Sale] Cancel notification failed (non-blocking):", notifyErr.message);
    }

    await client.query("COMMIT");

    cacheService.del(otpHashCacheKey(transactionId));
    cacheService.del(otpAttemptsCacheKey(transactionId));

    invalidateSaleCache(transaction.seller_id);
    invalidateSaleCache(transaction.buyer_id);

    return res.json({ message: "Sale cancelled successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("[Sale] Cancel error:", error);
    if (isLegacyTransactionSchemaError(error)) {
      return res.status(500).json({
        error: "Transactions schema mismatch. Apply sale transaction migrations and retry.",
      });
    }
    return res.status(500).json({ error: "Failed to cancel sale" });
  } finally {
    client.release();
  }
};

const getPendingSales = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, DEFAULT_PENDING_SALES_LIMIT, MAX_PENDING_SALES_LIMIT);
    const offset = (page - 1) * limit;

    const cacheKey = `sale:${userId}:pending:${page}:${limit}`;
    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const schema = await getTransactionSchema(pool);
        if (!supportsSaleTransactions(schema)) {
          return {
            pendingSales: [],
            total: 0,
            page,
            limit,
            warning: "Transactions schema does not support sale workflow.",
          };
        }

        const priceExpr = `t.${schema.priceColumn} AS agreed_price`;
        const expiresExpr = schema.expiresAt
          ? "t.expires_at"
          : "NULL::timestamp AS expires_at";
        const cancelledByExpr = schema.cancelledBy
          ? "t.cancelled_by"
          : "NULL::text AS cancelled_by";
        const cancelReasonExpr = schema.cancelReason
          ? "t.cancel_reason"
          : "NULL::text AS cancel_reason";

        const result = await runQuery(
          `
            SELECT
              COUNT(*) OVER()::int AS total_count,
              t.transaction_id,
              t.post_id,
              t.seller_id,
              t.buyer_id,
              ${priceExpr},
              t.status,
              ${expiresExpr},
              t.created_at,
              ${schema.completedAt ? "t.completed_at" : "NULL::timestamp AS completed_at"},
              ${cancelledByExpr},
              ${cancelReasonExpr},
              p.title AS post_title,
              p.images AS post_images,
              seller.username AS seller_name,
              buyer.username AS buyer_name
            FROM transactions t
            JOIN posts p ON p.post_id = t.post_id
            JOIN users seller ON seller.user_id::text = t.seller_id::text
            JOIN users buyer ON buyer.user_id::text = t.buyer_id::text
            WHERE (t.seller_id::text = $1 OR t.buyer_id::text = $1)
              AND t.status = ANY($4::text[])
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3
          `,
          [String(userId), limit, offset, PENDING_SALE_STATUSES],
        );

        const total = result.rows.length ? Number(result.rows[0].total_count) || 0 : 0;
        const pendingSales = result.rows.map(({ total_count, ...sale }) => sale);
        return { pendingSales, total, page, limit };
      },
      PENDING_SALES_CACHE_TTL_SECONDS,
    );

    return res.json(payload);
  } catch (error) {
    logger.error("[Sale] Get pending error:", error);
    if (isLegacyTransactionSchemaError(error)) {
      return res.status(500).json({
        error: "Transactions schema mismatch. Apply sale transaction migrations and retry.",
      });
    }
    return res.status(500).json({ error: "Failed to fetch pending sales" });
  }
};

module.exports = {
  initiateSale,
  confirmSale,
  cancelSale,
  getPendingSales,
};
