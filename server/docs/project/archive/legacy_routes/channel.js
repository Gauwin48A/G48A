const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const { authenticate } = require('../middleware/auth');

router.post('/create', authenticate, channelController.createChannel);
router.get('/:userId', channelController.getChannelByUser);
router.put('/:channelId', authenticate, channelController.updateChannel);
router.post('/:channelId/posts', authenticate, channelController.createChannelPost);
router.get('/', channelController.getAllChannels);
router.post('/:channelId/follow', authenticate, channelController.followChannel);

module.exports = router;
