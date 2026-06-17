const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO on the HTTP server
 * @param {object} server - HTTP Server instance
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for simplicity, can be locked down to the frontend URL
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket Client connected: ${socket.id}`);

    // Join user-specific room
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`Socket Client ${socket.id} joined room: user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get active Socket.IO server instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO is not initialized. Call initSocket first.');
  }
  return io;
};

/**
 * Helper to emit notification when a new email is processed into a task
 * @param {object} task - Task object with customerName, subject, inquiryId, id
 */
const emitNewInquiry = (task) => {
  if (!io) return;
  console.log(`[Socket] Broadcasting new inquiry notification for: ${task.inquiryId}`);
  io.emit('new_inquiry', {
    id: task.id,
    inquiryId: task.inquiryId,
    subject: task.subject,
    customerName: task.customerName,
    senderEmail: task.senderEmail,
    description: task.description || '',
    status: task.status || 'NEW_EMAIL',
    priority: task.priority || 'MEDIUM',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt || task.createdAt,
    assignedUserId: task.assignedUserId || null,
    assignedUser: task.assignedUser || null,
    _count: task._count || { attachments: 0, comments: 0 },
  });
};

/**
 * Helper to emit notification when a task status is updated
 * @param {object} payload - { taskId, fromStatus, toStatus, updatedBy }
 */
const emitStatusUpdate = (payload) => {
  if (!io) return;
  console.log(`[Socket] Broadcasting status update for task: ${payload.taskId}`);
  io.emit('task_status_updated', payload);
};

/**
 * Helper to emit notification when a task assignee changes
 * @param {object} payload - { taskId, task, assignedUserId }
 */
const emitTaskAssigned = (payload) => {
  if (!io) return;
  console.log(`[Socket] Broadcasting task assignment for task: ${payload.taskId}`);
  io.emit('task_assigned', payload);
};

/**
 * Helper to emit notification when a new comment is added
 * @param {object} payload - { taskId, comment }
 */
const emitNewComment = (payload) => {
  if (!io) return;
  console.log(`[Socket] Broadcasting new comment for task: ${payload.taskId}`);
  io.emit('new_comment', payload);
};

/**
 * Helper to emit a notification to a specific user room
 * @param {object} notification - Notification database object
 */
const emitNewNotification = (notification) => {
  if (!io) return;
  console.log(`[Socket] Broadcasting notification to room: user_${notification.userId}`);
  io.to(`user_${notification.userId}`).emit('new_notification', notification);
};

module.exports = {
  initSocket,
  getIO,
  emitNewInquiry,
  emitStatusUpdate,
  emitTaskAssigned,
  emitNewComment,
  emitNewNotification,
};
