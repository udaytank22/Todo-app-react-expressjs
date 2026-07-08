const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Use PM2 instance ID to avoid concurrent write conflicts across cluster nodes
const instanceId = process.env.NODE_APP_INSTANCE || '0';

const errorTransport = new DailyRotateFile({
  filename: `logs/error-%DATE%-${instanceId}.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
});

const combinedTransport = new DailyRotateFile({
  filename: `logs/combined-%DATE%-${instanceId}.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'todo-app-api' },
  transports: [
    errorTransport,
    combinedTransport,
  ],
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
