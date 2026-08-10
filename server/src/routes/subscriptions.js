const router = require("express").Router();
const { authenticateToken } = require("../middleware/security");
const subscriptionController = require("../controllers/subscriptionController");

// ── Public Endpoints ────────────────────────────────────
router.get("/plans", subscriptionController.getPlans);

// ── User Subscription Management (requires auth) ────────
router.get("/my", authenticateToken, subscriptionController.getMySubscription);
router.get("/history", authenticateToken, subscriptionController.getHistory);
router.post("/cancel", authenticateToken, subscriptionController.cancelSubscription);

// ── Purchase Flow (requires auth) ───────────────────────
router.post("/create-order", authenticateToken, subscriptionController.createOrder);
router.post("/verify-payment", authenticateToken, subscriptionController.verifyPayment);
router.post("/validate-coupon", authenticateToken, subscriptionController.validateCoupon);

// ── Free Trial (requires auth) ───────────────────────────
// /claim-trial is the canonical endpoint (Android app).
// /trial is the legacy alias the web client already calls with { planName }.
router.post("/claim-trial", authenticateToken, subscriptionController.claimTrial);
router.post("/trial", authenticateToken, subscriptionController.claimTrial);

// ── Feature Entitlements (requires auth) ────────────────
router.get("/features", authenticateToken, subscriptionController.myFeatures);
router.get("/check-feature/:featureCode", authenticateToken, subscriptionController.checkFeature);

// ── Admin-only guard middleware ──────────────────────────
const requireAdmin = (req, res, next) => {
  const role = String(req.user?.role || req.user?.userRole || "").toLowerCase();
  if (role === "admin" || role === "super_admin" || role === "superadmin") return next();
  return res.status(403).json({ error: "Admin access required" });
};

// ── Admin Endpoints (plan & feature management) ─────────
router.get("/admin/features", authenticateToken, requireAdmin, subscriptionController.adminListFeatures);
router.post("/admin/features", authenticateToken, requireAdmin, subscriptionController.adminCreateFeature);
router.post("/admin/plans", authenticateToken, requireAdmin, subscriptionController.adminCreatePlan);
router.patch("/admin/plans/:id/features", authenticateToken, requireAdmin, subscriptionController.adminSetPlanFeature);
router.get("/admin/plans/:id/features", authenticateToken, requireAdmin, subscriptionController.adminGetPlanFeatures);

// ── Admin Subscription Override Endpoints ────────────────
router.post("/admin/user/:userId/activate", authenticateToken, requireAdmin, subscriptionController.adminActivateUserSubscription);
router.post("/admin/user/:userId/deactivate", authenticateToken, requireAdmin, subscriptionController.adminDeactivateUserSubscription);
router.get("/admin/user/:userId", authenticateToken, requireAdmin, subscriptionController.adminGetUserSubscription);
router.get("/admin/users/search", authenticateToken, requireAdmin, subscriptionController.adminSearchUsersWithSubscriptions);

module.exports = router;
