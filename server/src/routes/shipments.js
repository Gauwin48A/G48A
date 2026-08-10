const express = require("express");
const router = express.Router();
const shipmentsController = require("../controllers/shipmentsController");

router.get("/", shipmentsController.list);
router.post("/", shipmentsController.create);
router.get("/:id", shipmentsController.getById);
router.patch("/:id/status", shipmentsController.updateStatus);
router.post("/:id/confirm-delivery", shipmentsController.confirmDelivery);

module.exports = router;
