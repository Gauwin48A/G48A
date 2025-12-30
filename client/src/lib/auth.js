import api from './api';

import { validateEmail, validatePassword, validatePhone, validateName } from './validate';

export const registerUser = async (userData) => {
  // Frontend validation
  const errors = [];
  if (!validateName(userData.name)) errors.push('Name must be at least 2 characters.');
  if (!validateEmail(userData.email)) errors.push('Invalid email format.');
  if (!validatePassword(userData.password)) errors.push('Password must be at least 8 characters, include uppercase, lowercase, and a number.');
  if (!validatePhone(userData.phone)) errors.push('Phone number must be 10 digits, start with 6-9, and not be a fake pattern.');
  if (errors.length > 0) {
    throw { errors };
  }
  // Prepare FormData for file uploads
  const formData = new FormData();
  Object.entries(userData).forEach(([key, value]) => {
    if (value) formData.append(key, value);
  });
  // Files: aadhaar_xml, pan_card, profile_pic
  if (userData.aadhaar_xml instanceof File) formData.append('aadhaar_xml', userData.aadhaar_xml);
  if (userData.pan_card instanceof File) formData.append('pan_card', userData.pan_card);
  if (userData.profile_pic instanceof File) formData.append('profile_pic', userData.profile_pic);
  const res = await api.post('/api/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const loginUser = async (loginData) => {
  // Simple validation for login - no complex password rules
  if (!loginData.email || !loginData.email.includes('@')) {
    throw { errors: ['Please enter a valid email address.'] };
  }
  if (!loginData.password || loginData.password.length < 6) {
    throw { errors: ['Password must be at least 6 characters.'] };
  }

  console.log('[loginUser] Attempting login for:', loginData.email);

  try {
    const res = await api.post('/api/auth/login', loginData);
    console.log('[loginUser] Success:', res.data);
    return res.data;
  } catch (err) {
    console.error('[loginUser] Error:', err.response?.data || err.message);
    // Re-throw with proper format for Login.jsx to handle
    if (err.response?.data?.error) {
      throw { error: err.response.data.error };
    }
    throw { errors: [err.message || 'Login failed'] };
  }
};
