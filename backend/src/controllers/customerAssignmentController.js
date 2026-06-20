const { prisma, prismaRead } = require('../services/db');
const { cache } = require('../services/cache');

/**
 * Get all auto-assignment rules
 */
const getAllRules = async (req, res) => {
  try {
    const cachedRules = await cache.get('assignment_rules');
    if (cachedRules) {
      return res.json(cachedRules);
    }

    const rules = await prismaRead.customerAssignment.findMany({
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    await cache.set('assignment_rules', rules, 300); // 5 min TTL
    return res.json(rules);
  } catch (error) {
    console.error('Error fetching assignment rules:', error);
    return res.status(500).json({ error: 'Server error fetching auto-assignment rules.' });
  }
};

/**
 * Create a new auto-assignment rule
 */
const createRule = async (req, res) => {
  const { customerName, customerEmail, assignedUserId } = req.body;

  if (!customerName && !customerEmail) {
    return res.status(400).json({ error: 'Either Customer Name or Customer Email must be specified.' });
  }

  if (!assignedUserId) {
    return res.status(400).json({ error: 'An assignee (employee) must be selected.' });
  }

  try {
    // Verify target employee exists
    const userExists = await prisma.user.findUnique({
      where: { id: assignedUserId },
    });

    if (!userExists) {
      return res.status(404).json({ error: 'Assigned employee not found.' });
    }

    const emailPattern = customerEmail ? customerEmail.trim().toLowerCase() : null;
    const namePattern = customerName ? customerName.trim() : null;

    // Check if rule already exists
    const existingRule = await prisma.customerAssignment.findFirst({
      where: {
        customerName: namePattern,
        customerEmail: emailPattern,
      },
    });

    if (existingRule) {
      return res.status(400).json({ error: 'An assignment rule for this customer name/email combination already exists.' });
    }

    const rule = await prisma.customerAssignment.create({
      data: {
        customerName: namePattern,
        customerEmail: emailPattern,
        assignedUserId,
      },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Apply this assign change to old unassigned tasks from this sender
    const updateWhere = {
      assignedUserId: null,
      OR: [],
    };
    if (emailPattern) updateWhere.OR.push({ senderEmail: { equals: emailPattern, mode: 'insensitive' } });
    if (namePattern) updateWhere.OR.push({ customerName: { contains: namePattern, mode: 'insensitive' } });

    if (updateWhere.OR.length > 0) {
      try {
        await prisma.task.updateMany({
          where: updateWhere,
          data: { assignedUserId },
        });
      } catch (err) {
        console.error('Failed to update old tasks with new rule:', err);
      }
    }

    await cache.invalidate('assignment_rules');
    return res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating assignment rule:', error);
    return res.status(500).json({ error: 'Server error creating auto-assignment rule.' });
  }
};

/**
 * Delete an auto-assignment rule
 */
const deleteRule = async (req, res) => {
  const { id } = req.params;

  try {
    const rule = await prisma.customerAssignment.findUnique({
      where: { id },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Assignment rule not found.' });
    }

    await prisma.customerAssignment.delete({
      where: { id },
    });

    await cache.invalidate('assignment_rules');
    return res.json({ message: 'Assignment rule deleted successfully.' });
  } catch (error) {
    console.error('Error deleting assignment rule:', error);
    return res.status(500).json({ error: 'Server error deleting auto-assignment rule.' });
  }
};

/**
 * Update an auto-assignment rule
 */
const updateRule = async (req, res) => {
  const { id } = req.params;
  const { customerName, customerEmail, assignedUserId } = req.body;

  if (!customerName && !customerEmail) {
    return res.status(400).json({ error: 'Either Customer Name or Customer Email must be specified.' });
  }

  if (!assignedUserId) {
    return res.status(400).json({ error: 'An assignee (employee) must be selected.' });
  }

  try {
    const userExists = await prisma.user.findUnique({
      where: { id: assignedUserId },
    });

    if (!userExists) {
      return res.status(404).json({ error: 'Assigned employee not found.' });
    }

    const emailPattern = customerEmail ? customerEmail.trim().toLowerCase() : null;
    const namePattern = customerName ? customerName.trim() : null;

    const existingRule = await prisma.customerAssignment.findFirst({
      where: {
        customerName: namePattern,
        customerEmail: emailPattern,
        id: { not: id },
      },
    });

    if (existingRule) {
      return res.status(400).json({ error: 'An assignment rule for this customer name/email combination already exists.' });
    }

    const rule = await prisma.customerAssignment.update({
      where: { id },
      data: {
        customerName: namePattern,
        customerEmail: emailPattern,
        assignedUserId,
      },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const updateWhere = {
      assignedUserId: null,
      OR: [],
    };
    if (emailPattern) updateWhere.OR.push({ senderEmail: { equals: emailPattern, mode: 'insensitive' } });
    if (namePattern) updateWhere.OR.push({ customerName: { contains: namePattern, mode: 'insensitive' } });

    if (updateWhere.OR.length > 0) {
      try {
        await prisma.task.updateMany({
          where: updateWhere,
          data: { assignedUserId },
        });
      } catch (err) {
        console.error('Failed to update old tasks with new rule:', err);
      }
    }

    await cache.invalidate('assignment_rules');
    return res.json(rule);
  } catch (error) {
    console.error('Error updating assignment rule:', error);
    return res.status(500).json({ error: 'Server error updating auto-assignment rule.' });
  }
};

module.exports = {
  getAllRules,
  createRule,
  deleteRule,
  updateRule,
};
