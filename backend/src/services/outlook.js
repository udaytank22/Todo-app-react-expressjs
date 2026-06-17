const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config.json');

// In-memory OAuth status and configuration fallback
let oauthConfig = {
  accessToken: null,
  refreshToken: null,
  expiryTime: null,
};

// Load saved configuration if it exists
if (fs.existsSync(CONFIG_PATH)) {
  try {
    oauthConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error('Error loading config.json:', err.message);
  }
}

const saveConfig = (config) => {
  oauthConfig = { ...oauthConfig, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(oauthConfig, null, 2));
};

/**
 * Generate Microsoft Graph OAuth authorization URL
 */
const getAuthUrl = () => {
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI);

  if (!clientId) {
    return null;
  }

  const scope = encodeURIComponent('https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access');
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}`;
};

/**
 * Exchange Auth Code for Access/Refresh tokens
 */
const exchangeAuthCode = async (code) => {
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('scope', 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');
  if (clientSecret) {
    params.append('client_secret', clientSecret);
  }

  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    const expiryTime = Date.now() + (expires_in * 1000);

    saveConfig({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiryTime,
    });

    return true;
  } catch (error) {
    console.error('Error exchanging auth code:', error.response?.data || error.message);
    throw new Error('Failed to exchange auth token with Microsoft.');
  }
};

/**
 * Get valid Microsoft Graph Access Token, refreshing if expired
 */
const getAccessToken = async () => {
  if (!oauthConfig.accessToken) return null;

  // If token is expired or expires in next 60 seconds, refresh it
  if (oauthConfig.expiryTime && Date.now() > (oauthConfig.expiryTime - 60000)) {
    console.log('[Outlook Service] Access token expired. Refreshing token...');
    const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access');
    params.append('refresh_token', oauthConfig.refreshToken);
    params.append('grant_type', 'refresh_token');
    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }

    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiryTime = Date.now() + (expires_in * 1000);

      saveConfig({
        accessToken: access_token,
        refreshToken: refresh_token ? refresh_token : oauthConfig.refreshToken, // refresh_token might not always be returned
        expiryTime,
      });

      console.log('[Outlook Service] Access token successfully refreshed.');
      return access_token;
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      // Reset tokens if refresh fails
      saveConfig({ accessToken: null, refreshToken: null, expiryTime: null });
      return null;
    }
  }

  return oauthConfig.accessToken;
};

/**
 * Check if the email connection is established and authorized
 */
const isConnected = () => {
  if (process.env.DEMO_MODE === 'true') {
    return true; // Always active in demo mode
  }
  return !!oauthConfig.accessToken;
};

/**
 * Fetch messages from Outlook
 */
const fetchRealOutlookEmails = async () => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Outlook not connected. Please authenticate first.');
  }

  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=20&$expand=attachments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Prefer': 'outlook.body-content-type="text"'
        }
      }
    );

    console.log("This is what i m getting ", response);
    const messages = response.data.value || [];
    const emailsList = [];

    for (const msg of messages) {
      const subject = msg.subject || '';
      if (!subject.toLowerCase().includes('inquiry')) {
        continue;
      }

      const email = {
        messageId: msg.id,
        subject: subject || '(No Subject)',
        senderEmail: msg.from?.emailAddress?.address || 'unknown@example.com',
        senderName: msg.from?.emailAddress?.name || 'Unknown',
        body: msg.body?.content || '',
        receivedAt: new Date(msg.receivedDateTime || Date.now()),
        attachments: [],
      };

      // Check for attachments and fetch them
      if (msg.hasAttachments && msg.attachments) {
        for (const att of msg.attachments) {
          // If attachment is a file, download the content (it comes base64 encoded)
          if (att['@odata.type'] === '#microsoft.graph.fileAttachment') {
            email.attachments.push({
              id: att.id,
              filename: att.name,
              mimeType: att.contentType,
              fileSize: att.size,
              // Convert base64 attachment content back to Buffer
              buffer: Buffer.from(att.contentBytes, 'base64'),
            });
          }
        }
      }

      emailsList.push(email);
    }

    return emailsList;
  } catch (error) {
    console.error('Error fetching real Outlook emails:', error.response?.data || error.message);
    throw new Error(`Outlook Fetch Failed: ${error.message}`);
  }
};

/**
 * Fetch a single live attachment from Microsoft Graph
 */
const fetchLiveAttachment = async (messageId, attachmentId) => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Outlook not connected. Please authenticate first.');
  }

  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching live attachment:', error.response?.data || error.message);
    throw error;
  }
};

let cachedEmails = null;
let lastFetchTime = null;

/**
 * Primary endpoint to fetch new emails (with in-memory caching)
 */
const fetchEmails = async (forceRefresh = false) => {
  if (forceRefresh || !cachedEmails) {
    console.log('[Outlook Service] Cache empty or force refresh requested. Fetching from Graph API...');
    cachedEmails = await fetchRealOutlookEmails();
    lastFetchTime = Date.now();
  } else {
    console.log('[Outlook Service] Returning cached emails.');
  }
  return cachedEmails;
};

module.exports = {
  getAuthUrl,
  exchangeAuthCode,
  isConnected,
  fetchEmails,
  fetchLiveAttachment,
};
