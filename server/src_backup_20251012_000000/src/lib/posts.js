import api from './api';

export const fetchPosts = async () => {
  const res = await api.get('/posts');
  return res.data;
};

export const createPost = async (postData) => {
  // Validation is now handled by backend/database
  const res = await api.post('/posts', postData);
  return res.data;
};
