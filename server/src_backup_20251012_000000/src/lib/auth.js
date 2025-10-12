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
  const res = await api.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const loginUser = async (loginData) => {
  // Only basic validation for login
  if (!validateEmail(loginData.email)) throw { errors: ['Invalid email format.'] };
  if (!validatePassword(loginData.password)) throw { errors: ['Password must be at least 8 characters, include uppercase, lowercase, and a number.'] };
  const res = await api.post('/auth/login', loginData);
  return res.data;
};
