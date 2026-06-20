const express = require('express');
const { register, login, getMe, getAllUsers, refresh, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.get('/users', authenticateToken, getAllUsers);

module.exports = router;
