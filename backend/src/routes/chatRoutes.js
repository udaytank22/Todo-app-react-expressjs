const express = require('express');
const { getDirectMessages } = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/messages/:otherUserId', getDirectMessages);

module.exports = router;
