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

// Feed
export const fetchFeed = (params) => api.get(`${PF}/feed`, { params });
export const fetchMyFeed = (params) => api.get(`${PF}/feed/mine`, { params });

// Channels
export const createChannel = (data) => api.post(`${PF}/channel/create`, data);
export const getChannelByUser = (userId) => api.get(`${PF}/channel/${userId}`);
export const updateChannel = (channelId, data) => api.put(`${PF}/channel/${channelId}`, data);
export const createChannelPost = (channelId, data) => api.post(`${PF}/channel/${channelId}/posts`, data);
export const getAllChannels = () => api.get(`${PF}/channel`);
export const followChannel = (channelId) => api.post(`${PF}/channel/${channelId}/follow`);

// Posts
export const addTextPost = (data) => api.post(`${PF}/feed/add`, data);

// Nearby
export const getNearbyPosts = (lat, long, radius = 10) =>
  api.get(`${PF}/nearby?lat=${lat}&long=${long}&radius=${radius}`);

// Error helper for legacy components
export const getFriendlyError = (error) => {
  return error.message || "An unexpected error occurred.";
};
