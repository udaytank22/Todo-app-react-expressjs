const { PrismaClient } = require('@prisma/client');

// ── Fail-fast: DATABASE_URL must be set in every environment ────────────────
if (!process.env.DATABASE_URL) {
  console.error('FATAL ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const prismaRead = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      // Use DATABASE_READ_URL if available, else fallback to primary DATABASE_URL
      url: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
    },
  },
});

module.exports = { prisma, prismaRead };
