module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './src/index.js',
      instances: 'max', // or a specific number like 4
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'email-worker',
      script: './src/workers/emailSyncWorker.js',
      instances: 1, // Only 1 worker instance to manage the Bull queue scheduling
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'archive-worker',
      script: './src/workers/notificationArchiveWorker.js',
      instances: 1, // Only 1 worker instance for cron scheduling
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      }
    }
  ]
};
