const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

/**
 * @route GET / - Retrieve all categories
 * @route GET /brands - Not implemented (501)
 */
router.get("/", categoryController.getAllCategories);
router.get("/brands", (req, res) =>
  res.status(501).json({ code: 501, message: "Not implemented" })
);

module.exports = router;
