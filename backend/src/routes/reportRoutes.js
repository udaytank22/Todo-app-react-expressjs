const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);
// Ensure only ADMIN or MANAGER can view reports
router.use(authorizeRoles(['ADMIN', 'MANAGER']));

router.get('/dashboard', reportController.getDashboardReports);

module.exports = router;
