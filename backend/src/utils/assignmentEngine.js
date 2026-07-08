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

    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'live.com', 'msn.com'];

    // 1. Try to match by email first (high priority match)
    const emailDomain = normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : normalizedEmail;
    
    for (const rule of rules) {
      if (rule.customerEmail) {
        const ruleEmail = rule.customerEmail.toLowerCase();
        const ruleDomain = ruleEmail.includes('@') ? ruleEmail.split('@')[1] : ruleEmail;
        
        // For common email providers, require an exact full email match
        if (commonDomains.includes(emailDomain) || commonDomains.includes(ruleDomain)) {
          if (normalizedEmail === ruleEmail) {
            return { assignedUserId: rule.assignedUserId, teamId: rule.teamId };
          }
        } else {
          // For company/custom domains, match by domain
          if (emailDomain === ruleDomain) {
            return { assignedUserId: rule.assignedUserId, teamId: rule.teamId };
          }
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
