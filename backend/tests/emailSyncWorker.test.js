// Set environment variables before importing target modules
process.env.MOBILE_ENCRYPTION_KEY = 'test-mobile-secret-key-32-chars-long';
process.env.DATABASE_URL = 'postgresql://test@localhost:5432/db';

const { resetWorkerState, _processEmails } = require('../src/workers/emailSyncWorker');
const { fetchEmails, isConnected } = require('../src/services/outlook');
const { prisma } = require('../src/services/db');
const { getPubClient, getIsRedisAvailable } = require('../src/services/redis');
const { emitNewInquiry } = require('../src/services/socket');

// Mock outlook services
jest.mock('../src/services/outlook', () => ({
  isConnected: jest.fn(),
  fetchEmails: jest.fn(),
  fetchLiveAttachment: jest.fn(),
}));

// Mock db service
jest.mock('../src/services/db', () => ({
  prisma: {
    email: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    task: {
      create: jest.fn(),
    },
    statusHistory: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    customerAssignment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock redis service
jest.mock('../src/services/redis', () => ({
  getPubClient: jest.fn(),
  getIsRedisAvailable: jest.fn(),
}));

// Mock socket service
jest.mock('../src/services/socket', () => ({
  emitNewInquiry: jest.fn(),
  emitNewNotification: jest.fn(),
}));

describe('Email Sync Worker (Multi-instance safe)', () => {
  let mockRedisClient;

  beforeEach(() => {
    jest.clearAllMocks();
    resetWorkerState();

    mockRedisClient = {
      set: jest.fn(),
      get: jest.fn(),
    };
  });

  afterEach(() => {
    resetWorkerState();
  });

  test('should initialize worker on first tick by caching current emails without processing them', async () => {
    isConnected.mockResolvedValue(true);
    getIsRedisAvailable.mockReturnValue(false); // test in-memory fallback first

    const existingEmails = [
      { messageId: 'msg-1', subject: 'Inquiry 1', senderEmail: 'c1@ex.com', senderName: 'C1', receivedAt: new Date() },
      { messageId: 'msg-2', subject: 'Inquiry 2', senderEmail: 'c2@ex.com', senderName: 'C2', receivedAt: new Date() },
    ];
    fetchEmails.mockResolvedValue(existingEmails);

    // Run first tick (initialization)
    await _processEmails();

    expect(fetchEmails).toHaveBeenCalledWith(true);
    expect(prisma.task.create).not.toHaveBeenCalled();
    expect(emitNewInquiry).not.toHaveBeenCalled();
  });

  test('should process a new email on subsequent ticks when using in-memory dedup fallback', async () => {
    isConnected.mockResolvedValue(true);
    getIsRedisAvailable.mockReturnValue(false); // in-memory
    prisma.customerAssignment.findMany.mockResolvedValue([]); // no assignments

    // First tick (initialization)
    fetchEmails.mockResolvedValue([
      { messageId: 'msg-1', subject: 'Inquiry 1', senderEmail: 'c1@ex.com', senderName: 'C1', receivedAt: new Date() },
    ]);
    await _processEmails();

    // Second tick (new email arrives)
    const nextTickEmails = [
      { messageId: 'msg-1', subject: 'Inquiry 1', senderEmail: 'c1@ex.com', senderName: 'C1', receivedAt: new Date() },
      { messageId: 'msg-2', subject: 'New inquiry', senderEmail: 'c2@ex.com', senderName: 'C2', receivedAt: new Date() },
    ];
    fetchEmails.mockResolvedValue(nextTickEmails);

    await _processEmails();

    // msg-2 is processed as new
    expect(emitNewInquiry).toHaveBeenCalledTimes(1);
    expect(emitNewInquiry).toHaveBeenCalledWith(expect.objectContaining({
      id: Buffer.from('msg-2').toString('hex'),
      subject: 'New inquiry',
    }));
  });

  test('should use Redis SET NX EX to atomically dedup emails across multiple instances', async () => {
    isConnected.mockResolvedValue(true);
    getIsRedisAvailable.mockReturnValue(true);
    getPubClient.mockReturnValue(mockRedisClient);

    // Initialization run (populates Redis with msg-1)
    fetchEmails.mockResolvedValue([
      { messageId: 'msg-1', subject: 'Inquiry 1', senderEmail: 'c1@ex.com', senderName: 'C1', receivedAt: new Date() },
    ]);
    await _processEmails();

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'email:processed:msg-1',
      'true',
      { EX: 604800 }
    );

    // Second tick: msg-2 is new (Redis returns OK)
    // msg-1 is old (Redis returns null)
    const nextTickEmails = [
      { messageId: 'msg-1', subject: 'Inquiry 1', senderEmail: 'c1@ex.com', senderName: 'C1', receivedAt: new Date() },
      { messageId: 'msg-2', subject: 'New email', senderEmail: 'c2@ex.com', senderName: 'C2', receivedAt: new Date() },
    ];
    fetchEmails.mockResolvedValue(nextTickEmails);
    
    mockRedisClient.set.mockImplementation((key) => {
      if (key === 'email:processed:msg-2') return Promise.resolve('OK');
      return Promise.resolve(null); // already exists
    });

    await _processEmails();

    // Verifies the atomic check-and-set SET NX EX command was used for deduplication
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'email:processed:msg-2',
      'true',
      { NX: true, EX: 604800 }
    );
    expect(emitNewInquiry).toHaveBeenCalledTimes(1);
    expect(emitNewInquiry).toHaveBeenCalledWith(expect.objectContaining({
      id: Buffer.from('msg-2').toString('hex'),
    }));
  });

  test('should evict oldest entry from in-memory fallback cache when size limit is exceeded', async () => {
    isConnected.mockResolvedValue(true);
    getIsRedisAvailable.mockReturnValue(false);

    // Initialize with 1 email
    fetchEmails.mockResolvedValue([{ messageId: 'msg-init', subject: 'Init', senderEmail: 'c@ex.com', receivedAt: new Date() }]);
    await _processEmails();

    // Poll 1001 new emails!
    const emailsList = [];
    for (let i = 1; i <= 1001; i++) {
      emailsList.push({ messageId: `msg-loop-${i}`, subject: `Loop ${i}`, senderEmail: 'c@ex.com', receivedAt: new Date() });
    }

    fetchEmails.mockResolvedValue(emailsList);
    // Running tick (this will check and mark all 1001 emails as new since they weren't in initialization cache)
    await _processEmails();

    // Since the limit is 1000, the oldest entry (`msg-init`) should be evicted.
    // If we receive `msg-init` again, it should be processed as new (cache miss).
    emitNewInquiry.mockClear();
    fetchEmails.mockResolvedValue([
      { messageId: 'msg-init', subject: 'Init', senderEmail: 'c@ex.com', receivedAt: new Date() }
    ]);
    await _processEmails();

    expect(emitNewInquiry).toHaveBeenCalledTimes(1); // msg-init processed again!
  });
});
