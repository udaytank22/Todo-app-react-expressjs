const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDb() {
  console.log('Cleaning database (leaving User table)...');
  try {
    // Delete dependent tables first
    console.log('Deleting Attachments...');
    await prisma.attachment.deleteMany({});
    
    console.log('Deleting Comments...');
    await prisma.comment.deleteMany({});
    
    console.log('Deleting Status History...');
    await prisma.statusHistory.deleteMany({});
    
    console.log('Deleting Notifications...');
    await prisma.notification.deleteMany({});
    
    console.log('Deleting Notification Archives...');
    await prisma.notificationArchive.deleteMany({});
    
    console.log('Deleting Customer Assignments...');
    await prisma.customerAssignment.deleteMany({});
    
    console.log('Deleting Direct Messages...');
    await prisma.directMessage.deleteMany({});
    
    console.log('Deleting Refresh Tokens...');
    await prisma.refreshToken.deleteMany({});
    
    // Delete Tasks (depends on Emails and Users)
    console.log('Deleting Tasks...');
    await prisma.task.deleteMany({});
    
    // Delete independent tables
    console.log('Deleting Emails...');
    await prisma.email.deleteMany({});
    
    console.log('Deleting AiLogs...');
    await prisma.aiLog.deleteMany({});
    
    console.log('Deleting Counters...');
    await prisma.counter.deleteMany({});
    
    console.log('Deleting Integration Tokens...');
    await prisma.integrationToken.deleteMany({});
    
    console.log('Database cleaned successfully!');
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDb();
