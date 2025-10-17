const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET?.trim());
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireAadhaarVerified = (req, res, next) => {
  if (!req.user || !req.user.aadhaar_verified) {
    return res.status(403).json({ error: 'Aadhaar verification required to access this feature.' });
  }
  next();
};

module.exports = { protect, requireAadhaarVerified };