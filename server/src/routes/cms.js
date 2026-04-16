const router = require("express").Router();
const cmsController = require("../controllers/cmsController");
const { publicReadSlowDown } = require("../middleware/rateLimiter");

// Public CMS read endpoints
router.get("/pages", publicReadSlowDown, cmsController.getPages);
router.get("/pages/:slug", publicReadSlowDown, cmsController.getPage);

module.exports = router;
