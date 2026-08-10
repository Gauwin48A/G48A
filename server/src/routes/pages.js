const express = require("express");
const router = express.Router();
const pagesController = require("../controllers/pagesController");

router.get("/", pagesController.list);
router.post("/", pagesController.create);
router.get("/:id", pagesController.getById);
router.patch("/:id", pagesController.update);
router.post("/:id/follow", pagesController.follow);
router.post("/:id/unfollow", pagesController.unfollow);
router.get("/:id/posts", pagesController.listPosts);
router.post("/:id/posts", pagesController.createPost);

module.exports = router;
