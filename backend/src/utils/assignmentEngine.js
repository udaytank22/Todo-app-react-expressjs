const { prisma } = require('../services/db');

/**
 * Match a client email and customer name against auto-assignment rules and return the assignedUserId if matched
 * @param {string} email - Sender email address
 * @param {string} name - Customer name or display name
 * @returns {Promise<{assignedUserId: string|null, teamId: string|null}|null>} - Assignment object or null
 */
const findAssignedUser = async (email, name) => {
  try {
    const rules = await prisma.customerAssignment.findMany();

    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const normalizedName = name ? name.trim().toLowerCase() : '';

    // 1. Try to match by email domain first (high priority match)
    const emailDomain = normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : normalizedEmail;
    
    for (const rule of rules) {
      if (rule.customerEmail) {
        const ruleDomain = rule.customerEmail.includes('@') ? rule.customerEmail.split('@')[1].toLowerCase() : rule.customerEmail.toLowerCase();
        if (emailDomain === ruleDomain) {
          return { assignedUserId: rule.assignedUserId, teamId: rule.teamId };
        }
      }
    }

    // 2. Try to match by customer name (substring match)
    for (const rule of rules) {
      if (rule.customerName && normalizedName.includes(rule.customerName.toLowerCase())) {
        return { assignedUserId: rule.assignedUserId, teamId: rule.teamId };
      }
    }

    return null;
  } catch (error) {
    console.error('Error matching auto-assignment rules:', error);
    return null;
  }
};

module.exports = { findAssignedUser };
