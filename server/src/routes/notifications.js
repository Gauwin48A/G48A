const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");

// Optional auth helper depending on route setup
const authenticate = typeof authMiddleware === "function" 
  ? authMiddleware 
  : (authMiddleware.authenticate || ((req, res, next) => next()));

const controller = require("../controllers/notificationController");

/** Admin gate for the internal send endpoint (mirrors routes/pushNotifications.js). */
async function requireAdmin(req, res, next) {
  const role = String(req.user?.role || "").trim().toLowerCase();
  if (role === "admin" || role === "superadmin") return next();

  const userId = getAuthUserId(req);
  if (userId) {
    try {
      const result = await runQuery(
        `SELECT COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user') AS role FROM users u WHERE u.user_id::text = $1 LIMIT 1`,
        [userId]
      );
      const dbRole = String(result.rows[0]?.role || "").trim().toLowerCase();
      if (dbRole === "admin" || dbRole === "superadmin") return next();
    } catch (err) {
      /* fall through to deny */
    }
  }
  return res.status(403).json({ error: "Admin access required" });
}

// FCM Token registration
router.post("/fcm-token", authenticate, controller.registerFcmToken);
router.delete("/fcm-token", authenticate, controller.unregisterFcmToken);

// User notification history & read status
router.get("/", authenticate, controller.getNotifications);
router.patch("/read-all", authenticate, controller.markAllAsRead);
router.patch("/:id/read", authenticate, controller.markAsRead);

// Notification preferences
router.get("/preferences", authenticate, controller.getPreferences);
router.put("/preferences", authenticate, controller.updatePreferences);

// Trigger notification dispatch (Internal/Admin)
router.post("/send", authenticate, requireAdmin, controller.sendNotification);

module.exports = router;
