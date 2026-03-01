import api from '../services/api';

// Export the centralized instance (shimmed)
export default api;

// Helper to handle legacy "getWithRetry" if needed
// The new api service has internal retry for 401, but we can wrap for others if strictly needed.
// For now, simple mapping is sufficient as per "Centralized Axios" requirement.
export const getWithRetry = (url, config) => api.get(url, config);
export const postWithRetry = (url, data, config) => api.post(url, data, config);

// ============================================
// COMPATIBILITY LAYER
// Redirects legacy function calls to the new secure API
// NOTE: These now automatically get Device ID, Tokens, and Error Handling!
// ============================================

// Feed
// services/api.js baseURL already includes the `/api` prefix.
// Do not prepend `/api` again, or requests would become `/api/api/...`.

const PF = ''; // Empty - baseURL already includes /api
const getErrorStatus = (error) => error?.status || error?.response?.status;
const getBackendErrorText = (error) =>
  String(error?.response?.data?.error || error?.response?.data?.message || '')
    .trim()
    .toLowerCase();
const shouldFallbackToLegacyRoute = (error) => {
  const status = getErrorStatus(error);
  if (status !== 404) return false;
  const backendErrorText = getBackendErrorText(error);
  if (!backendErrorText) return true;
  return backendErrorText.includes('route not found') || backendErrorText.includes('not found - /api');
};

// Feed
export const fetchFeed = (params) => api.get(`${PF}/feed`, { params });
export const fetchMyFeed = (params) => api.get(`${PF}/feed/mine`, { params });

// Channels
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

export const getChannelByUser = async (userId) => {
  const id = encodeURIComponent(String(userId || '').trim());
  if (!id) throw new Error('User id is required');
  try {
    const payload = await api.get(`${PF}/channels/owner/${id}`);

    if (!payload) return null;

    // Modern endpoint shape: { channel, posts }. Treat channel absence as no channel.
    if (typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'channel')) {
      return payload.channel ? payload : null;
    }

    // Legacy shape fallback compatibility.
    if (payload.channel_id) {
      return payload;
    }

    return null;
  } catch (error) {
    const status = getErrorStatus(error);
    const shouldTryLegacy = status === 404 || shouldFallbackToLegacyRoute(error);
    if (!shouldTryLegacy) {
      throw error;
    }

    try {
      // Older backends may expose owner lookup via /channel/:userId.
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

export const getChannelById = async (channelId) => {
  const id = encodeURIComponent(String(channelId || '').trim());
  if (!id) throw new Error('Channel id is required');
  try {
    return await api.get(`${PF}/channels/${id}`);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    return api.get(`${PF}/channel/${id}`);
  }
};

export const updateChannel = async (channelId, data) => {
  const id = encodeURIComponent(String(channelId || '').trim());
  if (!id) throw new Error('Channel id is required');
  try {
    return await api.put(`${PF}/channels/${id}`, data);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    return api.put(`${PF}/channel/${id}`, data);
  }
};
export const createChannelPost = async (channelId, data = {}) => {
  const id = encodeURIComponent(String(channelId || '').trim());
  if (!id) throw new Error('Channel id is required');

  const type = String(data.type || '').toLowerCase();
  const mediaUrl = data.media_url || data.mediaUrl || '';
  const modernPayload = {
    description: data.description || ''
  };

  if (type === 'image' && mediaUrl) modernPayload.image_url = mediaUrl;
  if (type === 'video' && mediaUrl) modernPayload.video_url = mediaUrl;

  try {
    return await api.post(`${PF}/channels/${id}/posts`, modernPayload);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }

    const legacyPayload = {
      content: data.description || data.content || '',
      type: type || 'text',
      media_url: mediaUrl || null
    };
    return api.post(`${PF}/channel/${id}/posts`, legacyPayload);
  }
};
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
export const followChannel = async (channelId) => {
  const id = encodeURIComponent(String(channelId || '').trim());
  if (!id) throw new Error('Channel id is required');
  try {
    return await api.post(`${PF}/channels/${id}/follow`);
  } catch (error) {
    if (!shouldFallbackToLegacyRoute(error)) {
      throw error;
    }
    return api.post(`${PF}/channel/${id}/follow`);
  }
};

// Posts
export const addTextPost = (data) => api.post(`${PF}/feed/add`, data);

// Nearby
export const getNearbyPosts = (lat, long, radius = 10) =>
  api.get(`${PF}/nearby?lat=${lat}&long=${long}&radius=${radius}`);

// Error helper for legacy components
export const getFriendlyError = (error) => {
  return error.message || "An unexpected error occurred.";
};
