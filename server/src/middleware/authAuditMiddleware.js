const { writeAuthAudit } = require("../services/authAuditService");

function inferAuthAction(req) {
  const path = String(req.path || "").toLowerCase();
  const method = String(req.method || "").toUpperCase();

  if (path === "/login" && method === "POST") return "LOGIN_ATTEMPT";
  if (path === "/signup" && method === "POST") return "SIGNUP_ATTEMPT";
  if (path === "/logout" && method === "POST") return "LOGOUT_ATTEMPT";
  if (path === "/refresh-token" && method === "POST") return "TOKEN_REFRESH_ATTEMPT";
  if (path === "/forgot-password" && method === "POST") return "PASSWORD_RESET_REQUEST_ATTEMPT";
  if (path === "/reset-password" && method === "POST") return "PASSWORD_RESET_ATTEMPT";
  if (path === "/verify-otp" && method === "POST") return "OTP_VERIFY_ATTEMPT";
  if (path === "/send-otp" && method === "POST") return "OTP_SEND_ATTEMPT";
  if (path === "/aadhaar/send-otp" && method === "POST")
    return "AADHAAR_OTP_SEND_ATTEMPT";
  if (path === "/aadhaar/verify-otp" && method === "POST")
    return "AADHAAR_OTP_VERIFY_ATTEMPT";
  if (path === "/aadhaar/complete-signup" && method === "POST")
    return "AADHAAR_SIGNUP_COMPLETE_ATTEMPT";

  return "AUTH_EVENT";
}

function isSuccessfulResponse(statusCode) {
  return statusCode >= 200 && statusCode < 300;
}

function authAuditMiddleware() {
  return (req, res, next) => {
    const action = inferAuthAction(req);
    const startedAt = Date.now();

    res.on("finish", () => {
      const status = Number(res.statusCode || 0);
      const durationMs = Date.now() - startedAt;
      void writeAuthAudit({
        req,
        action,
        success: isSuccessfulResponse(status),
        details: {
          status,
          duration_ms: durationMs,
        },
      });
    });

    return next();
  };
}

module.exports = {
  authAuditMiddleware,
};
