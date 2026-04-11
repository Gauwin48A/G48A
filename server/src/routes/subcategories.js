const express = require("express");
const router = express.Router();
const subcategoryController = require("../controllers/subcategoryController");
const { protect } = require("../middleware/auth");
const { publicReadSlowDown } = require("../middleware/rateLimiter");
const { isAdmin } = require("../utils/dbHelpers");

function requireAdminWrite(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}

/**
 * @route GET /           - Retrieve subcategories (optionally filtered by category_id)
 * @route GET /grouped    - Retrieve all subcategories grouped by parent category
 */
router.get("/", publicReadSlowDown, subcategoryController.getSubcategories);
router.get("/grouped", publicReadSlowDown, subcategoryController.getSubcategoriesGrouped);
router.get("/trending", publicReadSlowDown, subcategoryController.getTrendingSubcategories);
router.patch(
  "/:subcategoryId/status",
  protect,
  requireAdminWrite,
  subcategoryController.setSubcategoryActiveState
);
router.post(
  "/:subcategoryId/deactivate",
  protect,
  requireAdminWrite,
  (req, res, next) => {
    req.body = { ...req.body, is_active: false };
    next();
  },
  subcategoryController.setSubcategoryActiveState
);
router.post(
  "/:subcategoryId/reactivate",
  protect,
  requireAdminWrite,
  (req, res, next) => {
    req.body = { ...req.body, is_active: true };
    next();
  },
  subcategoryController.setSubcategoryActiveState
);

module.exports = router;
