import axios from 'axios';

// In development, Vite's proxy handles /api routes
// In production, use the full API URL
const isDev = import.meta.env.DEV;
const api = axios.create({
  baseURL: isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'),
  timeout: 15000, // 15 second timeout
});

// User-friendly error messages
const ERROR_MESSAGES = {
  network: "We couldn't reach the server. Please check your internet connection.",
  timeout: "The request is taking too long. Please try again.",
  server: "Something went wrong on our end. We're working on it!",
  notFound: "The requested resource was not found.",
  unauthorized: "Please log in to continue.",
  forbidden: "You don't have permission to do that.",
  default: "An unexpected error occurred. Please try again."
};

// Get user-friendly error message
function getFriendlyError(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') return ERROR_MESSAGES.timeout;
    return ERROR_MESSAGES.network;
  }

  const status = error.response.status;
  if (status === 401) return ERROR_MESSAGES.unauthorized;
  if (status === 403) return ERROR_MESSAGES.forbidden;
  if (status === 404) return ERROR_MESSAGES.notFound;
  if (status >= 500) return ERROR_MESSAGES.server;

  return error.response.data?.error || ERROR_MESSAGES.default;
}

// Retry logic with exponential backoff
async function withRetry(requestFn, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Don't retry client errors (4xx) except 408 (timeout) and 429 (rate limit)
      const status = error.response?.status;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[API] Retry ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    error.friendlyMessage = getFriendlyError(error);
    console.error('[API Error]', error.friendlyMessage);
    return Promise.reject(error);
  }
);

// Exported helper for GET with retry
export const getWithRetry = (url, config) => withRetry(() => api.get(url, config));

// Exported helper for POST with retry
export const postWithRetry = (url, data, config) => withRetry(() => api.post(url, data, config));

export const fetchFeed = (params) => api.get('/feed', { params });
export const fetchMyFeed = (params) => api.get('/feed/mine', { params });
export const createChannel = (data) => api.post('/channel/create', data);
export const getChannelByUser = (userId) => api.get(`/channel/${userId}`);
export const updateChannel = (channelId, data) => api.put(`/channel/${channelId}`, data);
export const createChannelPost = (channelId, data) => api.post(`/channel/${channelId}/posts`, data);
export const getAllChannels = () => api.get('/channel');
export const followChannel = (channelId) => api.post(`/channel/${channelId}/follow`);
export const addTextPost = (data) => api.post('/feed/add', data);

// Nearby posts API
export const getNearbyPosts = (lat, long, radius = 10) =>
  getWithRetry(`/api/nearby?lat=${lat}&long=${long}&radius=${radius}`);

export default api;

