const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const brandsRoutes = require("./brands");

/**
 * @route GET / - Retrieve all categories
 * @route GET /resolve - Resolve a category or subcategory by name/ID
 * @route GET /brands - Alias of /api/brands
 */
router.get("/", categoryController.getAllCategories);
router.get("/with-subcategories", categoryController.getCategoriesWithSubcategories);
router.get("/resolve", categoryController.resolveCategory);
router.get("/hub-stats", categoryController.getHubStats);
router.use("/brands", brandsRoutes);

module.exports = router;
