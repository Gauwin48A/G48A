const express = require("express");
const router = express.Router();
const tiersController = require("../controllers/tiersController");

/** @route GET / - Retrieve all available membership tiers */
router.get("/", tiersController.getTiers);

module.exports = router;
