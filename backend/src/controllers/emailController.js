const fs = require('fs');
const path = require('path');
const { prisma } = require('../services/db');
const { getAuthUrl, exchangeAuthCode, isConnected, fetchEmails } = require('../services/outlook');
const { analyzeInquiryWithGemini } = require('../services/gemini');
const { emitNewInquiry } = require('../services/socket');

/**
 * Redirect user to Microsoft Graph authorization screen
 */
const connectEmail = (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    return res.json({
      demoMode: true,
      message: 'System is running in DEMO_MODE. Actual OAuth redirects are disabled. Simulation fetch is active.'
    });
  }

  const url = getAuthUrl();
  if (!url) {
    return res.status(400).json({ error: 'Microsoft Client ID is not configured in environment variables.' });
  }

  return res.redirect(url);
};

/**
 * Handle OAuth redirect callback from Microsoft
 */
const oauthCallback = async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('OAuth Callback Error:', error_description);
    return res.status(400).send(`Authentication failed: ${error_description}`);
  }

  if (!code) {
    return res.status(400).send('Authentication failed: Authorization code missing.');
  }

  try {
    await exchangeAuthCode(code);
    return res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: #f8fafc;">
          <h2 style="color: #38bdf8;">Outlook Connected Successfully!</h2>
          <p>You can close this tab and return to the application dashboard.</p>
          <script>
            setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('OAuth token exchange error:', err.message);
    return res.status(500).send(`Token exchange failed: ${err.message}`);
  }
};

/**
 * Check connection status of Outlook Integration
 */
const getStatus = async (req, res) => {
  return res.json({
    connected: await isConnected(),
    demoMode: process.env.DEMO_MODE === 'true',
  });
};


/**
 * Fetch Outlook/Simulated emails and process them through Gemini AI to create tasks
 */
const fetchAndProcessEmails = async (req, res) => {
  try {
    // Live mode: Verification fetch from Outlook (no database persistence)
    const emails = await fetchEmails(true);
    return res.json({
      message: 'Email synchronization complete.',
      imported: emails.length,
      duplicates: 0,
      failed: 0,
    });
  } catch (error) {
    console.error('Email fetch error:', error);
    return res.status(500).json({ error: `Sync failed: ${error.message}` });
  }
};

/**
 * Fetch imported email logs history
 */
const getEmailHistory = async (req, res) => {
  try {
    const emails = await prisma.email.findMany({
      include: {
        task: {
          select: { id: true, inquiryId: true, status: true },
        },
      },
      orderBy: { receivedAt: 'desc' },
    });
    console.log(emails, "This is what i m getting");
    return res.json(emails);
  } catch (error) {
    console.error('Fetch email history error:', error);
    return res.status(500).json({ error: 'Server error fetching email history.' });
  }
};

module.exports = {
  connectEmail,
  oauthCallback,
  getStatus,
  fetchAndProcessEmails,
  getEmailHistory,
};
