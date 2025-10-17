import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

export const fetchFeed = (params) => api.get('/feed', { params });
export const fetchMyFeed = (params) => api.get('/feed/mine', { params });
export const createChannel = (data) => api.post('/channel/create', data);
export const getChannelByUser = (userId) => api.get(`/channel/${userId}`);
export const updateChannel = (channelId, data) => api.put(`/channel/${channelId}`, data);
export const createChannelPost = (channelId, data) => api.post(`/channel/${channelId}/posts`, data);
export const getAllChannels = () => api.get('/channel');
export const followChannel = (channelId) => api.post(`/channel/${channelId}/follow`);
export const addTextPost = (data) => api.post('/feed/add', data);

export default api;
