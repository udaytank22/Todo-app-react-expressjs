const express = require('express');
const {
  getAllGroups,
  createGroup,
  updateGroup,
  deleteGroup
} = require('../controllers/groupController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllGroups);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

module.exports = router;
