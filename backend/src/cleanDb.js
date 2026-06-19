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
    
    // Deleting Customer Assignments is removed to preserve Master Auto-Assignment Rules
    
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
    
    console.log('Database cleaned successfully!');
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDb();
