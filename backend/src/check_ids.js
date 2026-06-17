const prisma = require('./services/db');

async function main() {
  const emails = await prisma.email.findMany({
    orderBy: { receivedAt: 'desc' },
  });
  console.log('--- SCANNING EMAILS FOR ID PATTERNS ---');
  emails.forEach((email) => {
    const inqRegex = /INQ-\d+/i;
    const subjectMatch = email.subject ? email.subject.match(inqRegex) : null;
    const bodyMatch = email.body ? email.body.match(inqRegex) : null;
    
    // Check if there is any other ID pattern like task ID or reference number
    const refMatch = email.body.match(/(?:ref|id|ticket|inquiry|task)[#:\s]+(\w+)/i);

    console.log(`Subject: "${email.subject}"`);
    console.log(`  Extracted INQ from Subject: ${subjectMatch ? subjectMatch[0] : 'None'}`);
    console.log(`  Extracted INQ from Body: ${bodyMatch ? bodyMatch[0] : 'None'}`);
    console.log(`  Generic Ref from Body: ${refMatch ? refMatch[0] : 'None'}`);
    console.log('--------------------------------------------------');
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
