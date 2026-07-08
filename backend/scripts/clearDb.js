/**
 * clearDb.js — Transactionally wipe core data tables
 *
 * When to run:
 *   Quick reset of tasks, emails, comments, and related data during
 *   development or testing. Lighter than cleanDb.js (fewer tables).
 *
 * Usage:
 *   node scripts/clearDb.js
 *
 * WARNING: This is destructive — it deletes ALL rows from the listed
 *          tables in a single transaction. Do NOT run in production
 *          without explicit confirmation.
 */
const { prisma } = require('../src/services/db');

async function main() {
  console.log('Clearing database tables...');
  
  // Delete in order of dependency
  const deleteComments = prisma.comment.deleteMany();
  const deleteHistory = prisma.statusHistory.deleteMany();
  const deleteAttachments = prisma.attachment.deleteMany();
  const deleteNotifications = prisma.notification.deleteMany();
  const deleteTasks = prisma.task.deleteMany();
  const deleteEmails = prisma.email.deleteMany();
  const deleteAiLogs = prisma.aiLog.deleteMany();

  await prisma.$transaction([
    deleteComments,
    deleteHistory,
    deleteAttachments,
    deleteNotifications,
    deleteTasks,
    deleteEmails,
    deleteAiLogs,
  ]);

  console.log('Database cleared successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
