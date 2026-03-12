const SAVED_POSTS_STORAGE_KEY = "mhub_saved_post_ids";
const SAVED_POSTS_UPDATED_EVENT = "mhub:saved-posts-updated";

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function normalizeSavedPostId(postId) {
  if (postId === null || postId === undefined) {
    return "";
  }
  const normalized = String(postId).trim();
  return normalized.length ? normalized : "";
}

export function readSavedPostIds() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(SAVED_POSTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed
          .map((value) => normalizeSavedPostId(value))
          .filter(Boolean),
      ),
    );
  } catch {
    return [];
  }
}

export function buildSavedPostsMap(ids) {
  const source = Array.isArray(ids) ? ids : [];
  return source.reduce((acc, value) => {
    const id = normalizeSavedPostId(value);
    if (id) {
      acc[id] = true;
    }
    return acc;
  }, {});
}

export function getSavedPostsMap() {
  return buildSavedPostsMap(readSavedPostIds());
}

function emitSavedPostsUpdated(ids) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SAVED_POSTS_UPDATED_EVENT, {
      detail: { ids: Array.isArray(ids) ? ids : [] },
    }),
  );
}

export function replaceSavedPostIds(ids) {
  const normalizedIds = Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((value) => normalizeSavedPostId(value))
        .filter(Boolean),
    ),
  );

  if (canUseStorage()) {
    try {
      localStorage.setItem(SAVED_POSTS_STORAGE_KEY, JSON.stringify(normalizedIds));
    } catch {
      // Ignore storage quota/write failures.
    }
  }

  emitSavedPostsUpdated(normalizedIds);
  return buildSavedPostsMap(normalizedIds);
}

export function setSavedPostStatus(postId, isSaved) {
  const normalizedId = normalizeSavedPostId(postId);
  if (!normalizedId) {
    return getSavedPostsMap();
  }

  const ids = readSavedPostIds();
  const idSet = new Set(ids);
  if (isSaved) {
    idSet.add(normalizedId);
  } else {
    idSet.delete(normalizedId);
  }

  return replaceSavedPostIds(Array.from(idSet));
}

export function isSavedPostId(postId) {
  const normalizedId = normalizeSavedPostId(postId);
  if (!normalizedId) {
    return false;
  }
  return readSavedPostIds().includes(normalizedId);
}

function toListCandidate(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = payload?.data ?? payload;
  if (Array.isArray(root)) {
    return root;
  }
  if (Array.isArray(root?.items)) {
    return root.items;
  }
  if (Array.isArray(root?.wishlist)) {
    return root.wishlist;
  }
  if (Array.isArray(root?.rows)) {
    return root.rows;
  }
  if (Array.isArray(root?.posts)) {
    return root.posts;
  }

  return [];
}

export function extractSavedPostIds(payload) {
  const candidates = toListCandidate(payload);
  const ids = candidates
    .map((item) =>
      normalizeSavedPostId(
        item?.post_id ??
          item?.postId ??
          item?.post?.post_id ??
          item?.post?.postId ??
          item?.post?.id ??
          item?.id,
      ),
    )
    .filter(Boolean);

  return Array.from(new Set(ids));
}

export function subscribeSavedPosts(listener) {
  if (typeof window === "undefined" || typeof listener !== "function") {
    return () => {};
  }

  const notify = (ids) => {
    listener(buildSavedPostsMap(Array.isArray(ids) ? ids : readSavedPostIds()));
  };

  const onUpdated = (event) => {
    notify(event?.detail?.ids);
  };

  const onStorage = (event) => {
    if (event.key === SAVED_POSTS_STORAGE_KEY) {
      notify();
    }
  };

  window.addEventListener(SAVED_POSTS_UPDATED_EVENT, onUpdated);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(SAVED_POSTS_UPDATED_EVENT, onUpdated);
    window.removeEventListener("storage", onStorage);
  };
}

