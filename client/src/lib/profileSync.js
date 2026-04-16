function normalizeUserObject(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const normalized = { ...value };
  const rawName = typeof normalized.name === "string" ? normalized.name.trim() : "";
  const rawFullName =
    typeof normalized.full_name === "string"
      ? normalized.full_name.trim()
      : typeof normalized.fullName === "string"
        ? normalized.fullName.trim()
        : "";

  const fallback = rawName || rawFullName;

  if (rawName) {
    normalized.name = rawName;
  }

  if (rawFullName) {
    normalized.full_name = rawFullName;
  }

  if (fallback) {
    if (!rawName) normalized.name = fallback;
    if (!rawFullName) normalized.full_name = fallback;
  }

  return normalized;
}

export function mergeProfileIntoAuthUser(previousUser, profilePayload, resolveUserId) {
  const prior = normalizeUserObject(previousUser);
  const payload = normalizeUserObject(profilePayload);
  const getResolvedUserId = typeof resolveUserId === "function" ? resolveUserId : () => null;

  const merged = {
    ...prior,
    ...payload,
    id:
      getResolvedUserId(prior) ??
      getResolvedUserId(payload) ??
      prior.id ??
      payload.id ??
      payload.user_id ??
      null,
    user_id: payload.user_id ?? prior.user_id ?? prior.id ?? null,
  };

  return normalizeUserObject(merged);
}

export function hasUserSnapshotChanged(previousUser, nextUser) {
  return (
    JSON.stringify(normalizeUserObject(previousUser)) !==
    JSON.stringify(normalizeUserObject(nextUser))
  );
}
