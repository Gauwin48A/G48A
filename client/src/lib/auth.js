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

  // Map frontend field names to backend expected names
  const signupData = {
    fullName: userData.name,           // Backend expects 'fullName'
    phone: userData.phone,             // Backend expects 'phone'
    email: userData.email,
    password: userData.password,
    referral_code: userData.referral_code
  };

  try {
    // Use /auth/signup (baseURL already includes /api)
    const res = await api.post('/auth/signup', signupData);
    return res; // api.js interceptor already unwraps response.data
  } catch (err) {
    console.error('[registerUser] Error:', err);
    // Re-throw with proper format
    if (err.errors) {
      throw { errors: err.errors.map(e => e.msg || e.message || e) };
    }
    if (err.error) {
      throw { error: err.error };
    }
    throw { error: err.message || 'Signup failed' };
  }
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
