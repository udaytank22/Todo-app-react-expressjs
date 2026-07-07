const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('../utils/encryption');


const JWT_SECRET = process.env.JWT_SECRET;

let io = null;

/**
 * Initialize Socket.IO on the HTTP server.
 *
 * Phase 1 changes:
 *  - Conditionally attaches Redis adapter when pub/sub clients are provided.
 *    Falls back to the default in-memory adapter when Redis is unavailable.
 *  - Authenticates every WebSocket connection with the JWT token supplied in
 *    socket.handshake.auth.token (or query.token for legacy clients).
 *  - Auto-joins each authenticated socket to its private user room so targeted
 *    notifications work correctly across multiple server instances.
 *
 * @param {object} server   - Node.js HTTP server instance
 * @param {object|null} pubClient - Connected Redis publish client (or null)
 * @param {object|null} subClient - Connected Redis subscribe client (or null)
 * @returns {Server} Initialized Socket.IO server
 */
const initSocket = (server, pubClient = null, subClient = null) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
    // Prefer WebSocket transport; fall back to polling if needed
    transports: ['websocket', 'polling'],
  });

  // ── Redis Adapter (Phase 1) ───────────────────────────────────────────────
  // Attach only when both Redis clients are connected. This lets every server
  // instance share Socket.IO rooms, enabling horizontal scaling.
  if (pubClient && subClient) {
    const { createAdapter } = require('@socket.io/redis-adapter');
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Socket.IO] Redis adapter attached — cross-instance rooms enabled.');
  } else {
    console.log('[Socket.IO] Using in-memory adapter (Redis unavailable — single-instance mode).');
  }

  // ── JWT Authentication Middleware (Phase 1) ───────────────────────────────
  // Reject unauthenticated socket connections before they can join any room.
  io.use((socket, next) => {
    // Accept token from handshake.auth (preferred) or query string (legacy)
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required. Provide a JWT token in socket.handshake.auth.token.'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // Attach user metadata to the socket for use in event handlers
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userName = decoded.name;
      socket.isMobile = socket.handshake.auth?.device === 'mobile' || socket.handshake.query?.device === 'mobile';
      next();
    } catch (err) {
      next(new Error('Invalid or expired token. Please log in again.'));
    }
  });

  // ── Connection Handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id} (userId: ${socket.userId}, role: ${socket.userRole}, isMobile: ${!!socket.isMobile})`);

    // Auto-join the authenticated user's private room so targeted notifications
    // (new_notification events) are delivered without a separate 'join' call.
    if (socket.isMobile) {
      socket.join(`user_${socket.userId}_mobile`);
      socket.join(`role_${socket.userRole}_mobile`);
      console.log(`[Socket.IO] Socket joined mobile rooms: user_${socket.userId}_mobile, role_${socket.userRole}_mobile`);
    } else {
      socket.join(`user_${socket.userId}`);
      socket.join(`role_${socket.userRole}`);
    }

    // Keep backward compatibility with clients that still emit 'join' explicitly.
    // Explicit joins from clients are ignored in favor of the JWT derived ID.
    socket.on('join', () => {
      console.log(`[Socket.IO] Ignored client-supplied join for ${socket.id}. Auto-joined from token instead.`);
    });

    socket.on('send_direct_message', async (data) => {
      let payload = data;
      if (socket.isMobile && data && data.encryptedData) {
        const decrypted = decrypt(data.encryptedData);
        if (decrypted) {
          try {
            payload = JSON.parse(decrypted);
          } catch (e) {
            console.error('[Socket.IO] Failed to parse decrypted send_direct_message payload:', e.message);
            return;
          }
        } else {
          console.error('[Socket.IO] Failed to decrypt send_direct_message payload.');
          return;
        }
      }

      const { receiverId, content } = payload;
      if (!receiverId || !content || !content.trim()) return;

      try {
        const { prisma } = require('./db');
        const message = await prisma.directMessage.create({
          data: {
            senderId: socket.userId,
            receiverId,
            content: content.trim(),
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // Emit to web clients (unencrypted)
        io.to(`user_${socket.userId}`).to(`user_${receiverId}`).emit('receive_direct_message', message);

        // Emit to mobile clients (encrypted)
        const encryptedMessage = { encryptedData: encrypt(JSON.stringify(message)) };
        io.to(`user_${socket.userId}_mobile`).to(`user_${receiverId}_mobile`).emit('receive_direct_message', encryptedMessage);

        // Also create a Notification for the receiver
        const notification = await prisma.notification.create({
          data: {
            userId: receiverId,
            type: 'DIRECT_MESSAGE',
            title: `New message from ${message.sender.name}`,
            message: content.trim(),
            relatedId: message.id,
          },
        });

        io.to(`user_${receiverId}`).emit('new_notification', notification);
        const encNotification = { encryptedData: encrypt(JSON.stringify(notification)) };
        io.to(`user_${receiverId}_mobile`).emit('new_notification', encNotification);

      } catch (error) {
        console.error('[Socket.IO] Failed to process send_direct_message:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} — reason: ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket.IO] Socket error on ${socket.id}:`, err.message);
    });
  });

  return io;
};

/**
 * Returns the active Socket.IO server instance.
 * Throws if called before initSocket().
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO is not initialized. Call initSocket() first.');
  }
  return io;
};

// ── Event Emitter Helpers ─────────────────────────────────────────────────────
// All helpers guard against being called before initSocket() via `if (!io) return`.

/**
 * Helper to encrypt socket payload if it is an object
 */
const encryptPayload = (data) => {
  return { encryptedData: encrypt(JSON.stringify(data)) };
};

/**
 * Broadcast a new inquiry/task to all connected clients.
 * @param {object} task
 */
const emitNewInquiry = (task) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting new_inquiry: ${task.inquiryId} to admins, managers, and assignee`);

  const payload = {
    id: task.id,
    inquiryId: task.inquiryId,
    subject: task.subject,
    customerName: task.customerName,
    senderEmail: task.senderEmail,
    description: task.description || '',
    status: task.status || 'PENDING',
    priority: task.priority || 'MEDIUM',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt || task.createdAt,
    assignedUserId: task.assignedUserId || null,
    assignedUser: task.assignedUser || null,
    _count: task._count || { attachments: 0, comments: 0 },
  };

  // Web clients (unencrypted)
  io.to('role_ADMIN').to('role_MANAGER').emit('new_inquiry', payload);
  if (task.assignedUserId) {
    io.to(`user_${task.assignedUserId}`).emit('new_inquiry', payload);
  }

  // Mobile clients (encrypted)
  const encPayload = encryptPayload(payload);
  io.to('role_ADMIN_mobile').to('role_MANAGER_mobile').emit('new_inquiry', encPayload);
  if (task.assignedUserId) {
    io.to(`user_${task.assignedUserId}_mobile`).emit('new_inquiry', encPayload);
  }
};

/**
 * Broadcast a task status change to scoped clients.
 * @param {object} payload - { taskId, fromStatus, toStatus, updatedBy, assignedUserId }
 */
const emitStatusUpdate = (payload) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting task_status_updated for task: ${payload.taskId}`);

  // Web clients (unencrypted)
  io.to('role_ADMIN').to('role_MANAGER').emit('task_status_updated', payload);
  if (payload.assignedUserId) {
    io.to(`user_${payload.assignedUserId}`).emit('task_status_updated', payload);
  }

  // Mobile clients (encrypted)
  const encPayload = encryptPayload(payload);
  io.to('role_ADMIN_mobile').to('role_MANAGER_mobile').emit('task_status_updated', encPayload);
  if (payload.assignedUserId) {
    io.to(`user_${payload.assignedUserId}_mobile`).emit('task_status_updated', encPayload);
  }
};

/**
 * Broadcast a task assignment change to scoped clients.
 * @param {object} payload - { taskId, task, assignedUserId, recipientIds }
 */
const emitTaskAssigned = (payload) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting task_assigned for task: ${payload.taskId}`);

  // Web clients (unencrypted)
  io.to('role_ADMIN').to('role_MANAGER').emit('task_assigned', payload);
  if (payload.assignedUserId) {
    io.to(`user_${payload.assignedUserId}`).emit('task_assigned', payload);
  }
  if (payload.recipientIds && payload.recipientIds.length > 0) {
    payload.recipientIds.forEach(id => {
      io.to(`user_${id}`).emit('task_assigned', payload);
    });
  }

  // Mobile clients (encrypted)
  const encPayload = encryptPayload(payload);
  io.to('role_ADMIN_mobile').to('role_MANAGER_mobile').emit('task_assigned', encPayload);
  if (payload.assignedUserId) {
    io.to(`user_${payload.assignedUserId}_mobile`).emit('task_assigned', encPayload);
  }
  if (payload.recipientIds && payload.recipientIds.length > 0) {
    payload.recipientIds.forEach(id => {
      io.to(`user_${id}_mobile`).emit('task_assigned', encPayload);
    });
  }
};

/**
 * Broadcast a new comment to scoped clients.
 * @param {object} payload - { taskId, comment, assignedUserId }
 */
const emitNewComment = (payload) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting new_comment for task: ${payload.taskId}`);

  // Web clients (unencrypted)
  io.to('role_ADMIN').to('role_MANAGER').emit('new_comment', payload);
  if (payload.assignedUserId) {
    io.to(`user_${payload.assignedUserId}`).emit('new_comment', payload);
  }

  // Mobile clients (encrypted)
  const encPayload = encryptPayload(payload);
  io.to('role_ADMIN_mobile').to('role_MANAGER_mobile').emit('new_comment', encPayload);
  if (payload.assignedUserId) {
    io.to(`user_${payload.assignedUserId}_mobile`).emit('new_comment', encPayload);
  }
};

/**
 * Send a notification to a specific user's private room only.
 * With the Redis adapter this works across multiple server instances.
 * @param {object} notification - Notification DB record (must have userId)
 */
const emitNewNotification = (notification) => {
  if (!io) return;
  console.log(`[Socket.IO] Emitting new_notification to room: user_${notification.userId}`);

  // Web clients (unencrypted)
  io.to(`user_${notification.userId}`).emit('new_notification', notification);

  // Mobile clients (encrypted)
  const encPayload = encryptPayload(notification);
  io.to(`user_${notification.userId}_mobile`).emit('new_notification', encPayload);
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
