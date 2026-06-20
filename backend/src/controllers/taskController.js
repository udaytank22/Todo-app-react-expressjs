const path = require('path');
const fs = require('fs');
const { prisma, prismaRead } = require('../services/db');
const { cache } = require('../services/cache');
const { emitNewInquiry, emitStatusUpdate, emitTaskAssigned, emitNewComment, emitNewNotification } = require('../services/socket');
const { extractTextFromPDF, extractTextFromExcel } = require('../services/gemini');
const { isConnected, fetchEmails } = require('../services/outlook');
const { generateInquiryId } = require('../utils/idGenerator');
const { findAssignedUser } = require('../utils/assignmentEngine');

/**
 * Helper to create and broadcast a notification to a specific user
 */
const createAndEmitNotification = async (userId, type, title, message, relatedId) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedId,
      },
    });
    emitNewNotification(notification);
    return notification;
  } catch (error) {
    console.error(`Failed to create/emit notification for user ${userId}:`, error);
  }
};

/**
 * Batch-create notifications for multiple users and emit via socket
 */
const createAndEmitNotificationsBatch = async (userIds, type, title, message, relatedId) => {
  if (!userIds || userIds.length === 0) return;
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: uniqueUserIds.map(userId => ({
        userId,
        type,
        title,
        message,
        relatedId,
      })),
    });
    const notifications = await prisma.notification.findMany({
      where: { relatedId, type, userId: { in: uniqueUserIds } },
      orderBy: { createdAt: 'desc' },
      take: uniqueUserIds.length,
    });
    for (const notif of notifications) {
      emitNewNotification(notif);
    }
  } catch (error) {
    console.error('Failed to batch create notifications:', error);
  }
};

/**
 * Get all tasks with sorting, search, and filters
 */
const getAllTasks = async (req, res) => {
  const {
    status, priority, search, customer,
    sortBy = 'createdAt', sortOrder = 'desc',
    page = '1', limit = '50',
  } = req.query;

  try {
    const cacheKey = `tasks:list:${req.user.role}:${req.user.id}:${Buffer.from(JSON.stringify(req.query)).toString('base64')}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // --- Build Prisma WHERE clause (SQL-level filtering) ---
    const where = {};

    if (req.user.role === 'STAFF') {
      where.assignedUserId = req.user.id;
    }
    if (status) {
      where.status = status.toUpperCase();
    }
    if (priority) {
      where.priority = priority.toUpperCase();
    }
    if (customer) {
      where.customerName = { contains: customer, mode: 'insensitive' };
    }
    if (search) {
      const tsquery = search.trim().split(/\s+/).join(' | ');
      where.OR = [
        { subject: { search: tsquery } },
        { description: { search: tsquery } },
        { customerName: { search: tsquery } },
        { senderEmail: { search: tsquery } },
        { inquiryId: { search: tsquery } },
      ];
    }

    // --- Pagination ---
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // --- Sorting (validate allowed columns) ---
    const allowedSortFields = ['createdAt', 'updatedAt', 'subject', 'customerName', 'priority', 'status', 'dueDate', 'inquiryId'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    // --- Fetch live Outlook emails if conditions are met ---
    let liveEmails = [];
    if (
      req.user.role !== 'STAFF' &&
      isConnected() &&
      !status && !priority && !search && !customer
    ) {
      const cachedLiveEmails = await cache.get('live_emails');
      if (cachedLiveEmails) {
        liveEmails = cachedLiveEmails;
      } else {
        try {
          const emails = await fetchEmails();
          const emailIds = emails.map(e => Buffer.from(e.messageId).toString('hex'));

          // Find existing tasks in the database with these hex IDs
          const existingTasks = await prismaRead.task.findMany({
            where: { id: { in: emailIds } },
            select: { id: true },
          });
        const existingTaskIds = new Set(existingTasks.map(t => t.id));

        // Filter out emails that are already persisted
        const unpersistedEmails = emails.filter(e => {
          const hexId = Buffer.from(e.messageId).toString('hex');
          return !existingTaskIds.has(hexId);
        });

        liveEmails = unpersistedEmails.map((email, index) => {
          const inqRegex = /INQ-\d+/i;
          const subjectMatch = email.subject ? email.subject.match(inqRegex) : null;
          const bodyMatch = email.body ? email.body.match(inqRegex) : null;
          const inquiryId = subjectMatch ? subjectMatch[0].toUpperCase() : (bodyMatch ? bodyMatch[0].toUpperCase() : `INQ-LIVE-${index + 1}`);

          return {
            id: Buffer.from(email.messageId).toString('hex'),
            inquiryId,
            subject: email.subject,
            customerName: email.senderName,
            senderEmail: email.senderEmail,
            description: email.body,
            status: 'NEW_EMAIL',
            priority: 'MEDIUM',
            dueDate: null,
            externalLink: null,
            remarks: null,
            createdAt: email.receivedAt,
            updatedAt: email.receivedAt,
            assignedUserId: null,
            assignedUser: null,
            _count: {
              attachments: email.attachments ? email.attachments.length : 0,
              comments: 0
            }
          };
        });

        // Cache live emails for 30s
        await cache.set('live_emails', liveEmails, 30);
      } catch (err) {
        console.error('Error fetching live emails in getAllTasks:', err.message);
      }
      }
    }

    // --- Pagination math for combined list ---
    const L = liveEmails.length;
    const startIdx = (pageNum - 1) * limitNum;
    const endIdx = pageNum * limitNum;

    let pageLiveEmails = [];
    let dbSkip = 0;
    let dbTake = limitNum;

    if (startIdx < L) {
      pageLiveEmails = liveEmails.slice(startIdx, Math.min(endIdx, L));
      const takenL = pageLiveEmails.length;
      dbSkip = 0;
      dbTake = limitNum - takenL;
    } else {
      pageLiveEmails = [];
      dbSkip = startIdx - L;
      dbTake = limitNum;
    }

    // --- Query Database ---
    let dbTasks = [];
    let total = 0;

    if (dbTake > 0) {
      const [dbTotal, queryTasks] = await Promise.all([
        prismaRead.task.count({ where }),
        prismaRead.task.findMany({
          where,
          include: {
            assignedUser: {
              select: { id: true, name: true, email: true, role: true },
            },
            _count: {
              select: { attachments: true, comments: true },
            },
          },
          orderBy: { [safeSortBy]: safeSortOrder },
          skip: dbSkip,
          take: dbTake,
        }),
      ]);
      total = dbTotal;
      dbTasks = queryTasks;
    } else {
      total = await prismaRead.task.count({ where });
    }

    const totalCombined = total + L;
    const responseData = {
      data: [...pageLiveEmails, ...dbTasks],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCombined,
        totalPages: Math.ceil(totalCombined / limitNum),
      },
    };

    // Cache the paginated result for 30s
    await cache.set(cacheKey, responseData, 30);

    return res.json(responseData);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return res.status(500).json({ error: 'Server error fetching tasks.' });
  }
};

/**
 * Get a single task/inquiry by ID
 */
const getTaskById = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Try finding in the database first
    const task = await prismaRead.task.findUnique({
      where: { id },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        attachments: true,
        email: true,
        comments: {
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (task) {
      if (req.user.role === 'STAFF' && task.assignedUserId !== req.user.id) {
        return res.status(403).json({ error: 'Access Denied: You are not authorized to view this inquiry.' });
      }
      return res.json(task);
    }

    // 2. If not found in database, check if it's a live Outlook message (Only for Admin/Manager roles)
    if (req.user.role !== 'STAFF' && isConnected()) {
      const emails = await fetchEmails();

      // Decode hex ID back to raw messageId
      let decodedId = id;
      try {
        if (/^[0-9a-fA-F]+$/.test(id) && id.length > 36) {
          decodedId = Buffer.from(id, 'hex').toString('utf-8');
        }
      } catch (err) {
        // ignore
      }

      const matchedEmail = emails.find(e => e.messageId === decodedId);
      if (matchedEmail) {
        return res.json({
          id: Buffer.from(matchedEmail.messageId).toString('hex'),
          inquiryId: `INQ-LIVE`,
          subject: matchedEmail.subject,
          customerName: matchedEmail.senderName,
          senderEmail: matchedEmail.senderEmail,
          description: matchedEmail.body,
          status: 'NEW_EMAIL',
          priority: 'MEDIUM',
          dueDate: null,
          externalLink: null,
          remarks: null,
          aiSummary: null,
          createdAt: matchedEmail.receivedAt,
          updatedAt: matchedEmail.receivedAt,
          assignedUser: null,
          attachments: matchedEmail.attachments ? matchedEmail.attachments.map((att) => ({
            id: Buffer.from(JSON.stringify({ m: matchedEmail.messageId, a: att.id })).toString('hex'),
            filename: att.filename,
            fileType: att.filename.toLowerCase().endsWith('.pdf') ? 'PDF' : ((att.filename.toLowerCase().endsWith('.xlsx') || att.filename.toLowerCase().endsWith('.xls')) ? 'EXCEL' : 'OTHER'),
            fileSize: att.fileSize,
            createdAt: matchedEmail.receivedAt,
          })) : [],
          comments: [],
          statusHistory: [],
        });
      }
    }

    return res.status(404).json({ error: 'Task / Inquiry not found.' });
  } catch (error) {
    console.error('Fetch task details error:', error);
    return res.status(500).json({ error: 'Server error fetching task details.' });
  }
};

/**
 * Create a task/inquiry manually
 */
const createTask = async (req, res) => {
  const { subject, customerName, senderEmail, description, status, priority, dueDate, externalLink, remarks, assignedUserId } = req.body;

  if (!subject || !customerName || !description) {
    return res.status(400).json({ error: 'Subject, Customer Name, and Description are required.' });
  }

  try {
    const inquiryId = await generateInquiryId();

    // Auto-assign if rule matches and no assignee is provided manually
    let finalAssignedUserId = assignedUserId || null;
    if (!finalAssignedUserId && senderEmail) {
      finalAssignedUserId = await findAssignedUser(senderEmail, customerName);
    }

    const task = await prisma.task.create({
      data: {
        inquiryId,
        subject,
        customerName,
        senderEmail: senderEmail || 'manual@system.com',
        description,
        status: (status || 'NEW_EMAIL').toUpperCase(),
        priority: (priority || 'MEDIUM').toUpperCase(),
        dueDate: dueDate ? new Date(dueDate) : null,
        externalLink: externalLink || null,
        remarks: remarks || null,
        assignedUserId: finalAssignedUserId,
      },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Write initial status history log
    await prisma.statusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: 'NONE',
        toStatus: task.status,
        changedById: req.user.id,
      },
    });

    emitNewInquiry(task);

    // Create persistent notifications
    try {
      if (task.assignedUserId && task.assignedUserId !== req.user.id) {
        await createAndEmitNotification(
          task.assignedUserId,
          'ASSIGNMENT',
          'New Inquiry Assigned',
          `You have been assigned inquiry ${task.inquiryId}: ${task.subject}`,
          task.id
        );
      }
      const adminsAndManagers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'MANAGER'] },
          id: { not: req.user.id },
        },
        select: { id: true },
      });
      const recipientIds = adminsAndManagers.map(r => r.id);
      await createAndEmitNotificationsBatch(
        recipientIds,
        'NEW_INQUIRY',
        'New Inquiry Created',
        `New inquiry ${task.inquiryId} created by ${req.user.name}`,
        task.id
      );
    } catch (notifError) {
      console.error('Failed to create notifications for manual task:', notifError);
    }

    // Invalidating list cache
    await cache.invalidate('tasks:list:*');

    return res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Server error creating task.' });
  }
};

/**
 * Ensures a task exists in the database. If it is a live Outlook email,
 * it automatically imports it, including its attachments.
 */
const ensureLiveEmailPersisted = async (id, reqUser) => {
  // 1. Check if task already exists in the database
  let task = await prisma.task.findUnique({
    where: { id },
    select: { status: true, assignedUserId: true },
  });

  if (task) {
    return task;
  }

  // 2. If it is a live Outlook email, persist it
  if (isConnected()) {
    const emails = await fetchEmails();

    // Decode hex ID back to raw messageId
    let decodedId = id;
    try {
      if (/^[0-9a-fA-F]+$/.test(id) && id.length > 36) {
        decodedId = Buffer.from(id, 'hex').toString('utf-8');
      }
    } catch (err) {
      // ignore
    }

    const matchedEmail = emails.find(e => e.messageId === decodedId);
    if (matchedEmail) {
      console.log(`[Auto Persist] Live email matched! Persisting email and task to database...`);

      // Create Email record
      let emailRecord = await prisma.email.findUnique({
        where: { messageId: matchedEmail.messageId }
      });
      if (!emailRecord) {
        emailRecord = await prisma.email.create({
          data: {
            messageId: matchedEmail.messageId,
            subject: matchedEmail.subject || '(No Subject)',
            senderEmail: matchedEmail.senderEmail,
            senderName: matchedEmail.senderName,
            body: matchedEmail.body || '',
            receivedAt: matchedEmail.receivedAt,
            processedStatus: 'PROCESSED',
          }
        });
      }

      // Generate custom inquiry ID
      const inquiryId = await generateInquiryId();

      // Auto-assign rule check on database persistence
      const matchedUserId = await findAssignedUser(matchedEmail.senderEmail, matchedEmail.senderName);

      // Create Task record
      const newTask = await prisma.task.create({
        data: {
          id, // Use the same hex-encoded messageId as key to preserve frontend routing/URLs
          inquiryId,
          subject: matchedEmail.subject || '(No Subject)',
          customerName: matchedEmail.senderName,
          senderEmail: matchedEmail.senderEmail,
          description: matchedEmail.body || '',
          status: 'NEW_EMAIL',
          priority: 'MEDIUM',
          emailId: emailRecord.id,
          assignedUserId: matchedUserId || null,
          createdAt: matchedEmail.receivedAt,
          updatedAt: matchedEmail.receivedAt,
        }
      });

      // Notification for auto-assignment if matched
      if (matchedUserId) {
        try {
          await createAndEmitNotification(
            matchedUserId,
            'ASSIGNMENT',
            'New Inquiry Automatically Assigned',
            `You have been assigned inquiry ${newTask.inquiryId}: ${newTask.subject}`,
            newTask.id
          );
        } catch (notifErr) {
          console.error('Failed to create assignment notification in ensureLiveEmailPersisted:', notifErr);
        }
      }

      // Write initial status history log
      await prisma.statusHistory.create({
        data: {
          taskId: newTask.id,
          fromStatus: 'NONE',
          toStatus: 'NEW_EMAIL',
          changedById: reqUser.id,
        }
      });

      // Download and save attachments to disk and DB
      if (matchedEmail.attachments && matchedEmail.attachments.length > 0) {
        const { fetchLiveAttachment } = require('../services/outlook');
        for (const att of matchedEmail.attachments) {
          try {
            const attData = await fetchLiveAttachment(matchedEmail.messageId, att.id);
            const buffer = Buffer.from(attData.contentBytes, 'base64');

            // Generate filename and save to uploads folder
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path.extname(attData.name) || '';
            const filename = uniqueSuffix + ext;
            const uploadDir = path.join(__dirname, '../../uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path.join(uploadDir, filename);
            // ✅ Phase 1: Non-blocking async write — does not block the event loop
            await fs.promises.writeFile(filePath, buffer);

            // Save attachment metadata in DB
            await prisma.attachment.create({
              data: {
                filename: attData.name,
                filePath: `uploads/${filename}`,
                fileType: attData.name.toLowerCase().endsWith('.pdf') ? 'PDF' : ((attData.name.toLowerCase().endsWith('.xlsx') || attData.name.toLowerCase().endsWith('.xls')) ? 'EXCEL' : 'OTHER'),
                fileSize: attData.size,
                taskId: newTask.id,
              }
            });
          } catch (attErr) {
            console.error(`[Auto Persist] Failed to save attachment ${att.filename || 'unknown'} for task ${newTask.inquiryId}:`, attErr.message);
          }
        }
      }

      return newTask;
    }
  }

  return null;
};

/**
 * Update task details
 */
const updateTask = async (req, res) => {
  const { id } = req.params;
  const { subject, customerName, senderEmail, description, status, priority, dueDate, externalLink, remarks, assignedUserId } = req.body;

  try {
    // Ensure task exists in database (auto-persisting live email if needed)
    const currentTask = await ensureLiveEmailPersisted(id, req.user);

    if (!currentTask) {
      return res.status(404).json({ error: 'Task / Inquiry not found.' });
    }

    if (req.user.role === 'STAFF' && currentTask.assignedUserId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You are not authorized to modify this inquiry.' });
    }

    // Only administrators can change the priority
    if (priority && priority.toUpperCase() !== currentTask.priority) {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access Denied: Only administrators can change the priority.' });
      }
    }

    // Staff cannot change task assignment
    if (assignedUserId !== undefined) {
      const targetAssigneeId = assignedUserId || null;
      if (targetAssigneeId !== currentTask.assignedUserId) {
        if (req.user.role === 'STAFF') {
          return res.status(403).json({ error: 'Access Denied: Staff members are not authorized to change task assignment.' });
        }
      }
    }

    const nextStatus = status ? status.toUpperCase() : currentTask.status;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        subject,
        customerName,
        senderEmail,
        description,
        status: nextStatus,
        priority: priority ? priority.toUpperCase() : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        externalLink,
        remarks,
        assignedUserId: assignedUserId || null,
      },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { attachments: true, comments: true },
        },
      },
    });

    // Log status change if it is different
    if (nextStatus !== currentTask.status) {
      await prisma.statusHistory.create({
        data: {
          taskId: id,
          fromStatus: currentTask.status,
          toStatus: nextStatus,
          changedById: req.user.id,
        },
      });

      emitStatusUpdate({
        taskId: id,
        fromStatus: currentTask.status,
        toStatus: nextStatus,
        updatedBy: req.user.name,
      });

      // Create notifications for status change
      try {
        const adminsAndManagers = await prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'MANAGER'] },
            id: { not: req.user.id },
          },
          select: { id: true },
        });
        const recipientIds = adminsAndManagers.map(r => r.id);
        // Include assignee if different from current user
        if (updatedTask.assignedUserId && updatedTask.assignedUserId !== req.user.id && !recipientIds.includes(updatedTask.assignedUserId)) {
          recipientIds.push(updatedTask.assignedUserId);
        }
        await createAndEmitNotificationsBatch(
          recipientIds,
          'STATUS_UPDATE',
          'Inquiry Status Updated',
          `Inquiry ${updatedTask.inquiryId} status updated to ${nextStatus} by ${req.user.name}`,
          id
        );
      } catch (notifErr) {
        console.error('Failed to create status change notifications:', notifErr);
      }
    }

    // Broadcast assignee change if it changed
    const targetAssigneeId = assignedUserId !== undefined ? (assignedUserId || null) : currentTask.assignedUserId;
    if (targetAssigneeId !== currentTask.assignedUserId) {
      emitTaskAssigned({
        taskId: id,
        task: updatedTask,
        assignedUserId: targetAssigneeId
      });

      // Create notification for assignment
      try {
        if (targetAssigneeId && targetAssigneeId !== req.user.id) {
          await createAndEmitNotification(
            targetAssigneeId,
            'ASSIGNMENT',
            'New Inquiry Assigned',
            `You have been assigned inquiry ${updatedTask.inquiryId}: ${updatedTask.subject}`,
            id
          );
        }
      } catch (notifErr) {
        console.error('Failed to create assignment notification:', notifErr);
      }
    }

    // Invalidate caches
    await cache.invalidate('tasks:list:*');
    await cache.invalidate(`task:${id}`);

    return res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Server error updating task.' });
  }
};

/**
 * Update task status (primarily for Kanban drag-and-drop actions)
 */
const updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  const targetStatus = status.toUpperCase();

  try {
    // Ensure task exists in database (auto-persisting live email if needed)
    const currentTask = await ensureLiveEmailPersisted(id, req.user);

    if (!currentTask) {
      return res.status(404).json({ error: 'Task / Inquiry not found.' });
    }

    if (req.user.role === 'STAFF' && currentTask.assignedUserId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You are not authorized to update status for this inquiry.' });
    }

    if (currentTask.status === targetStatus) {
      return res.json({ message: 'Status is already set to target status.', status: targetStatus });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: targetStatus },
    });

    // Create status change history
    await prisma.statusHistory.create({
      data: {
        taskId: id,
        fromStatus: currentTask.status,
        toStatus: targetStatus,
        changedById: req.user.id,
      },
    });

    emitStatusUpdate({
      taskId: id,
      inquiryId: currentTask.inquiryId,
      subject: currentTask.subject,
      fromStatus: currentTask.status,
      toStatus: targetStatus,
      updatedBy: req.user.name,
    });

    // Create notifications for status change
    try {
      const adminsAndManagers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'MANAGER'] },
          id: { not: req.user.id },
        },
        select: { id: true },
      });
      const recipientIds = adminsAndManagers.map(r => r.id);
      if (currentTask.assignedUserId && currentTask.assignedUserId !== req.user.id && !recipientIds.includes(currentTask.assignedUserId)) {
        recipientIds.push(currentTask.assignedUserId);
      }
      await createAndEmitNotificationsBatch(
        recipientIds,
        'STATUS_UPDATE',
        'Inquiry Status Updated',
        `Inquiry ${currentTask.inquiryId} status updated to ${targetStatus} by ${req.user.name}`,
        id
      );
    } catch (notifErr) {
      console.error('Failed to create status change notifications in updateTaskStatus:', notifErr);
    }

    // Invalidate caches
    await cache.invalidate('tasks:list:*');
    await cache.invalidate(`task:${id}`);

    return res.json(updatedTask);
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Server error updating status.' });
  }
};

/**
 * Delete a task
 */
const deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.role === 'STAFF') {
      return res.status(403).json({ error: 'Access Denied: Staff members are not authorized to delete inquiries.' });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task / Inquiry not found.' });
    }

    // Delete local files referenced by attachments
    for (const att of task.attachments) {
      const fullPath = path.resolve(att.filePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.error(`Failed to delete file: ${fullPath}`, err.message);
        }
      }
    }

    await prisma.task.delete({ where: { id } });

    // Invalidate caches
    await cache.invalidate('tasks:list:*');
    await cache.invalidate(`task:${id}`);

    return res.json({ message: 'Task and all related items deleted successfully.' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ error: 'Server error deleting task.' });
  }
};

/**
 * Add a comment to a task
 */
const addComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Comment content is required.' });
  }

  try {
    // Ensure task exists in database (auto-persisting live email if needed)
    const task = await ensureLiveEmailPersisted(id, req.user);

    if (!task) {
      return res.status(404).json({ error: 'Task / Inquiry not found.' });
    }

    if (req.user.role === 'STAFF' && task.assignedUserId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You are not authorized to comment on this inquiry.' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: id,
        userId: req.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // Fetch task details (subject, inquiryId) to enrich the socket notification payload
    const taskDetails = await prisma.task.findUnique({
      where: { id },
      select: { inquiryId: true, subject: true, assignedUserId: true },
    });

    emitNewComment({
      taskId: id,
      comment,
      assignedUserId: taskDetails ? taskDetails.assignedUserId : task.assignedUserId,
      inquiryId: taskDetails ? taskDetails.inquiryId : 'INQ-LIVE',
      subject: taskDetails ? taskDetails.subject : '(No Subject)',
    });

    // Create notifications for comment
    try {
      const targetAssigneeId = taskDetails ? taskDetails.assignedUserId : task.assignedUserId;
      const inquiryIdVal = taskDetails ? taskDetails.inquiryId : 'INQ-LIVE';

      const adminsAndManagers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'MANAGER'] },
          id: { not: req.user.id },
        },
        select: { id: true },
      });
      const recipientIds = adminsAndManagers.map(r => r.id);
      if (targetAssigneeId && targetAssigneeId !== req.user.id && !recipientIds.includes(targetAssigneeId)) {
        recipientIds.push(targetAssigneeId);
      }
      await createAndEmitNotificationsBatch(
        recipientIds,
        'NEW_COMMENT',
        'New Comment on Inquiry',
        `${req.user.name} commented: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}" on inquiry ${inquiryIdVal}`,
        id
      );
    } catch (notifErr) {
      console.error('Failed to create notifications for comment:', notifErr);
    }

    // Invalidate caches
    await cache.invalidate('tasks:list:*');
    await cache.invalidate(`task:${id}`);

    return res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json({ error: 'Server error adding comment.' });
  }
};

/**
 * Add an attachment to a task
 */
const addAttachment = async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'File attachment is required.' });
  }

  try {
    // Ensure task exists in database (auto-persisting live email if needed)
    const task = await ensureLiveEmailPersisted(id, req.user);

    if (!task) {
      return res.status(404).json({ error: 'Task / Inquiry not found.' });
    }

    if (req.user.role === 'STAFF' && task.assignedUserId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You are not authorized to add attachments to this inquiry.' });
    }

    const isPDF = file.originalname.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf';
    const isExcel = file.originalname.toLowerCase().endsWith('.xlsx') || file.originalname.toLowerCase().endsWith('.xls') || file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel');

    let fileType = 'OTHER';
    if (isPDF) fileType = 'PDF';
    else if (isExcel) fileType = 'EXCEL';

    const { uploadFile } = require('../services/storage');
    // Multer now uses memoryStorage, so file.buffer is the file content
    const filePath = await uploadFile(file.buffer, file.originalname);

    const attachment = await prisma.attachment.create({
      data: {
        filename: file.originalname,
        filePath: filePath,
        fileType,
        fileSize: file.size,
        taskId: id,
      },
    });

    // Invalidate caches
    await cache.invalidate('tasks:list:*');
    await cache.invalidate(`task:${id}`);

    return res.status(201).json(attachment);
  } catch (error) {
    console.error('Add attachment error:', error);
    return res.status(500).json({ error: 'Server error uploading attachment.' });
  }
};

/**
 * View or download an attachment
 */
const getAttachmentFile = async (req, res) => {
  const { attachmentId } = req.params;

  try {
    // 1. Check if it's an encoded live attachment ID (hex encoded JSON containing messageId and attachmentId)
    let liveInfo = null;
    try {
      if (/^[0-9a-fA-F]+$/.test(attachmentId) && attachmentId.length > 36) {
        const jsonStr = Buffer.from(attachmentId, 'hex').toString('utf-8');
        const obj = JSON.parse(jsonStr);
        if (obj.m && obj.a) {
          liveInfo = { messageId: obj.m, attachmentId: obj.a };
        }
      }
    } catch (e) {
      // ignore
    }

    if (liveInfo) {
      const { fetchLiveAttachment } = require('../services/outlook');
      const attData = await fetchLiveAttachment(liveInfo.messageId, liveInfo.attachmentId);

      const fileBuffer = Buffer.from(attData.contentBytes, 'base64');
      res.setHeader('Content-Type', attData.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attData.name)}"`);
      return res.send(fileBuffer);
    }

    // 2. Database fallback
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    const { getFileUrl } = require('../services/storage');
    const url = await getFileUrl(attachment.filePath);
    return res.redirect(url);
  } catch (error) {
    console.error('Fetch attachment file error:', error);
    return res.status(500).json({ error: 'Server error fetching attachment file.' });
  }
};

/**
 * Parse a PDF or Excel attachment and return its text/table representation
 */
const parseAttachment = async (req, res) => {
  const { attachmentId } = req.params;

  try {
    // 1. Check if it's an encoded live attachment ID
    let liveInfo = null;
    try {
      if (/^[0-9a-fA-F]+$/.test(attachmentId) && attachmentId.length > 36) {
        const jsonStr = Buffer.from(attachmentId, 'hex').toString('utf-8');
        const obj = JSON.parse(jsonStr);
        if (obj.m && obj.a) {
          liveInfo = { messageId: obj.m, attachmentId: obj.a };
        }
      }
    } catch (e) {
      // ignore
    }

    let buffer;
    let filename;
    let fileType;

    if (liveInfo) {
      const { fetchLiveAttachment } = require('../services/outlook');
      const attData = await fetchLiveAttachment(liveInfo.messageId, liveInfo.attachmentId);
      buffer = Buffer.from(attData.contentBytes, 'base64');
      filename = attData.name;
      fileType = filename.toLowerCase().endsWith('.pdf') ? 'PDF' : ((filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) ? 'EXCEL' : 'OTHER');
    } else {
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
      });

      if (!attachment) {
        return res.status(404).json({ error: 'Attachment not found.' });
      }

      const { getFileBuffer } = require('../services/storage');
      try {
        buffer = await getFileBuffer(attachment.filePath);
      } catch (err) {
        return res.status(404).json({ error: 'File not found in storage.' });
      }
      
      filename = attachment.filename;
      fileType = attachment.fileType;
    }

    if (fileType === 'PDF') {
      const text = await extractTextFromPDF(buffer);
      return res.json({ type: 'PDF', content: text });
    } else if (fileType === 'EXCEL') {
      const text = extractTextFromExcel(buffer);
      return res.json({ type: 'EXCEL', content: text });
    }

    return res.json({ type: 'OTHER', content: 'In-app parsing is only supported for PDF and Excel files.' });
  } catch (error) {
    console.error('Parse attachment failed:', error);
    return res.status(500).json({ error: `Failed to parse attachment: ${error.message}` });
  }
};

module.exports = {
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
};
