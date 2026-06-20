const { prisma } = require('../services/db');

/**
 * Match a client email and customer name against auto-assignment rules and return the assignedUserId if matched
 * @param {string} email - Sender email address
 * @param {string} name - Customer name or display name
 * @returns {Promise<string|null>} - Assigned user ID or null
 */
const findAssignedUser = async (email, name) => {
  try {
    const rules = await prisma.customerAssignment.findMany();

    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const normalizedName = name ? name.trim().toLowerCase() : '';

    // 1. Try to match by email first (high priority exact match)
    for (const rule of rules) {
      if (rule.customerEmail && rule.customerEmail.toLowerCase() === normalizedEmail) {
        return rule.assignedUserId;
      }
    }

    // 2. Try to match by customer name (substring match)
    for (const rule of rules) {
      if (rule.customerName && normalizedName.includes(rule.customerName.toLowerCase())) {
        return rule.assignedUserId;
      }
    }

    return null;
  } catch (error) {
    console.error('Error matching auto-assignment rules:', error);
    return null;
  }
};

module.exports = { findAssignedUser };
