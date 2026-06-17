const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const usersToSeed = [
  {
    email: 'admin@manager.com',
    password: 'admin123',
    name: 'Administrator User',
    role: 'ADMIN',
  },
  {
    email: 'manager@manager.com',
    password: 'manager123',
    name: 'Inquiry Manager',
    role: 'MANAGER',
  },
  {
    email: 'staff@manager.com',
    password: 'staff123',
    name: 'Staff Handler',
    role: 'STAFF',
  },
];

const seed = async () => {
  console.log('Starting database seeding...');
  
  try {
    for (const u of usersToSeed) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: u.email },
      });

      if (existingUser) {
        console.log(`User ${u.email} already exists. Skipping.`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);

      const user = await prisma.user.create({
        data: {
          email: u.email,
          password: hashedPassword,
          name: u.name,
          role: u.role,
        },
      });

      console.log(`Created user: ${user.name} (${user.role}) - ${user.email}`);
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
};

seed();
