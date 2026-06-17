const prisma = require('./services/db');

async function main() {
  const emails = await prisma.email.findMany({
    orderBy: { receivedAt: 'desc' },
  });
  console.log('--- ALL EMAILS IN DB ---');
  emails.forEach((email, index) => {
    console.log(`[Email ${index + 1}]`);
    console.log(`Subject: ${email.subject}`);
    console.log(`Sender: ${email.senderName} <${email.senderEmail}>`);
    console.log(`Body Snippet: ${email.body.substring(0, 500)}`);
    console.log('--------------------------------------------------');
  });
  
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n--- ALL TASKS IN DB ---');
  tasks.forEach((task, index) => {
    console.log(`[Task ${index + 1}]`);
    console.log(`InquiryID: ${task.inquiryId}`);
    console.log(`Subject: ${task.subject}`);
    console.log('--------------------------------------------------');
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
