const express = require("express");
const router = express.Router();
const settlementsController = require("../controllers/settlementsController");

router.get("/", settlementsController.list);
router.get("/current", settlementsController.current);
router.get("/:id", settlementsController.getById);

module.exports = router;
