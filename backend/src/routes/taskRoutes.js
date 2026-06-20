const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addComment,
  addAttachment,
  getAttachmentFile,
  parseAttachment,
} = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const storage = multer.memoryStorage();

// Validate file uploads: Limit size to 10MB and allow Excel/PDF/Text files
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.xlsx', '.xls', '.csv', '.txt', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDFs, Excel, Word documents, text files, and images are supported.'));
    }
  },
});

// All task routes require authentication
router.use(authenticateToken);

// Core CRUD task operations
router.get('/', getAllTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

// Comments & Attachments
router.post('/:id/comments', addComment);
router.post('/:id/attachments', upload.single('file'), addAttachment);
router.get('/attachments/:attachmentId/view', getAttachmentFile);
router.get('/attachments/:attachmentId/parse', parseAttachment);

module.exports = router;
