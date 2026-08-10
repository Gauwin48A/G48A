const express = require("express");
const router = express.Router();
const refundsController = require("../controllers/refundsController");

router.get("/", refundsController.list);
router.post("/", refundsController.create);
router.get("/:id", refundsController.getById);

module.exports = router;
