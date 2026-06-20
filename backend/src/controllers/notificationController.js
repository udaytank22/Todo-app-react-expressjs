const { prisma } = require('../services/db');

const getNotifications = async (req, res) => {
  const { page = '1', limit = '50' } = req.query;
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where: { userId: req.user.id } }),
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return res.json({
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ error: 'Server error fetching notifications.' });
  }
};

const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await prisma.notification.update({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });
    return res.json(notification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ error: 'Server error updating notification.' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ error: 'Server error marking all read.' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
