const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const {
  parseOptionalString,
  parsePositiveInt,
  parsePositiveNumber,
  parseBoolean,
  parseSafeInterval,
} = require("../utils/parseHelpers");
const logger = require("../utils/logger");

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;
const MAX_QTY = Number.parseInt(process.env.CART_MAX_QTY || "10", 10);
const BASE_SHIPPING = Number.parseFloat(process.env.CART_BASE_SHIPPING || "49");
const FREE_SHIPPING_THRESHOLD = Number.parseFloat(
  process.env.CART_FREE_SHIPPING_THRESHOLD || "5000",
);
const TAX_RATE = Number.parseFloat(process.env.CART_TAX_RATE || "0");
const DEFAULT_CURRENCY = String(process.env.CART_CURRENCY || "INR");
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function withDevErrorDetails(payload, error) {
  if (IS_PRODUCTION) return payload;
  const detail = error?.message || String(error);
  const code = error?.code;
  return code ? { ...payload, detail, code } : { ...payload, detail };
}

function normalizeUploadsPath(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) return null;

  const withForwardSlashes = normalized.replace(/\\/g, "/");
  if (withForwardSlashes.startsWith("/uploads/")) return withForwardSlashes;
  if (withForwardSlashes.startsWith("uploads/")) return `/${withForwardSlashes}`;

  const withoutFilePrefix = withForwardSlashes.replace(/^file:\/+/i, "/");
  const uploadsMatch = withoutFilePrefix.match(/(?:^|\/)uploads\/(.+)$/i);
  if (uploadsMatch?.[1]) {
    return `/uploads/${uploadsMatch[1].replace(/^\/+/, "")}`;
  }

  if (!withForwardSlashes.includes("/") && /^[^/]+\.[a-z0-9]{2,8}$/i.test(withForwardSlashes)) {
    return `/uploads/${withForwardSlashes}`;
  }

  if (withForwardSlashes.startsWith("http://") || withForwardSlashes.startsWith("https://")) {
    return withForwardSlashes;
  }

  return null;
}

function normalizeImagesPayload(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeUploadsPath(entry) || parseOptionalString(entry))
      .filter(Boolean);
  }

  const normalized = parseOptionalString(value);
  if (!normalized) return [];

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeUploadsPath(entry) || parseOptionalString(entry))
        .filter(Boolean);
    }
  } catch {
    // Keep original string fallback below.
  }

  const fallback = normalizeUploadsPath(normalized) || normalized;
  return fallback ? [fallback] : [];
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPriceInsights(item) {
  const priceAtAdd = toNumber(item.price_at_add, 0);
  const currentPrice = toNumber(item.current_price, 0);
  const priceDelta = currentPrice - priceAtAdd;
  const priceChangePct = priceAtAdd > 0 ? (priceDelta / priceAtAdd) * 100 : null;
  return {
    price_at_add: priceAtAdd || null,
    current_price: currentPrice || null,
    price_changed: priceAtAdd > 0 && currentPrice > 0 && priceDelta !== 0,
    price_delta: priceAtAdd > 0 && currentPrice > 0 ? priceDelta : null,
    price_change_pct:
      priceAtAdd > 0 && currentPrice > 0
        ? Number.parseFloat(priceChangePct.toFixed(2))
        : null,
  };
}

function buildAvailability(item) {
  if (!item.post_id || !item.post_status) {
    return "missing";
  }
  if (String(item.post_status).toLowerCase() !== "active") {
    return "inactive";
  }
  return "available";
}

async function resolvePromotion(code, subtotal) {
  const normalized = parseOptionalString(code);
  if (!normalized) return null;

  try {
    const result = await runQuery(
      `
        SELECT
          promo_id,
          code,
          description,
          discount_type,
          discount_value,
          min_subtotal,
          max_uses,
          used_count,
          starts_at,
          ends_at,
          is_active
        FROM cart_promotions
        WHERE UPPER(code) = UPPER($1)
        LIMIT 1
      `,
      [normalized],
    );

    if (!result.rows.length) {
      return { valid: false, reason: "invalid" };
    }

    const promo = result.rows[0];
    if (!promo.is_active) {
      return { valid: false, reason: "inactive", promo };
    }

    const now = new Date();
    if (promo.starts_at && now < new Date(promo.starts_at)) {
      return { valid: false, reason: "not_started", promo };
    }
    if (promo.ends_at && now > new Date(promo.ends_at)) {
      return { valid: false, reason: "expired", promo };
    }

    if (promo.max_uses !== null && promo.max_uses !== undefined) {
      if (Number(promo.used_count || 0) >= Number(promo.max_uses)) {
        return { valid: false, reason: "max_uses", promo };
      }
    }

    const minSubtotal = toNumber(promo.min_subtotal, 0);
    if (subtotal < minSubtotal) {
      return { valid: false, reason: "min_subtotal", promo };
    }

    let discount = 0;
    if (promo.discount_type === "percent") {
      discount = subtotal * (toNumber(promo.discount_value, 0) / 100);
    } else {
      discount = toNumber(promo.discount_value, 0);
    }

    discount = Math.max(0, Math.min(discount, subtotal));

    return {
      valid: true,
      promo,
      discount: Number.parseFloat(discount.toFixed(2)),
    };
  } catch (error) {
    logger.warn("[Cart] Failed to resolve promotion", { message: error.message });
    return { valid: false, reason: "error" };
  }
}

function computeSummary(items, promotion) {
  const activeItems = items.filter((item) => item.status === "active");
  const subtotal = activeItems.reduce((sum, item) => {
    if (item.availability_status !== "available") return sum;
    return sum + toNumber(item.current_price, 0) * toNumber(item.quantity, 1);
  }, 0);

  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : BASE_SHIPPING;
  const tax = subtotal * TAX_RATE;
  const discount = promotion?.valid ? toNumber(promotion.discount, 0) : 0;
  const total = Math.max(0, subtotal + shipping + tax - discount);

  return {
    currency: DEFAULT_CURRENCY,
    subtotal: Number.parseFloat(subtotal.toFixed(2)),
    shipping: Number.parseFloat(shipping.toFixed(2)),
    tax: Number.parseFloat(tax.toFixed(2)),
    discount: Number.parseFloat(discount.toFixed(2)),
    total: Number.parseFloat(total.toFixed(2)),
    itemCount: activeItems.reduce((sum, item) => sum + toNumber(item.quantity, 1), 0),
    unavailableCount: activeItems.filter(
      (item) => item.availability_status !== "available",
    ).length,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  };
}

async function fetchCartItems(userId, { includeSaved = false } = {}) {
  const statusFilter = includeSaved ? null : "active";
  const params = [String(userId)];
  let where = "ci.user_id::text = $1";

  if (statusFilter) {
    params.push(statusFilter);
    where += ` AND ci.status = $${params.length}`;
  }

  const result = await runQuery(
    `
      SELECT
        ci.cart_item_id,
        ci.user_id,
        ci.post_id,
        ci.quantity,
        ci.price_at_add,
        ci.currency,
        ci.status,
        ci.metadata,
        ci.created_at,
        ci.updated_at,
        p.title AS post_title,
        p.price AS current_price,
        COALESCE(to_jsonb(p)->>'status','') AS post_status,
        p.images,
        p.location,
        p.category_id,
        p.subcategory_id,
        p.user_id AS seller_id,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COALESCE(pr.full_name, u.username) AS seller_name,
        pr.avatar_url AS seller_avatar,
        pr.verified AS seller_verified,
        COALESCE(u.rating, 0) AS seller_rating,
        COALESCE(u.rating_count, 0) AS seller_rating_count
      FROM cart_items ci
      LEFT JOIN posts p ON ci.post_id = p.post_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
      WHERE ${where}
      ORDER BY ci.created_at DESC
    `,
    params,
  );

  return (result.rows || []).map((row) => {
    const images = normalizeImagesPayload(row.images);
    const availability_status = buildAvailability(row);
    return {
      ...row,
      images,
      image_url:
        normalizeUploadsPath(row.thumbnail_url) ||
        normalizeUploadsPath(row.image_url) ||
        images[0] ||
        "/placeholder.svg",
      availability_status,
      ...buildPriceInsights(row),
      max_quantity: MAX_QTY,
    };
  });
}

exports.getCart = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const includeSaved = parseBoolean(req.query.includeSaved, true);
  const coupon = parseOptionalString(req.query.coupon);

  try {
    const items = await fetchCartItems(userId, { includeSaved });
    const promotion = coupon ? await resolvePromotion(coupon, 0) : null;
    const summary = computeSummary(items, promotion);
    const resolvedPromotion = coupon
      ? await resolvePromotion(coupon, summary.subtotal)
      : null;
    const finalSummary = computeSummary(items, resolvedPromotion);

    const response = {
      items: items.filter((item) => item.status === "active"),
      savedItems: includeSaved
        ? items.filter((item) => item.status === "saved")
        : [],
      summary: finalSummary,
      promotion: resolvedPromotion,
      maxQuantity: MAX_QTY,
    };

    return res.json(response);
  } catch (error) {
    logger.error("[Cart] Fetch error:", error);
    return res
      .status(500)
      .json(withDevErrorDetails({ error: "Failed to load cart" }, error));
  }
};

exports.addCartItem = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const postId = parseOptionalString(req.body?.postId || req.body?.post_id);
  const quantity = parsePositiveInt(req.body?.quantity, 1, MAX_QTY);
  const currency = parseOptionalString(req.body?.currency) || DEFAULT_CURRENCY;
  const status = parseOptionalString(req.body?.status) || "active";

  if (!postId) {
    return res.status(400).json({ error: "postId required" });
  }

  try {
    const postResult = await runQuery(
      `SELECT post_id, title, price, status FROM posts WHERE post_id::text = $1`,
      [String(postId)],
    );

    if (!postResult.rows.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postResult.rows[0];
    if (String(post.status || "").toLowerCase() !== "active") {
      return res.status(400).json({ error: "Post is not available" });
    }

    const priceAtAdd = toNumber(post.price, 0);

    const result = await runQuery(
      `
        INSERT INTO cart_items (user_id, post_id, quantity, price_at_add, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, post_id, status)
        DO UPDATE SET
          quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, $7),
          price_at_add = COALESCE(cart_items.price_at_add, EXCLUDED.price_at_add),
          updated_at = NOW()
        RETURNING cart_item_id, user_id, post_id, quantity, price_at_add, currency, status, updated_at
      `,
      [
        String(userId),
        String(postId),
        quantity,
        priceAtAdd || null,
        currency,
        status,
        MAX_QTY,
      ],
    );

    return res.status(201).json({ success: true, item: result.rows[0] });
  } catch (error) {
    logger.error("[Cart] Add error:", error);
    return res
      .status(500)
      .json(withDevErrorDetails({ error: "Failed to add to cart" }, error));
  }
};

exports.updateCartItem = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const cartItemId = parseOptionalString(req.params.cartItemId);
  const postId = parseOptionalString(req.body?.postId || req.body?.post_id);
  const quantity = req.body?.quantity !== undefined
    ? parsePositiveInt(req.body?.quantity, 0, MAX_QTY)
    : null;
  const status = parseOptionalString(req.body?.status);

  try {
    let itemResult;
    if (cartItemId) {
      itemResult = await runQuery(
        `SELECT cart_item_id, post_id, status, quantity
         FROM cart_items
         WHERE cart_item_id::text = $1 AND user_id::text = $2`,
        [cartItemId, String(userId)],
      );
    } else if (postId) {
      itemResult = await runQuery(
        `SELECT cart_item_id, post_id, status, quantity
         FROM cart_items
         WHERE post_id::text = $1 AND user_id::text = $2 AND status = 'active'
         LIMIT 1`,
        [postId, String(userId)],
      );
    }

    if (!itemResult || !itemResult.rows.length) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    const item = itemResult.rows[0];

    if (quantity !== null && quantity <= 0) {
      await runQuery(
        `DELETE FROM cart_items WHERE cart_item_id::text = $1 AND user_id::text = $2`,
        [String(item.cart_item_id), String(userId)],
      );
      return res.json({ success: true, removed: true });
    }

    if (status && status !== item.status) {
      const existingTarget = await runQuery(
        `SELECT cart_item_id, quantity
         FROM cart_items
         WHERE user_id::text = $1 AND post_id::text = $2 AND status = $3
         LIMIT 1`,
        [String(userId), String(item.post_id), status],
      );

      if (existingTarget.rows.length) {
        const combinedQty = Math.min(
          MAX_QTY,
          Number(existingTarget.rows[0].quantity || 0) + Number(item.quantity || 0),
        );

        await runQuery(
          `UPDATE cart_items
           SET quantity = $1, updated_at = NOW()
           WHERE cart_item_id::text = $2`,
          [combinedQty, existingTarget.rows[0].cart_item_id],
        );

        await runQuery(
          `DELETE FROM cart_items WHERE cart_item_id::text = $1`,
          [String(item.cart_item_id)],
        );

        return res.json({ success: true, merged: true, quantity: combinedQty });
      }

      await runQuery(
        `UPDATE cart_items
         SET status = $1, updated_at = NOW()
         WHERE cart_item_id::text = $2 AND user_id::text = $3`,
        [status, String(item.cart_item_id), String(userId)],
      );

      return res.json({ success: true, status });
    }

    if (quantity !== null) {
      const updateResult = await runQuery(
        `UPDATE cart_items
         SET quantity = $1, updated_at = NOW()
         WHERE cart_item_id::text = $2 AND user_id::text = $3
         RETURNING cart_item_id, quantity`,
        [quantity, String(item.cart_item_id), String(userId)],
      );
      return res.json({ success: true, item: updateResult.rows[0] });
    }

    return res.json({ success: true, item });
  } catch (error) {
    logger.error("[Cart] Update error:", error);
    return res
      .status(500)
      .json(withDevErrorDetails({ error: "Failed to update cart" }, error));
  }
};

exports.removeCartItem = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const cartItemId = parseOptionalString(req.params.cartItemId);
  const postId = parseOptionalString(req.query?.postId || req.body?.postId);

  try {
    if (!cartItemId && !postId) {
      return res.status(400).json({ error: "cartItemId or postId required" });
    }

    if (cartItemId) {
      await runQuery(
        `DELETE FROM cart_items WHERE cart_item_id::text = $1 AND user_id::text = $2`,
        [cartItemId, String(userId)],
      );
    } else if (postId) {
      await runQuery(
        `DELETE FROM cart_items WHERE post_id::text = $1 AND user_id::text = $2`,
        [postId, String(userId)],
      );
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error("[Cart] Remove error:", error);
    return res
      .status(500)
      .json(withDevErrorDetails({ error: "Failed to remove cart item" }, error));
  }
};

exports.clearCart = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const scope = parseOptionalString(req.body?.scope || req.query?.scope) || "active";

  try {
    if (scope === "all") {
      await runQuery("DELETE FROM cart_items WHERE user_id::text = $1", [
        String(userId),
      ]);
    } else {
      await runQuery(
        "DELETE FROM cart_items WHERE user_id::text = $1 AND status = $2",
        [String(userId), scope],
      );
    }
    return res.json({ success: true });
  } catch (error) {
    logger.error("[Cart] Clear error:", error);
    return res
      .status(500)
      .json(withDevErrorDetails({ error: "Failed to clear cart" }, error));
  }
};

exports.getCartSummary = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const includeSaved = parseBoolean(req.body?.includeSaved ?? req.query?.includeSaved, false);
  const coupon = parseOptionalString(req.body?.coupon || req.query?.coupon);

  try {
    const items = await fetchCartItems(userId, { includeSaved });
    const resolvedPromotion = coupon
      ? await resolvePromotion(coupon, computeSummary(items, null).subtotal)
      : null;
    const summary = computeSummary(items, resolvedPromotion);

    return res.json({
      items: items.filter((item) => item.status === "active"),
      savedItems: includeSaved
        ? items.filter((item) => item.status === "saved")
        : [],
      summary,
      promotion: resolvedPromotion,
      validatedAt: new Date().toISOString(),
      maxQuantity: MAX_QTY,
    });
  } catch (error) {
    logger.error("[Cart] Summary error:", error);
    return res
      .status(500)
      .json(
        withDevErrorDetails({ error: "Failed to build cart summary" }, error),
      );
  }
};
