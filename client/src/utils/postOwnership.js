const normalizeId = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const candidate = value.user_id || value.id || value.userId || value.post_id;
    return candidate ? String(candidate).trim() : "";
  }
  return "";
};

const extractOwnerId = (post) => {
  if (!post || typeof post !== "object") return "";
  const direct =
    post.user_id ??
    post.userId ??
    post.owner_id ??
    post.ownerId ??
    post.seller_id ??
    post.sellerId ??
    post.author_id ??
    post.authorId ??
    null;
  if (direct !== null && direct !== undefined) {
    const normalized = normalizeId(direct);
    if (normalized) return normalized;
  }
  const nestedSources = [
    post.user,
    post.seller,
    post.owner,
    post.author,
    post.profile,
  ];
  for (const source of nestedSources) {
    const nestedId = normalizeId(
      source?.user_id ?? source?.id ?? source?.userId ?? source?.author_id,
    );
    if (nestedId) return nestedId;
  }
  return "";
};

export const isPostOwnedByUser = (post, userId) => {
  const ownerId = extractOwnerId(post);
  const normalizedUserId = normalizeId(userId);
  return Boolean(ownerId && normalizedUserId && ownerId === normalizedUserId);
};

export const getPostOwnerId = (post) => extractOwnerId(post);

