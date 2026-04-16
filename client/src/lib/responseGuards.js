const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const ensureObject = (value, fallback = {}) =>
  isPlainObject(value) ? value : fallback;

const ensureArray = (value, fallback = []) =>
  Array.isArray(value) ? value : fallback;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

export function normalizeUserFields(value) {
  const user = ensureObject(value, {});
  const name = normalizeText(user.name);
  const fullName =
    normalizeText(user.full_name) || normalizeText(user.fullName);
  const fallback = name || fullName;

  if (name) {
    user.name = name;
  }
  if (fullName) {
    user.full_name = fullName;
  }
  if (fallback) {
    if (!name) user.name = fallback;
    if (!fullName) user.full_name = fallback;
  }

  return user;
}

export function guardProfilePayload(payload) {
  return normalizeUserFields(payload);
}

export function guardRewardsPayload(payload) {
  const root = ensureObject(payload, {});
  return {
    ...root,
    user: normalizeUserFields(root.user),
    referralChain: ensureArray(root.referralChain),
    leaderboard: ensureObject(root.leaderboard, {}),
    referralLedger: ensureObject(root.referralLedger, {}),
    rewardLog: ensureArray(root.rewardLog || root.reward_log),
  };
}

export function guardPublicWallPayload(payload) {
  const root = ensureObject(payload, {});
  return {
    ...root,
    topSellers: ensureArray(root.topSellers),
    topBuyers: ensureArray(root.topBuyers),
    topUsers: ensureArray(root.topUsers),
  };
}

export function guardAuthPayload(payload) {
  const root = ensureObject(payload, {});
  if (root.user) {
    root.user = normalizeUserFields(root.user);
  }
  return root;
}

export function applyResponseGuard(url, payload) {
  const path = String(url || "").split("?")[0];
  if (!path) return payload;

  if (path.endsWith("/profile")) {
    return guardProfilePayload(payload);
  }

  if (path.includes("/rewards")) {
    if (path.includes("/rewards/stream")) {
      return payload;
    }
    return guardRewardsPayload(payload);
  }

  if (path.endsWith("/public-wall")) {
    return guardPublicWallPayload(payload);
  }

  if (path.includes("/auth/")) {
    return guardAuthPayload(payload);
  }

  return payload;
}
