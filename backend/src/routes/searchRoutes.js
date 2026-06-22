const express = require('express');
const { globalSearch } = require('../controllers/searchController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.get('/', globalSearch);

module.exports = router;
