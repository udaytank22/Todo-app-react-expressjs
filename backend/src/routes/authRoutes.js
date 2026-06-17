const express = require('express');
const { register, login, getMe, getAllUsers } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.get('/users', authenticateToken, getAllUsers);

module.exports = router;
