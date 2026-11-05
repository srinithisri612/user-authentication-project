const app = require('./app');
const config = require('./config/env');
const { initDatabase, db } = require('./config/database');

const startServer = async () => {
  try {
    // 1. Initialize SQLite database schema
    await initDatabase();

    // 2. Start HTTP server
    const server = app.listen(config.port, () => {
      console.log('====================================================');
      console.log(`🚀 Authentication Server running in [${config.nodeEnv}] mode`);
      console.log(`🌐 Server URL: http://localhost:${config.port}`);
      console.log(`🔒 Health Check: http://localhost:${config.port}/api/health`);
      console.log('====================================================');
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
            process.exit(1);
          }
          console.log('SQLite database connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
