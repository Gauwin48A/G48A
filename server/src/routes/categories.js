const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const subcategoryController = require("../controllers/subcategoryController");
const brandsRoutes = require("./brands");
const { publicReadSlowDown } = require("../middleware/rateLimiter");

/**
 * @route GET / - Retrieve all categories
 * @route GET /resolve - Resolve a category or subcategory by name/ID
 * @route GET /brands - Alias of /api/brands
 */
router.get("/", publicReadSlowDown, categoryController.getAllCategories);
router.get("/with-subcategories", publicReadSlowDown, categoryController.getCategoriesWithSubcategories);
router.get("/resolve", publicReadSlowDown, categoryController.resolveCategory);
router.get("/hub-stats", publicReadSlowDown, categoryController.getHubStats);
router.get("/stats", publicReadSlowDown, categoryController.getStats);
router.get("/:categoryId/subcategories", publicReadSlowDown, (req, res) => {
  req.query.category_id = req.params.categoryId;
  return subcategoryController.getSubcategories(req, res);
});
router.use("/brands", brandsRoutes);

module.exports = router;
