const pool = require("../config/db");
const crypto = require("crypto");
const otpService = require("../services/otpService");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");
const {
  applyRewardDeltaInTransaction,
  afterCommitRewardMutation,
} = require("../services/rewardsLedgerService");

const DEFAULT_PENDING_SALES_LIMIT = 50;
const MAX_PENDING_SALES_LIMIT = 200;
const PENDING_SALES_CACHE_TTL_SECONDS = 15;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const PENDING_SALE_STATUSES = ["pending_buyer_confirm", "initiated", "pending"];

let txSchemaCache = { value: null, expiresAt: 0 };

function runQuery(text, values = []) {
  return pool.query({ text, values, query_timeout: DB_QUERY_TIMEOUT_MS });
}

function getUserId(req) {
  return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

function idsEqual(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a) === String(b);
}

function parsePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
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

function calculateSaleRewardPoints(saleAmount) {
  const normalizedSaleAmount = Math.max(0, Number(saleAmount) || 0);
  return {
    sellerPoints: Math.floor(normalizedSaleAmount / 100),
    buyerPoints: Math.floor(normalizedSaleAmount / 200),
  };
}

const initiateSale = async (req, res) => {
  const sellerId = getUserId(req);
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
        secretOTP,
        otpExpiresIn: `${otpService.OTP_EXPIRY_MINUTES || 10} minutes`,
        expiresAt,
      },
      instructions:
        "Share this OTP with the buyer in person. The buyer must enter transaction id + OTP to complete sale.",
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
  const buyerId = getUserId(req);
  const { transactionId, otp } = req.body || {};

  if (!buyerId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!transactionId || !otp) {
    return res.status(400).json({ error: "Transaction ID and OTP are required" });
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
    );

    if (txResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Transaction not found" });
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

    try {
      await runQuery(
        `
          INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
          VALUES ($1, 'Sale Completed!', 'Your item has been sold successfully.', 'sale_completed', $2, NOW())
        `,
        [transaction.seller_id, transactionId],
      );
    } catch (notifyError) {
      logger.warn("[Sale] Post-completion notification failed:", notifyError.message);
    }

    return res.json({
      message: "Sale confirmed successfully!",
      transaction: {
        transactionId: transaction.transaction_id,
        status: "completed",
        completedAt: new Date().toISOString(),
      },
      postStatus: appliedPostStatus || "sold",
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
  const userId = getUserId(req);
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
  const userId = getUserId(req);
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
