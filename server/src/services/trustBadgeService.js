const { runQuery } = require("../utils/dbHelpers");
const { computeTrustScore } = require("./trustScoreService");
const { getUserRiskState } = require("./riskStateService");

const normalizeUserId = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const extractUserIdFromPost = (post = {}) =>
  normalizeUserId(
    post.user_id ||
      post.author_id ||
      post.seller_id ||
      post.owner_id ||
      post.user?.id ||
      post.user?.user_id
  );

const isComplaintRiskState = (riskState) => {
  if (!riskState || riskState.status === "normal") return false;
  const reason = String(riskState.reason || "").toLowerCase();
  const source = String(riskState.details?.source || "").toLowerCase();
  return reason.includes("complaint") || source === "complaint";
};

const toRiskStatePayload = (row) => {
  if (!row) return null;
  return {
    user_id: row.user_id,
    status: String(row.status || "normal").toLowerCase(),
    score: Number(row.score || 0),
    reason: row.reason || "",
    details: row.details || {},
    expires_at: row.expires_at || null,
    updated_at: row.updated_at || null,
  };
};

const fetchRiskStates = async (userIds) => {
  const normalizedIds = [...new Set(userIds.map(normalizeUserId).filter(Boolean))];
  if (!normalizedIds.length) return new Map();
  try {
    const result = await runQuery(
      `
        SELECT user_id, status, score, reason, details, expires_at, updated_at
        FROM user_risk_states
        WHERE user_id::text = ANY($1::text[])
      `,
      [normalizedIds]
    );
    const map = new Map();
    (result.rows || []).forEach((row) => {
      const id = normalizeUserId(row.user_id);
      if (!id) return;
      map.set(id, toRiskStatePayload(row));
    });
    return map;
  } catch {
    return new Map();
  }
};

const buildTrustMaps = async (userIds) => {
  const normalizedIds = [...new Set(userIds.map(normalizeUserId).filter(Boolean))];
  if (!normalizedIds.length) {
    return {
      trustByUserId: new Map(),
      riskByUserId: new Map(),
      underReviewByUserId: new Map(),
    };
  }

  const [riskByUserId, trustResults] = await Promise.all([
    fetchRiskStates(normalizedIds),
    Promise.allSettled(
      normalizedIds.map((userId) =>
        computeTrustScore(userId).catch(() => null)
      )
    ),
  ]);

  const trustByUserId = new Map();
  const underReviewByUserId = new Map();

  trustResults.forEach((entry, index) => {
    if (entry.status !== "fulfilled" || !entry.value) return;
    const userId = normalizedIds[index];
    const riskState = riskByUserId.get(userId) || null;
    const underReview = isComplaintRiskState(riskState);
    trustByUserId.set(userId, {
      ...entry.value,
      risk_state: riskState,
      under_review: underReview,
    });
    underReviewByUserId.set(userId, underReview);
  });

  return { trustByUserId, riskByUserId, underReviewByUserId };
};

const attachTrustToPosts = async (posts = []) => {
  if (!Array.isArray(posts) || posts.length === 0) return posts;
  const userIds = posts.map(extractUserIdFromPost).filter(Boolean);
  const { trustByUserId, riskByUserId, underReviewByUserId } =
    await buildTrustMaps(userIds);

  return posts.map((post) => {
    const userId = extractUserIdFromPost(post);
    if (!userId) return post;
    const trust = trustByUserId.get(userId) || null;
    const riskState = trust?.risk_state || riskByUserId.get(userId) || null;
    const underReview =
      trust?.under_review ??
      underReviewByUserId.get(userId) ??
      isComplaintRiskState(riskState);

    const mergedUser =
      post.user && typeof post.user === "object"
        ? {
            ...post.user,
            id: post.user.id || post.user.user_id || userId,
            name: post.user.name || post.author_name || post.user_name || post.seller_name || post.user.name || null,
            username: post.user.username || post.username || null,
            trust: trust || post.user.trust || null,
            risk_state: riskState || post.user.risk_state || null,
            under_review: underReview ?? post.user.under_review ?? false,
          }
        : {
            id: userId,
            name: post.author_name || post.user_name || post.seller_name || null,
            username: post.username || null,
            trust,
            risk_state: riskState,
            under_review: underReview,
          };

    return {
      ...post,
      user: mergedUser,
      trust: trust || post.trust || null,
      risk_state: riskState || post.risk_state || null,
      under_review: underReview ?? post.under_review ?? false,
    };
  });
};

const getTrustSnapshot = async (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;

  const [trust, riskState] = await Promise.all([
    computeTrustScore(normalizedUserId).catch(() => null),
    getUserRiskState(normalizedUserId).catch(() => null),
  ]);

  if (!trust) return null;
  return {
    ...trust,
    risk_state: riskState,
    under_review: isComplaintRiskState(riskState),
  };
};

module.exports = {
  attachTrustToPosts,
  buildTrustMaps,
  extractUserIdFromPost,
  isComplaintRiskState,
  getTrustSnapshot,
};
