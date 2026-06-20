const { prisma } = require('../services/db');

/**
 * Get direct messages between authenticated user and another user
 */
const getDirectMessages = async (req, res) => {
  const { otherUserId } = req.params;
  const currentUserId = req.user.id;

  try {
    // Retrieve historical direct messages between the two users
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100, // Limit message history load
    });

    return res.json(messages);
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    return res.status(500).json({ error: 'Server error retrieving direct messages.' });
  }
};

module.exports = {
  getDirectMessages,
};
