/**
 * QuantaPilot™ Cursor Integration Service
 * 
 * Handles AI agent communication with Cursor API for autonomous development.
 * Manages PR/Architect, Senior Developer, and QA Engineer agent interactions.
 * 
 * @author QuantaPilot™ Team
 * @version 1.0.0
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const retry = require('retry');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ==============================================
// Logging Configuration
// ==============================================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cursor-integration' },
  transports: [
    new winston.transports.File({ filename: '/app/logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/app/logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// ==============================================
// Cursor API Configuration
// ==============================================
const cursorClient = axios.create({
  baseURL: process.env.CURSOR_API_URL || 'https://api.cursor.sh/v1',
  timeout: parseInt(process.env.CURSOR_TIMEOUT) || 120000,
  headers: {
    'Authorization': `Bearer ${process.env.CURSOR_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'QuantaPilot-Integration/1.0.0'
  }
});

// ==============================================
// Middleware Configuration
// ==============================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request ID and logging middleware
app.use((req, res, next) => {
  req.id = req.headers['x-correlation-id'] || uuidv4();
  req.startTime = Date.now();
  
  logger.info('Request started', {
    correlationId: req.id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next();
});

// Rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit AI requests per minute
  message: {
    error: 'AI_RATE_LIMITED',
    message: 'Too many AI requests, please try again later.',
    retryAfter: 60
  }
});

// ==============================================
// AI Agent Configuration
// ==============================================

const AGENT_ROLES = {
  ARCHITECT: 'pr_architect',
  DEVELOPER: 'senior_developer',
  QA: 'qa_engineer'
};

const AGENT_CONFIGS = {
  [AGENT_ROLES.ARCHITECT]: {
    model: process.env.CURSOR_MODEL || 'cursor-large',
    maxTokens: 4000,
    temperature: 0.7,
    systemPrompt: `You are a Senior PR/Architect responsible for analyzing project requirements and creating comprehensive architecture designs. Focus on scalability, maintainability, and best practices.`
  },
  [AGENT_ROLES.DEVELOPER]: {
    model: process.env.CURSOR_MODEL || 'cursor-large',
    maxTokens: 8000,
    temperature: 0.3,
    systemPrompt: `You are a Senior Developer responsible for generating production-ready code. Focus on clean, efficient, well-documented code that follows industry best practices.`
  },
  [AGENT_ROLES.QA]: {
    model: process.env.CURSOR_MODEL || 'cursor-large',
    maxTokens: 4000,
    temperature: 0.5,
    systemPrompt: `You are a QA Engineer responsible for creating comprehensive test plans and ensuring code quality. Focus on edge cases, security, and thorough testing strategies.`
  }
};

// ==============================================
// AI Request Handler with Retry Logic
// ==============================================

async function makeAIRequest(prompt, agentRole, options = {}) {
  const operation = retry.operation({
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 10000
  });

  return new Promise((resolve, reject) => {
    operation.attempt(async (currentAttempt) => {
      try {
        const config = AGENT_CONFIGS[agentRole];
        const requestData = {
          model: config.model,
          messages: [
            {
              role: 'system',
              content: config.systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: options.maxTokens || config.maxTokens,
          temperature: options.temperature || config.temperature,
          ...options
        };

        logger.info('Making AI request', {
          agentRole,
          attempt: currentAttempt,
          model: config.model,
          promptLength: prompt.length
        });

        const response = await cursorClient.post('/chat/completions', requestData);
        
        logger.info('AI request successful', {
          agentRole,
          attempt: currentAttempt,
          tokensUsed: response.data.usage?.total_tokens,
          responseLength: response.data.choices?.[0]?.message?.content?.length
        });

        resolve(response.data);
      } catch (error) {
        logger.error('AI request failed', {
          agentRole,
          attempt: currentAttempt,
          error: error.message,
          status: error.response?.status
        });

        if (operation.retry(error)) {
          return;
        }

        reject(operation.mainError());
      }
    });
  });
}

// ==============================================
// API Routes
// ==============================================

// AI Prompt endpoint
app.post('/api/v1/ai/prompt', aiLimiter, async (req, res) => {
  try {
    const { prompt, agentRole, options = {} } = req.body;

    if (!prompt || !agentRole) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Prompt and agentRole are required',
        correlationId: req.id
      });
    }

    if (!Object.values(AGENT_ROLES).includes(agentRole)) {
      return res.status(400).json({
        error: 'INVALID_AGENT_ROLE',
        message: `Invalid agent role. Must be one of: ${Object.values(AGENT_ROLES).join(', ')}`,
        correlationId: req.id
      });
    }

    const aiResponse = await makeAIRequest(prompt, agentRole, options);

    res.status(200).json({
      success: true,
      data: {
        response: aiResponse.choices[0].message.content,
        usage: aiResponse.usage,
        model: aiResponse.model,
        agentRole
      },
      correlationId: req.id
    });

  } catch (error) {
    logger.error('AI prompt error', {
      correlationId: req.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'AI_REQUEST_FAILED',
      message: 'Failed to process AI request',
      correlationId: req.id
    });
  }
});

// Agent status endpoint
app.get('/api/v1/ai/agents', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      availableAgents: Object.values(AGENT_ROLES),
      agentConfigs: Object.entries(AGENT_CONFIGS).map(([role, config]) => ({
        role,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature
      }))
    },
    correlationId: req.id
  });
});

// ==============================================
// Health Check Endpoints
// ==============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cursor-integration',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

app.get('/health/detailed', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  let cursorApiStatus = 'unknown';

  try {
    await cursorClient.get('/models', { timeout: 5000 });
    cursorApiStatus = 'healthy';
  } catch (error) {
    cursorApiStatus = 'unhealthy';
    logger.warn('Cursor API health check failed', { error: error.message });
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cursor-integration',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    },
    dependencies: {
      cursorApi: cursorApiStatus
    },
    environment: process.env.NODE_ENV,
    nodeVersion: process.version
  });
});

// ==============================================
// Error Handling
// ==============================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested endpoint was not found',
    correlationId: req.id
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    correlationId: req.id,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    correlationId: req.id
  });
});

// ==============================================
// Server Startup
// ==============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`QuantaPilot™ Cursor Integration Service started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    cursorApiUrl: process.env.CURSOR_API_URL
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
