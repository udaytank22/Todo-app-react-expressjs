const express = require('express');
const { connectEmail, oauthCallback, getStatus, fetchAndProcessEmails, getEmailHistory } = require('../controllers/emailController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// OAuth links (Public because Microsoft redirects here directly)
router.get('/connect', connectEmail);
router.get('/callback', oauthCallback);

// Protected routes
router.get('/status', authenticateToken, getStatus);
router.post('/fetch', authenticateToken, fetchAndProcessEmails);
router.get('/history', authenticateToken, getEmailHistory);

module.exports = router;
