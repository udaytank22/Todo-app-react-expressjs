const prisma = require('./services/db');

async function main() {
  const email = await prisma.email.findFirst({
    where: { subject: { startsWith: 'A new task' } }
  });
  if (email) {
    console.log('--- EMAIL FOUND ---');
    console.log(`Subject: ${email.subject}`);
    console.log(`Body:\n${email.body}`);
  } else {
    console.log('Email not found.');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
