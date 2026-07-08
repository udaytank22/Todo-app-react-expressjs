const fs = require('fs');
const path = require('path');
const { prisma } = require('../services/db');
const { fetchEmails, isConnected, fetchLiveAttachment } = require('../services/outlook');
const { emitNewInquiry, emitNewNotification } = require('../services/socket');
const { findAssignedUser } = require('../utils/assignmentEngine');
const { generateInquiryId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

const { getPubClient, getIsRedisAvailable } = require('../services/redis');

const prevEmailsMap = new Map();
let syncInterval = null;
let isSyncing = false;
let isWorkerInitialized = false;

const MAX_DEDUP_SIZE = 1000;
const DEDUP_TTL_SEC = 7 * 24 * 3600; // 7 days

/**
 * Check and mark email as processed atomically using SET NX EX in Redis
 * or fallback to bounded in-memory Map.
 */
const checkAndMarkEmailProcessed = async (messageId) => {
  const redisClient = getPubClient();
  if (redisClient && getIsRedisAvailable()) {
    const key = `email:processed:${messageId}`;
    // Atomic SET if Not Exists with TTL
    const result = await redisClient.set(key, 'true', {
      NX: true,
      EX: DEDUP_TTL_SEC
    });
    return result === 'OK'; // true if first time seen, false if duplicate
  } else {
    // Fallback to bounded in-memory map
    if (prevEmailsMap.has(messageId)) {
      return false; // Already processed
    }
    // Evict oldest if we exceed size
    if (prevEmailsMap.size >= MAX_DEDUP_SIZE) {
      const oldestKey = prevEmailsMap.keys().next().value;
      if (oldestKey !== undefined) {
        prevEmailsMap.delete(oldestKey);
      }
    }
    prevEmailsMap.set(messageId, true);
    return true; // First time seen
  }
};

const processEmails = async () => {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const connected = await isConnected();
    if (!connected) {
      logger.warn('[Bull Worker] Outlook not connected.');
      return;
    }

    logger.info('[Bull Worker] Checking for emails...');
    const freshEmails = await fetchEmails(true);
    logger.info(`[Bull Worker] Fetched ${freshEmails.length} emails.`);

    // ── Startup Initialization ───────────────────────────────────────────────
    // Populate the cache with currently visible emails without processing them as new
    if (!isWorkerInitialized) {
      logger.info(`[Bull Worker] Initializing. Monitoring ${freshEmails.length} existing messages.`);
      const redisClient = getPubClient();
      const useRedis = redisClient && getIsRedisAvailable();

      for (const e of freshEmails) {
        if (useRedis) {
          const key = `email:processed:${e.messageId}`;
          await redisClient.set(key, 'true', { EX: DEDUP_TTL_SEC });
        } else {
          prevEmailsMap.set(e.messageId, true);
        }
      }
      isWorkerInitialized = true;
      return;
    }

    // ── Atomic check and mark ────────────────────────────────────────────────
    const newEmails = [];
    for (const email of freshEmails) {
      const isNew = await checkAndMarkEmailProcessed(email.messageId);
      if (isNew) {
        newEmails.push(email);
      }
    }
    logger.info(`[Bull Worker] Found ${newEmails.length} new email(s).`);

    if (newEmails.length > 0) {
      for (const email of newEmails) {
        const inqRegex = /INQ-\d+/i;
        const subjectMatch = email.subject ? email.subject.match(inqRegex) : null;
        const bodyMatch = email.body ? email.body.match(inqRegex) : null;
        const inquiryId = subjectMatch
          ? subjectMatch[0].toUpperCase()
          : bodyMatch
            ? bodyMatch[0].toUpperCase()
            : 'INQ-LIVE-NEW';

        const taskObj = {
          id: Buffer.from(email.messageId).toString('hex'),
          inquiryId,
          subject: email.subject,
          customerName: email.senderName,
          senderEmail: email.senderEmail,
          description: email.body,
          status: 'PENDING',
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
            comments: 0,
          },
        };

        const assignmentMatch = await findAssignedUser(email.senderEmail, email.senderName);
        if (assignmentMatch) {
          try {
            let emailRecord = await prisma.email.findUnique({
              where: { messageId: email.messageId },
            });
            if (!emailRecord) {
              emailRecord = await prisma.email.create({
                data: {
                  messageId: email.messageId,
                  subject: email.subject || '(No Subject)',
                  senderEmail: email.senderEmail,
                  senderName: email.senderName,
                  body: email.body || '',
                  receivedAt: email.receivedAt,
                  processedStatus: 'PROCESSED',
                },
              });
            }

            const finalInquiryId = await generateInquiryId();
            const taskId = Buffer.from(email.messageId).toString('hex');
            const task = await prisma.task.create({
              data: {
                id: taskId,
                inquiryId: finalInquiryId,
                subject: email.subject || '(No Subject)',
                customerName: email.senderName,
                senderEmail: email.senderEmail,
                description: email.body || '',
                status: 'PENDING',
                priority: 'MEDIUM',
                emailId: emailRecord.id,
                assignedUserId: assignmentMatch.assignedUserId,
                teamId: assignmentMatch.teamId,
                createdAt: email.receivedAt,
                updatedAt: email.receivedAt,
              },
              include: {
                assignedUser: {
                  select: { id: true, name: true, email: true, role: true },
                },
              },
            });

            await prisma.statusHistory.create({
              data: {
                taskId: task.id,
                fromStatus: 'NONE',
                toStatus: 'PENDING',
                changedById: null,
              },
            });

            if (email.attachments && email.attachments.length > 0) {
              for (const att of email.attachments) {
                try {
                  const attData = await fetchLiveAttachment(email.messageId, att.id);
                  const buffer = Buffer.from(attData.contentBytes, 'base64');
                  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                  const ext = path.extname(attData.name) || '';
                  const filename = uniqueSuffix + ext;
                  const uploadDir = path.join(__dirname, '../../uploads');
                  if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                  }
                  const filePath = path.join(uploadDir, filename);

                  await fs.promises.writeFile(filePath, buffer);

                  await prisma.attachment.create({
                    data: {
                      filename: attData.name,
                      filePath: `uploads/${filename}`,
                      fileType: attData.name.toLowerCase().endsWith('.pdf')
                        ? 'PDF'
                        : attData.name.toLowerCase().endsWith('.xlsx') ||
                          attData.name.toLowerCase().endsWith('.xls')
                          ? 'EXCEL'
                          : 'OTHER',
                      fileSize: attData.size,
                      taskId: task.id,
                    },
                  });
                } catch (attErr) {
                  logger.error(`[Bull Worker] Failed to save attachment: ${attErr.message}`);
                }
              }
            }

            taskObj.inquiryId = finalInquiryId;
            taskObj.assignedUserId = assignmentMatch.assignedUserId;
            taskObj.assignedUser = task.assignedUser;

            await prisma.notification.create({
              data: {
                userId: assignmentMatch.assignedUserId,
                type: 'ASSIGNMENT',
                title: 'New Inquiry Automatically Assigned',
                message: `Inquiry ${finalInquiryId} from ${email.senderName} has been automatically assigned to you.`,
                relatedId: task.id,
              },
            });
            const assignmentNotif = await prisma.notification.findFirst({
              where: { relatedId: task.id, type: 'ASSIGNMENT' },
              orderBy: { createdAt: 'desc' },
            });
            if (assignmentNotif) {
              emitNewNotification(assignmentNotif);
            }
          } catch (persistErr) {
            logger.error(`[Bull Worker] Failed to persist assignment task: ${persistErr.message}`);
          }
        }

        emitNewInquiry(taskObj);

        try {
          const adminsAndManagers = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'MANAGER'] } },
            select: { id: true },
          });
          if (adminsAndManagers.length > 0) {
            await prisma.notification.createMany({
              data: adminsAndManagers.map(r => ({
                userId: r.id,
                type: 'NEW_INQUIRY',
                title: 'New Email Inquiry',
                message: `New email inquiry ${inquiryId} from ${email.senderName}: ${email.subject}`,
                relatedId: taskObj.id,
              })),
            });
            const notifs = await prisma.notification.findMany({
              where: { relatedId: taskObj.id, type: 'NEW_INQUIRY' },
              orderBy: { createdAt: 'desc' },
              take: adminsAndManagers.length,
            });
            for (const notif of notifs) {
              emitNewNotification(notif);
            }
          }
        } catch (notifErr) {
          logger.error(`[Email Worker] Failed to create notification: ${notifErr.message}`);
        }

        // Already marked processed in checkAndMarkEmailProcessed
      }
    }
  } catch (error) {
    logger.error(`[Email Worker] Sync failed: ${error.message}`);
  } finally {
    isSyncing = false;
  }
};

const startEmailSyncWorker = () => {
  if (syncInterval) return;
  logger.info('[Email Worker] Started polling every 15s');
  syncInterval = setInterval(processEmails, 15000);
  // Run once immediately
  processEmails();
};

const stopEmailSyncWorker = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    logger.info('[Email Worker] Stopped.');
  }
};

const resetWorkerState = () => {
  prevEmailsMap.clear();
  isWorkerInitialized = false;
  isSyncing = false;
};

module.exports = { startEmailSyncWorker, stopEmailSyncWorker, resetWorkerState, _processEmails: processEmails };

// Auto-start worker if run directly (e.g. via PM2 ecosystem or node CLI)
if (require.main === module) {
  // Ensure we validate required environment variables first
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'MOBILE_ENCRYPTION_KEY'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('==================================================');
    console.error('  ERROR: Missing required environment variables:');
    missing.forEach(v => console.error(`    - ${v}`));
    console.error('==================================================');
    process.exit(1);
  }

  // Load environment variables (usually config is already loaded by PM2, but fallback to dotenv)
  require('dotenv').config();

  startEmailSyncWorker();

  const handleShutdown = () => {
    logger.info('[Email Worker] Received shutdown signal. Stopping sync worker...');
    stopEmailSyncWorker();
    const { prisma } = require('../services/db');
    prisma.$disconnect().then(() => {
      logger.info('[Email Worker] Database disconnected. Exiting.');
      process.exit(0);
    }).catch((err) => {
      logger.error(`[Email Worker] Error disconnecting database: ${err.message}`);
      process.exit(1);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}
