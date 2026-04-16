function apiResponseNormalizer(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const hasSuccess = Object.prototype.hasOwnProperty.call(payload, "success");
      const status = res.statusCode || 200;
      const normalized = hasSuccess
        ? payload
        : { success: status < 400, ...payload };

      if (status >= 400 && !normalized.error && normalized.message) {
        normalized.error = normalized.message;
      }

      return originalJson(normalized);
    }

    return originalJson(payload);
  };

  return next();
}

module.exports = { apiResponseNormalizer };
