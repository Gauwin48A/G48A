const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");

router.get("/products", searchController.products);
router.get("/posts", searchController.posts);
router.get("/trending", searchController.trending);
router.get("/pages", searchController.pages);
router.get("/users", searchController.users);

module.exports = router;
