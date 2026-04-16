/**
 * Content Moderation: Referral Code Prevention
 *
 * Detects and strips/warns about referral codes in user-generated content
 * (post titles, descriptions) to prevent public referral code spamming.
 */

// Pattern matches referral-like codes: "REF-XXXX", "use my code XXXX", "/signup?ref=XXXX" etc.
const REFERRAL_PATTERNS = [
  /(?:referral|invite|promo)\s*(?:code|link)\s*[:=]?\s*[A-Z0-9]{4,}/gi,
  /signup\?ref=[A-Za-z0-9_-]+/gi,
  /(?:use|enter|apply)\s+(?:my|this)\s+(?:code|referral)\s*[:=]?\s*[A-Z0-9]{4,}/gi,
  /mhub:?\s*(?:code|referral)\s*[:=]?\s*[A-Z0-9]{4,}/gi,
];

/**
 * Check if text contains referral code patterns.
 * @param {string} text - The text to check
 * @returns {{ detected: boolean, matches: string[] }}
 */
function detectReferralCode(text) {
  if (!text || typeof text !== "string") return { detected: false, matches: [] };

  const matches = [];
  for (const pattern of REFERRAL_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push(match[0]);
    }
  }

  return { detected: matches.length > 0, matches: [...new Set(matches)] };
}

/**
 * Strip referral codes from text (replace with [removed]).
 * @param {string} text
 * @returns {string}
 */
function stripReferralCodes(text) {
  if (!text || typeof text !== "string") return text;

  let cleaned = text;
  for (const pattern of REFERRAL_PATTERNS) {
    pattern.lastIndex = 0;
    cleaned = cleaned.replace(pattern, "[referral code removed]");
  }
  return cleaned;
}

module.exports = { detectReferralCode, stripReferralCodes };
