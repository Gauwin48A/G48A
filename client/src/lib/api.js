import api from "../services/api";

export default api;

/**
 * GET request with retry support.
 * @param {string} url - The endpoint URL.
 * @param {object} [config] - Axios config.
 * @returns {Promise} Axios response promise.
 */
export const getWithRetry = (url, config) => api.get(url, config);

/**
 * POST request with retry support.
 * @param {string} url - The endpoint URL.
 * @param {*} data - Request body.
 * @param {object} [config] - Axios config.
 * @returns {Promise} Axios response promise.
 */
export const postWithRetry = (url, data, config) => api.post(url, data, config);

const PF = "";

/**
 * Extract HTTP status from an error object.
 * @param {object} error
 * @returns {number|undefined}
 */
const getErrorStatus = (error) =>
  error?.response?.status ?? error?.status;

/**
 * Extract the backend error message text (lowercased) from an error response.
 * @param {object} error
 * @returns {string}
 */
const getBackendErrorText = (error) =>
  String(
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    ""
  ).trim().toLowerCase();

/**
 * Determine whether a 404 error indicates we should try the legacy route.
 * @param {object} error
 * @returns {boolean}
 */
const shouldFallbackToLegacyRoute = (error) => {
  const status = getErrorStatus(error);
  if (status !== 404) return false;
  const backendErrorText = getBackendErrorText(error);
  if (!backendErrorText) return true;
  return (
    backendErrorText.includes("route not found") ||
    backendErrorText.includes("not found - /api")
  );
};

/**
 * Fetch the global feed.
 * @param {object} params - Query parameters.
 * @returns {Promise}
 */
export const fetchFeed = (params) =>
  api.get(`${PF}/feed`, { params: params });

/**
 * Fetch the current user's feed.
 * @param {object} params - Query parameters.
 * @returns {Promise}
 */
export const fetchMyFeed = (params) =>
  api.get(`${PF}/feed/mine`, { params: params });

/**
 * Create a new channel, falling back to the legacy route on 404.
 * @param {object} data - Channel creation payload.
 * @returns {Promise}
 */
export const createChannel = async (data) => {
  try {
    return await api.post(`${PF}/channels`, data);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    return api.post(`${PF}/channel/create`, data);
  }
};

/**
 * Get a channel by its owner's user ID, with legacy route fallback.
 * @param {string} userId - The owner's user ID.
 * @returns {Promise<object|null>} The channel object or null if not found.
 */
export const getChannelByUser = async (userId) => {
  const id = encodeURIComponent(String(userId || "").trim());
  if (!id) throw new Error("User id is required");

  try {
    const payload = await api.get(`${PF}/channels/owner/${id}`);
    if (!payload) return null;

    if (
      typeof payload === "object" &&
      Object.prototype.hasOwnProperty.call(payload, "channel")
    ) {
      return payload.channel ? payload : null;
    }

    if (payload.channel_id) {
      return payload;
    }

    return null;
  } catch (error) {
    const status = getErrorStatus(error);
    const shouldTryLegacy =
      status === 404 || shouldFallbackToLegacyRoute(error);

    if (!shouldTryLegacy) {
      throw error;
    }

    try {
      const legacyPayload = await api.get(`${PF}/channel/${id}`);
      if (!legacyPayload) return null;
      if (legacyPayload.channel_id) return legacyPayload;
      return null;
    } catch (legacyError) {
      if (getErrorStatus(legacyError) === 404) {
        return null;
      }
      throw legacyError;
    }
  }
};

/**
 * Get a channel by its channel ID, with legacy route fallback.
 * @param {string} channelId
 * @returns {Promise<object>}
 */
export const getChannelById = async (channelId) => {
  const id = encodeURIComponent(String(channelId || "").trim());
  if (!id) throw new Error("Channel id is required");

  try {
    return await api.get(`${PF}/channels/${id}`);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    return api.get(`${PF}/channel/${id}`);
  }
};

/**
 * Update a channel by ID, with legacy route fallback.
 * @param {string} channelId
 * @param {object} data - Fields to update.
 * @returns {Promise<object>}
 */
export const updateChannel = async (channelId, data) => {
  const id = encodeURIComponent(String(channelId || "").trim());
  if (!id) throw new Error("Channel id is required");

  try {
    return await api.put(`${PF}/channels/${id}`, data);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    return api.put(`${PF}/channel/${id}`, data);
  }
};

/**
 * Create a post within a channel, with legacy route fallback.
 * @param {string} channelId
 * @param {object} [data] - Post payload (description, type, media_url).
 * @returns {Promise<object>}
 */
export const createChannelPost = async (channelId, data = {}) => {
  const id = encodeURIComponent(String(channelId || "").trim());
  if (!id) throw new Error("Channel id is required");

  const isFormData =
    typeof FormData !== "undefined" && data instanceof FormData;
  if (isFormData) {
    return api.post(`${PF}/channels/${id}/posts`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  const type = String(data.type || "").toLowerCase();
  const mediaUrl = data.media_url || data.mediaUrl || "";

  const modernPayload = {
    description: data.description || "",
  };
  if (type === "image" && mediaUrl) modernPayload.image_url = mediaUrl;
  if (type === "video" && mediaUrl) modernPayload.video_url = mediaUrl;

  try {
    return await api.post(`${PF}/channels/${id}/posts`, modernPayload);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    const legacyPayload = {
      content: data.description || data.content || "",
      type: type || "text",
      media_url: mediaUrl || null,
    };
    return api.post(`${PF}/channel/${id}/posts`, legacyPayload);
  }
};

/**
 * Upload channel logo/cover media.
 * @param {string} channelId
 * @param {FormData} formData
 * @returns {Promise<object>}
 */
export const uploadChannelMedia = async (channelId, formData) => {
  const id = encodeURIComponent(String(channelId || "").trim());
  if (!id) throw new Error("Channel id is required");
  return api.post(`${PF}/channels/${id}/media`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/**
 * Fetch all channels, with legacy route fallback.
 * @returns {Promise<object>}
 */
export const getAllChannels = async () => {
  try {
    return await api.get(`${PF}/channels`);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    return api.get(`${PF}/channel`);
  }
};

/**
 * Fetch premium channels (CentrePages).
 * @returns {Promise<object>}
 */
export const getPremiumChannels = async () =>
  api.get(`${PF}/channels/premium`);

/**
 * Fetch featured CentrePages (public).
 * @param {object} params - Query parameters (limit, category).
 * @returns {Promise<object>}
 */
export const getFeaturedCentrePages = async (params = {}, config = {}) => {
  try {
    return await api.get(`${PF}/channels/featured`, { params, ...config });
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    return api.get(`${PF}/channel/featured`, { params, ...config });
  }
};

/**
 * Follow a channel by ID, with legacy route fallback.
 * @param {string} channelId
 * @returns {Promise<object>}
 */
export const followChannel = async (channelId) => {
  const id = encodeURIComponent(String(channelId || "").trim());
  if (!id) throw new Error("Channel id is required");

  try {
    return await api.post(`${PF}/channels/${id}/follow`);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    return api.post(`${PF}/channel/${id}/follow`);
  }
};

/**
 * Fetch updates from CentrePages the current user follows.
 * @param {object} params - Query parameters (limit)
 * @returns {Promise<object>}
 */
export const getFollowingCentreUpdates = (params = {}, config = {}) =>
  api.get(`${PF}/channels/updates/following`, { params, ...config });

/**
 * Add a text post to the feed.
 * @param {object} data - Post data.
 * @returns {Promise}
 */
export const addTextPost = (data) =>
  api.post(`${PF}/feed/add`, data);

/**
 * Get nearby posts by latitude, longitude, and radius.
 * @param {number} lat
 * @param {number} long
 * @param {number} [radius=10]
 * @returns {Promise}
 */
export const getNearbyPosts = (lat, long, radius = 10) =>
  api.get(`${PF}/nearby?lat=${lat}&long=${long}&radius=${radius}`);

/**
 * Extract a user-friendly error message from an error object.
 * @param {object} error
 * @returns {string}
 */
export const getFriendlyError = (error) =>
  error.message || "An unexpected error occurred.";
