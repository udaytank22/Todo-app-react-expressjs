const prisma = require('../services/db');

/**
 * Get all auto-assignment rules
 */
const getAllRules = async (req, res) => {
  try {
    const rules = await prisma.customerAssignment.findMany({
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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

    return res.json({ message: 'Auto-assignment rule deleted successfully.' });
  } catch (error) {
    console.error('Error deleting assignment rule:', error);
    return res.status(500).json({ error: 'Server error deleting auto-assignment rule.' });
  }
};

module.exports = {
  getAllRules,
  createRule,
  deleteRule,
};
