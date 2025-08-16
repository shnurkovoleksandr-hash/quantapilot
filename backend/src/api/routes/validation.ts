import { Router } from 'express';
import { logger } from '../../utils/logger';

export const validationRouter = Router();

// API Key validation endpoint
validationRouter.get('/api-keys', async (_req, res) => {
  try {
    const validationResults = {
      timestamp: new Date().toISOString(),
      environment: process.env['NODE_ENV'] || 'development',
      apiKeys: {
        openai: {
          configured: !!process.env['OPENAI_API_KEY'],
          format: process.env['OPENAI_API_KEY']?.startsWith('sk-')
            ? 'valid'
            : 'invalid',
          length: process.env['OPENAI_API_KEY']?.length || 0,
        },
        github: {
          configured: !!process.env['GITHUB_TOKEN'],
          format: process.env['GITHUB_TOKEN']?.startsWith('ghp_')
            ? 'valid'
            : 'invalid',
          length: process.env['GITHUB_TOKEN']?.length || 0,
        },
        telegram: {
          configured: !!process.env['TELEGRAM_BOT_TOKEN'],
          format: process.env['TELEGRAM_BOT_TOKEN']?.includes(':')
            ? 'valid'
            : 'invalid',
          length: process.env['TELEGRAM_BOT_TOKEN']?.length || 0,
        },
      },
      database: {
        configured: !!process.env['DATABASE_URL'],
        hasPassword: !!process.env['DB_PASSWORD'],
      },
      redis: {
        configured: !!process.env['REDIS_URL'],
      },
      n8n: {
        configured:
          !!process.env['N8N_ENCRYPTION_KEY'] &&
          !!process.env['N8N_DB_PASSWORD'],
      },
      security: {
        jwtSecret: !!process.env['JWT_SECRET'],
        sessionSecret: !!process.env['SESSION_SECRET'],
      },
    };

    // Check if all required API keys are configured
    const allConfigured =
      validationResults.apiKeys.openai.configured &&
      validationResults.apiKeys.github.configured &&
      validationResults.apiKeys.telegram.configured;

    const allValidFormat =
      validationResults.apiKeys.openai.format === 'valid' &&
      validationResults.apiKeys.github.format === 'valid' &&
      validationResults.apiKeys.telegram.format === 'valid';

    const status = allConfigured && allValidFormat ? 'complete' : 'incomplete';

    logger.info('API key validation requested', { validationResults, status });

    res.status(200).json({
      status,
      message:
        status === 'complete'
          ? 'All API keys are configured and valid'
          : 'Some API keys need attention',
      ...validationResults,
    });
  } catch (error) {
    logger.error('API key validation failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate API keys',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Environment variables check (without exposing sensitive data)
validationRouter.get('/env-check', (_req, res) => {
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] || 'development',
    port: process.env['PORT'] || 3000,
    logLevel: process.env['LOG_LEVEL'] || 'info',
    variables: {
      openai: process.env['OPENAI_API_KEY'] ? 'configured' : 'missing',
      github: process.env['GITHUB_TOKEN'] ? 'configured' : 'missing',
      telegram: process.env['TELEGRAM_BOT_TOKEN'] ? 'configured' : 'missing',
      database: process.env['DATABASE_URL'] ? 'configured' : 'missing',
      redis: process.env['REDIS_URL'] ? 'configured' : 'missing',
      n8n: process.env['N8N_ENCRYPTION_KEY'] ? 'configured' : 'missing',
      jwt: process.env['JWT_SECRET'] ? 'configured' : 'missing',
      session: process.env['SESSION_SECRET'] ? 'configured' : 'missing',
    },
  };

  res.status(200).json(envCheck);
});
