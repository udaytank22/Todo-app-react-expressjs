const prisma = require('../services/db');
const crypto = require('crypto');

/**
 * Generate a unique random alphanumeric Inquiry ID (e.g. INQ-X8F2K) instead of sequential numbers.
 * Guarantees uniqueness by looping and checking existence in the database.
 */
const generateInquiryId = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let inquiryId;
  let isUnique = false;

  while (!isUnique) {
    let randomStr = '';
    for (let i = 0; i < 5; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      randomStr += chars[randomIndex];
    }
    inquiryId = `INQ-${randomStr}`;

    try {
      const existing = await prisma.task.findUnique({
        where: { inquiryId },
      });
      if (!existing) {
        isUnique = true;
      }
    } catch (err) {
      console.error('Error verifying ID uniqueness:', err);
      // Fallback timestamp-based ID to ensure execution
      return `INQ-FB-${Date.now()}`;
    }
  }

  return inquiryId;
};

module.exports = { generateInquiryId };
