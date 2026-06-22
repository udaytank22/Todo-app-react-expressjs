const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDb() {
  try {
    console.log('Testing DB connection...');
    const users = await prisma.user.findMany();
    console.log('Users in DB:', users.length);
    console.log(users);
  } catch (error) {
    console.error('DB Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDb();
