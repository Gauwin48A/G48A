/**
 * Validate an email address format.
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return emailRegex.test(email);
}

/**
 * Validate a password (min 8 chars, uppercase, lowercase, and digit).
 * @param {string} password
 * @returns {boolean}
 */
export function validatePassword(password) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validate an Indian phone number (10 digits starting with 6-9).
 * @param {string} phone
 * @returns {boolean}
 */
export function validatePhone(phone) {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate a name (at least 2 characters).
 * @param {string} name
 * @returns {boolean}
 */
export function validateName(name) {
  return name && name.length >= 2;
}
