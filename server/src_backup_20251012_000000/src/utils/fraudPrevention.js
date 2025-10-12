
// Fraud Prevention Utilities
export const generatePostId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `POST${timestamp.toString().slice(-6)}${random}`;
};

export const generateUserId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `USER${timestamp.toString().slice(-6)}${random}`;
};

export const generateDailySecretCode = (userId) => {
  const today = new Date().toDateString();
  const hash = btoa(userId + today).replace(/[^A-Z0-9]/g, '').substr(0, 6);
  return hash;
};

export const validateSecretCode = (userId, providedCode) => {
  const expectedCode = generateDailySecretCode(userId);
  return expectedCode === providedCode.toUpperCase();
};

export const checkPostExpiry = (postedDate, validityDays = 25) => {
  const posted = new Date(postedDate);
  const today = new Date();
  const diffTime = Math.abs(today - posted);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    isExpired: diffDays > validityDays,
    daysRemaining: Math.max(0, validityDays - diffDays),
    daysElapsed: diffDays
  };
};

export const flagSuspiciousActivity = (userId, activity) => {
  // Store flag in backend
  fetch(`http://localhost:5000/api/users/${userId}/flags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      activity,
      timestamp: new Date().toISOString(),
      severity: getSeverityLevel(activity)
    })
  }).then(() => {
    // Check if user should be restricted
    fetch(`http://localhost:5000/api/users/${userId}/flags?severity=high`)
      .then(res => res.json())
      .then(flags => {
        if (Array.isArray(flags) && flags.length >= 3) {
          restrictUser(userId);
        }
      });
  });
};

const getSeverityLevel = (activity) => {
  const highRiskActivities = ['excessive_sale_undone', 'fake_sale_attempts', 'spam_posting'];
  const mediumRiskActivities = ['multiple_failed_sales', 'no_response_to_buyers'];
  
  if (highRiskActivities.includes(activity)) return 'high';
  if (mediumRiskActivities.includes(activity)) return 'medium';
  return 'low';
};

const restrictUser = (userId) => {
  const restrictions = {
    userId,
    restrictedAt: new Date().toISOString(),
    canPost: false,
    canBuy: false,
    reason: 'Suspicious activity detected'
  };
  fetch(`http://localhost:5000/api/users/${userId}/restrict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(restrictions)
  });
  console.log(`User ${userId} has been restricted due to suspicious activity`);
};

export const getUserRestrictions = (userId) => {
  // Fetch restrictions from backend
  return fetch(`http://localhost:5000/api/users/${userId}/restrictions`)
    .then(res => res.json())
    .catch(() => null);
};
