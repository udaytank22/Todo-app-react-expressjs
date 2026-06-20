const Queue = require('bull');
const { prisma } = require('../services/db');

// Initialize Bull Queue
// Bull uses Redis to coordinate jobs across multiple PM2 instances
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const archiveQueue = new Queue('notification-archive', redisUrl, {
  redis: {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 3) return null; // Stop reconnecting after 3 attempts
      return 500;
    }
  }
});

let isArchiveQueueErrorLogged = false;
archiveQueue.on('error', (err) => {
  if (!isArchiveQueueErrorLogged && err.code === 'ECONNREFUSED') {
    console.warn('⚠️ Redis not found for Notification Archive Worker. Background jobs disabled.');
    isArchiveQueueErrorLogged = true;
  }
});

// Process jobs
archiveQueue.process(async (job) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get notifications older than 90 days
    const oldNotifications = await prisma.notification.findMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    if (oldNotifications.length === 0) {
      console.log(`[Archive Worker] No old notifications to archive.`);
      return;
    }

    console.log(`[Archive Worker] Archiving ${oldNotifications.length} old notifications...`);

    // Move to NotificationArchive
    await prisma.$transaction(async (tx) => {
      await tx.notificationArchive.createMany({
        data: oldNotifications.map(n => ({
          id: n.id,
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          relatedId: n.relatedId,
          isRead: n.isRead,
          createdAt: n.createdAt,
        })),
        skipDuplicates: true,
      });

      // Delete from Notification
      await tx.notification.deleteMany({
        where: {
          id: { in: oldNotifications.map(n => n.id) },
        },
      });
    });

    console.log(`[Archive Worker] Successfully archived ${oldNotifications.length} notifications.`);
  } catch (err) {
    console.error('[Archive Worker] Error during archival process:', err);
  }
});

// Run once a day at midnight
archiveQueue.add({}, {
  repeat: { cron: '0 0 * * *' },
  removeOnComplete: 10,
  removeOnFail: 10,
});

console.log('[Archive Worker] Scheduled daily notification archival.');

module.exports = archiveQueue;
