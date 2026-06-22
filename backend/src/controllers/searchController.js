const { prisma, prismaRead } = require('../services/db');
const { isConnected, fetchEmails } = require('../services/outlook');
const { cache } = require('../services/cache');

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const dbTasks = await prismaRead.task.findMany({
      where: {
        OR: [
          { subject: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { senderEmail: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { inquiryId: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        inquiryId: true,
        subject: true,
        customerName: true,
        status: true,
        priority: true
      }
    });

    let liveEmails = [];
    if (isConnected()) {
      const cachedLiveEmails = await cache.get('live_emails');
      if (cachedLiveEmails) {
        liveEmails = cachedLiveEmails;
      } else {
        try {
          const emails = await fetchEmails();
          const existingTasks = await prismaRead.task.findMany({
            where: { id: { in: emails.map(e => Buffer.from(e.messageId).toString('hex')) } },
            select: { id: true },
          });
          const existingTaskIds = new Set(existingTasks.map(t => t.id));
          const unpersisted = emails.filter(e => !existingTaskIds.has(Buffer.from(e.messageId).toString('hex')));
          
          liveEmails = unpersisted.map(email => ({
            id: Buffer.from(email.messageId).toString('hex'),
            inquiryId: 'INQ-LIVE',
            subject: email.subject,
            customerName: email.senderName,
            senderEmail: email.senderEmail,
            description: email.body,
            status: 'PENDING',
            priority: 'MEDIUM',
          }));
        } catch (e) {
          console.error('Error fetching live emails for search:', e);
        }
      }

      const query = q.toLowerCase();
      const filteredLive = liveEmails.filter(e => 
        (e.subject && e.subject.toLowerCase().includes(query)) ||
        (e.customerName && e.customerName.toLowerCase().includes(query)) ||
        (e.senderEmail && e.senderEmail.toLowerCase().includes(query)) ||
        (e.description && e.description.toLowerCase().includes(query)) ||
        (e.inquiryId && e.inquiryId.toLowerCase().includes(query))
      ).map(e => ({
        id: e.id,
        inquiryId: e.inquiryId,
        subject: e.subject,
        customerName: e.customerName,
        status: e.status,
        priority: e.priority
      }));

      dbTasks.push(...filteredLive);
    }

    res.json(dbTasks.slice(0, 10));
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
};
