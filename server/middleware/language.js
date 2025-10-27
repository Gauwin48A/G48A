export const detectLanguage = (req, res, next) => {
  req.lang = req.query.lang || req.headers['accept-language']?.split(',')[0]?.slice(0,2) || 'en';
  next();
};
