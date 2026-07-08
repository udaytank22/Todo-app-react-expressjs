const express = require('express');
const { register, login, getMe, getAllUsers, refresh, logout, createUser, updateUser, deleteUser, createUsersBulk } = require('../controllers/authController');
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
router.post('/users', authenticateToken, createUser);
router.post('/users/bulk', authenticateToken, createUsersBulk);
router.put('/users/:id', authenticateToken, updateUser);
router.delete('/users/:id', authenticateToken, deleteUser);

module.exports = router;
