require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { initSocket } = require('./services/socket');

// Route modules
const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const { isConnected, fetchEmails } = require('./services/outlook');
const { emitNewInquiry, emitNewNotification } = require('./services/socket');
const prisma = require('./services/db');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// --- Rate Limiting ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // max 200 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit for login/register (brute force protection)
  message: { error: 'Too many login attempts. Please try again later.' },
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Serve uploads folder as static files
const uploadDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred.',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  AI Task & Email Inquiry Manager Server Running  `);
  console.log(`  Port: ${PORT}                                    `);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Demo Mode: ${process.env.DEMO_MODE === 'true' ? 'ACTIVE' : 'INACTIVE'}`);
  console.log(`==================================================`);

  // Start background auto sync check
  startEmailAutoSync();
});

// Auto email synchronization worker
const prevEmailsMap = new Map();
let isSyncing = false;

const logStream = fs.createWriteStream(path.join(__dirname, '../sync.log'), { flags: 'a' });
const logToFile = (msg) => {
  const time = new Date().toISOString();
  logStream.write(`[${time}] ${msg}\n`);
};

const startEmailAutoSync = () => {
  // Check for new emails in Microsoft Graph inbox every 15 seconds
  setInterval(async () => {
    if (isSyncing) return;
    try {
      if (isConnected()) {
        isSyncing = true;
        logToFile('[Auto Sync] Checking for emails...');

        // Fetch fresh emails from Outlook (this automatically updates the cachedEmails array)
        const freshEmails = await fetchEmails(true);
        logToFile(`[Auto Sync] Fetched ${freshEmails.length} emails.`);

        // On first run, initialize map with existing email IDs so we only notify on *new* arrivals
        if (prevEmailsMap.size === 0) {
          freshEmails.forEach(e => prevEmailsMap.set(e.messageId, true));
          logToFile(`[Auto Sync] Initialized. Monitoring for incoming emails among ${freshEmails.length} messages.`);
          isSyncing = false;
          return;
        }

        // Find new emails that were received after initial boot
        const newEmails = freshEmails.filter(e => !prevEmailsMap.has(e.messageId));
        logToFile(`[Auto Sync] Found ${newEmails.length} new emails.`);

        if (newEmails.length > 0) {
          logToFile(`[Auto Sync] Detected ${newEmails.length} new email(s) in Outlook.`);

          for (const email of newEmails) {
            const inqRegex = /INQ-\d+/i;
            const subjectMatch = email.subject ? email.subject.match(inqRegex) : null;
            const bodyMatch = email.body ? email.body.match(inqRegex) : null;
            const inquiryId = subjectMatch ? subjectMatch[0].toUpperCase() : (bodyMatch ? bodyMatch[0].toUpperCase() : `INQ-LIVE-NEW`);

            const taskObj = {
              id: Buffer.from(email.messageId).toString('hex'),
              inquiryId,
              subject: email.subject,
              customerName: email.senderName,
              senderEmail: email.senderEmail,
              description: email.body,
              status: 'NEW_EMAIL',
              priority: 'MEDIUM',
              dueDate: null,
              externalLink: null,
              remarks: null,
              createdAt: email.receivedAt,
              updatedAt: email.receivedAt,
              assignedUserId: null,
              assignedUser: null,
              _count: {
                attachments: email.attachments ? email.attachments.length : 0,
                comments: 0
              }
            };

            logToFile(`[Auto Sync] Emitting new inquiry: ${inquiryId} - ${email.subject}`);
            // Notify all connected socket clients about the new email in real-time
            emitNewInquiry(taskObj);

            // Create persistent notifications for Admins & Managers
            try {
              const adminsAndManagers = await prisma.user.findMany({
                where: { role: { in: ['ADMIN', 'MANAGER'] } },
                select: { id: true },
              });
              if (adminsAndManagers.length > 0) {
                await prisma.notification.createMany({
                  data: adminsAndManagers.map(r => ({
                    userId: r.id,
                    type: 'NEW_INQUIRY',
                    title: 'New Email Inquiry',
                    message: `New email inquiry ${inquiryId} from ${email.senderName}: ${email.subject}`,
                    relatedId: taskObj.id,
                  })),
                });
                const notifs = await prisma.notification.findMany({
                  where: { relatedId: taskObj.id, type: 'NEW_INQUIRY' },
                  orderBy: { createdAt: 'desc' },
                  take: adminsAndManagers.length,
                });
                for (const notif of notifs) {
                  emitNewNotification(notif);
                }
              }
            } catch (err) {
              logToFile(`[Auto Sync] Failed to create notification for email: ${err.message}`);
            }

            // Track this messageId as processed
            prevEmailsMap.set(email.messageId, true);
          }
        }
      } else {
        logToFile('[Auto Sync] Outlook not connected.');
      }
    } catch (err) {
      logToFile(`[Auto Sync] background mail check failed: ${err.message}`);
    } finally {
      isSyncing = false;
    }
  }, 15000);
};
// Trigger reload 2

