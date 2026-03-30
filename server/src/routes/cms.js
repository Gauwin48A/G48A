const router = require("express").Router();
const cmsController = require("../controllers/cmsController");

// Public CMS read endpoints
router.get("/pages", cmsController.getPages);
router.get("/pages/:slug", cmsController.getPage);

module.exports = router;
