import app from './app';
import { connectDB } from './config/database';
import { config } from './config/config';
import logger from './utils/logger';
import { equilibriumEngine } from './scheduler/equilibrium';

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(config.port, () => {
      logger.info(`🚀 Equilibrium backend running on port ${config.port} [${config.nodeEnv}]`);
      // Start the autonomous equilibrium cron engine
      equilibriumEngine.start();
      logger.info('⚖️  EquilibriumEngine started (15-min cycle + midnight pre-generation)');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        const { disconnectDB } = await import('./config/database');
        await disconnectDB();
        logger.info('Server shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
