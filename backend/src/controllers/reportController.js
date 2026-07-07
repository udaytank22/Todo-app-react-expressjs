const { prisma } = require('../services/db');
const { cache } = require('../services/cache');

const getDashboardReports = async (req, res) => {
  try {
    const cacheKey = `reports:dashboard`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // 1. Tasks by Status
    const statusCounts = await prisma.task.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // 2. Tasks by Priority
    const priorityCounts = await prisma.task.groupBy({
      by: ['priority'],
      _count: {
        id: true,
      },
    });

    // 3. Tasks by Assignee (User)
    const userCountsRaw = await prisma.task.groupBy({
      by: ['assignedUserId'],
      _count: {
        id: true,
      },
      where: {
        assignedUserId: { not: null }
      }
    });

    const userIds = userCountsRaw.map(u => u.assignedUserId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userCounts = userCountsRaw.map(u => {
      const user = users.find(x => x.id === u.assignedUserId);
      return {
        name: user ? user.name : 'Unknown User',
        count: u._count.id
      };
    });

    // 4. Tasks by Team
    const teamCountsRaw = await prisma.task.groupBy({
      by: ['teamId'],
      _count: {
        id: true,
      },
      where: {
        teamId: { not: null }
      }
    });

    const teamIds = teamCountsRaw.map(t => t.teamId);
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true }
    });
    const teamCounts = teamCountsRaw.map(t => {
      const team = teams.find(x => x.id === t.teamId);
      return {
        name: team ? team.name : 'Unknown Team',
        count: t._count.id
      };
    });

    // Unassigned Tasks
    const unassignedCount = await prisma.task.count({
      where: {
        assignedUserId: null,
        teamId: null
      }
    });

    // Recent Activity (Tasks created in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTasks = await prisma.task.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    const reportData = {
      statusCounts: statusCounts.map(s => ({ status: s.status, count: s._count.id })),
      priorityCounts: priorityCounts.map(p => ({ priority: p.priority, count: p._count.id })),
      userCounts,
      teamCounts,
      unassignedCount,
      recentTasks,
      totalTasks: await prisma.task.count()
    };

    await cache.set(cacheKey, reportData, 300); // cache for 5 minutes
    return res.json(reportData);

  } catch (error) {
    console.error('Error generating reports:', error);
    res.status(500).json({ error: 'Failed to generate reports data' });
  }
};

module.exports = {
  getDashboardReports
};
