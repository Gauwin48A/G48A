// Simple profanity filter (replace with a real list or use an npm package in prod)
const badWords = ['badword1', 'badword2', 'badword3'];
function filterProfanity(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return badWords.some(word => lower.includes(word));
}
module.exports = { filterProfanity };
