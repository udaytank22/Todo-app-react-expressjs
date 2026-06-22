const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateStatuses() {
  console.log('Starting migration of Kanban statuses to PENDING...');
  try {
    const result = await prisma.task.updateMany({
      where: {
        status: {
          in: ['NEW_EMAIL', 'PENDING_REVIEW', 'WAITING_FOR_CLIENT']
        }
      },
      data: {
        status: 'PENDING'
      }
    });

    console.log(`Successfully migrated ${result.count} tasks to PENDING.`);

    // Update StatusHistory as well to reflect the new statuses
    const historyResult1 = await prisma.statusHistory.updateMany({
      where: { fromStatus: { in: ['NEW_EMAIL', 'PENDING_REVIEW', 'WAITING_FOR_CLIENT'] } },
      data: { fromStatus: 'PENDING' }
    });
    
    const historyResult2 = await prisma.statusHistory.updateMany({
      where: { toStatus: { in: ['NEW_EMAIL', 'PENDING_REVIEW', 'WAITING_FOR_CLIENT'] } },
      data: { toStatus: 'PENDING' }
    });

    console.log(`Successfully migrated status history: ${historyResult1.count + historyResult2.count} records updated.`);

  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrateStatuses();
