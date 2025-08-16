import { Router } from 'express';
import { logger } from '../../utils/logger';

export const healthRouter = Router();

// Basic health check
healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
  });
});

// Detailed health check
healthRouter.get('/detailed', async (_req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      version: '1.0.0',
      services: {
        database: 'unknown', // Will be implemented when DB connection is added
        redis: 'unknown', // Will be implemented when Redis connection is added
        openai: 'unknown', // Will be implemented when OpenAI client is added
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
      },
    };

    logger.info('Health check requested', { healthStatus });
    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Readiness probe
healthRouter.get('/ready', (_req, res) => {
  // For now, always return ready since we don't have external dependencies yet
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe
healthRouter.get('/live', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
