const fs = require('fs');
const path = require('path');
const { prisma } = require('../services/db');
const { fetchEmails, isConnected, fetchLiveAttachment } = require('../services/outlook');
const { emitNewInquiry, emitNewNotification } = require('../services/socket');
const { findAssignedUser } = require('../utils/assignmentEngine');
const { generateInquiryId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

const prevEmailsMap = new Map();
let syncInterval = null;
let isSyncing = false;

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

    if (prevEmailsMap.size === 0) {
      freshEmails.forEach(e => prevEmailsMap.set(e.messageId, true));
      logger.info(`[Bull Worker] Initialized. Monitoring ${freshEmails.length} existing messages.`);
      return;
    }

    const newEmails = freshEmails.filter(e => !prevEmailsMap.has(e.messageId));
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
            comments: 0,
          },
        };

        const matchedUserId = await findAssignedUser(email.senderEmail, email.senderName);
        if (matchedUserId) {
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
                status: 'NEW_EMAIL',
                priority: 'MEDIUM',
                emailId: emailRecord.id,
                assignedUserId: matchedUserId,
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
                toStatus: 'NEW_EMAIL',
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
                  logToFile(`[Bull Worker] Failed to save attachment: ${attErr.message}`);
                }
              }
            }

            taskObj.inquiryId = finalInquiryId;
            taskObj.assignedUserId = matchedUserId;
            taskObj.assignedUser = task.assignedUser;

            await prisma.notification.create({
              data: {
                userId: matchedUserId,
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
            logToFile(`[Bull Worker] Failed to persist assignment task: ${persistErr.message}`);
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

        prevEmailsMap.set(email.messageId, true);
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

module.exports = { startEmailSyncWorker, stopEmailSyncWorker };
