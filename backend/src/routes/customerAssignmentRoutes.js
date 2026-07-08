const express = require('express');
const { getAllRules, createRule, deleteRule, updateRule, createRulesBulk } = require('../controllers/customerAssignmentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
// Only ADMIN and MANAGER roles can access/manage auto-assignment rules
router.use(authorizeRoles(['ADMIN', 'MANAGER']));

router.get('/', getAllRules);
router.post('/', createRule);
router.post('/bulk', createRulesBulk);
router.put('/:id', updateRule);
router.delete('/:id', deleteRule);

module.exports = router;
