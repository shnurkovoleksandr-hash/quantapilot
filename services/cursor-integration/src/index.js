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

// Import new Stage 2.1 components
const CursorCLI = require('./lib/cursor-cli');
const PromptTemplateManager = require('./lib/prompt-templates');
const TokenManager = require('./lib/token-manager');
const {
  CircuitBreaker,
  CIRCUIT_STATES,
  ERROR_CATEGORIES,
} = require('./lib/circuit-breaker');

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
    new winston.transports.File({
      filename: '/app/logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: '/app/logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// ==============================================
// Enhanced Cursor Integration Configuration
// ==============================================

// Initialize Cursor CLI wrapper
const cursorCLI = new CursorCLI({
  cursorPath: process.env.CURSOR_CLI_PATH || 'cursor',
  workspaceRoot: process.env.WORKSPACE_ROOT || '/tmp/quantapilot-projects',
  timeout: parseInt(process.env.CURSOR_CLI_TIMEOUT) || 300000,
  logger,
});

// Initialize prompt template manager
const promptManager = new PromptTemplateManager({
  templatesPath: process.env.TEMPLATES_PATH || './templates',
  logger,
});

// Initialize token manager
const tokenManager = new TokenManager({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  logger,
});

// Original Cursor API client with circuit breaker
const cursorClient = axios.create({
  baseURL: process.env.CURSOR_API_URL || 'https://api.cursor.sh/v1',
  timeout: parseInt(process.env.CURSOR_TIMEOUT) || 120000,
  headers: {
    Authorization: `Bearer ${process.env.CURSOR_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'QuantaPilot-Integration/1.0.0',
  },
});

// Wrap Cursor API calls with circuit breaker
const cursorCircuitBreaker = new CircuitBreaker({
  requestFunction: async (url, data, config) => {
    return await cursorClient.post(url, data, config);
  },
  failureThreshold: 5,
  timeout: 120000,
  resetTimeout: 60000,
  logger,
});

// ==============================================
// Middleware Configuration
// ==============================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);

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
    ip: req.ip,
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
    retryAfter: 60,
  },
});

// ==============================================
// AI Agent Configuration
// ==============================================

const AGENT_ROLES = {
  ARCHITECT: 'pr_architect',
  DEVELOPER: 'senior_developer',
  QA: 'qa_engineer',
};

const AGENT_CONFIGS = {
  [AGENT_ROLES.ARCHITECT]: {
    model: process.env.CURSOR_MODEL || 'cursor-large',
    maxTokens: 4000,
    temperature: 0.7,
    systemPrompt: `You are a Senior PR/Architect responsible for analyzing project requirements and creating comprehensive architecture designs. Focus on scalability, maintainability, and best practices.`,
  },
  [AGENT_ROLES.DEVELOPER]: {
    model: process.env.CURSOR_MODEL || 'cursor-large',
    maxTokens: 8000,
    temperature: 0.3,
    systemPrompt: `You are a Senior Developer responsible for generating production-ready code. Focus on clean, efficient, well-documented code that follows industry best practices.`,
  },
  [AGENT_ROLES.QA]: {
    model: process.env.CURSOR_MODEL || 'cursor-large',
    maxTokens: 4000,
    temperature: 0.5,
    systemPrompt: `You are a QA Engineer responsible for creating comprehensive test plans and ensuring code quality. Focus on edge cases, security, and thorough testing strategies.`,
  },
};

// ==============================================
// AI Request Handler with Retry Logic
// ==============================================

/**
 * Enhanced AI request handler with circuit breaker and token tracking
 * @param {string} prompt - AI prompt
 * @param {string} agentRole - Agent role identifier
 * @param {Object} options - Request options
 * @param {string} options.projectId - Project identifier for tracking
 * @param {string} options.userId - User identifier for tracking
 * @param {string} options.correlationId - Request correlation ID
 * @param {string} options.templateId - Prompt template ID (optional)
 * @param {Object} options.templateContext - Template context variables (optional)
 * @returns {Promise<Object>} AI response with usage tracking
 */
async function makeAIRequest(prompt, agentRole, options = {}) {
  const correlationId = options.correlationId || uuidv4();
  const startTime = Date.now();

  try {
    // Check budget before making request
    if (options.projectId && options.userId) {
      const estimatedTokens = Math.ceil(prompt.length / 4); // Rough estimation
      const budgetCheck = await tokenManager.checkRequestBudget(
        options.projectId,
        options.userId,
        agentRole,
        estimatedTokens
      );

      if (!budgetCheck.allowed) {
        throw new Error(
          `Budget limit would be exceeded: ${budgetCheck.limits.join(', ')}`
        );
      }
    }

    // Use template if specified
    let finalPrompt = prompt;
    let systemPrompt = AGENT_CONFIGS[agentRole].systemPrompt;

    if (options.templateId && options.templateContext) {
      const renderedTemplate = promptManager.renderTemplate(
        options.templateId,
        options.templateContext
      );
      finalPrompt = renderedTemplate.userPrompt;
      systemPrompt = renderedTemplate.systemPrompt;
    }

    const config = AGENT_CONFIGS[agentRole];
    const requestData = {
      model: config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: finalPrompt,
        },
      ],
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature || config.temperature,
      ...options,
    };

    logger.info('Making enhanced AI request', {
      correlationId,
      agentRole,
      model: config.model,
      promptLength: finalPrompt.length,
      templateId: options.templateId,
      projectId: options.projectId,
    });

    // Execute request through circuit breaker
    const response = await cursorCircuitBreaker.execute(
      '/chat/completions',
      requestData
    );

    const duration = Date.now() - startTime;
    const usage = response.data.usage || {};

    // Track token usage
    if (options.projectId && options.userId) {
      await tokenManager.trackUsage({
        projectId: options.projectId,
        userId: options.userId,
        agentRole,
        model: config.model,
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        correlationId,
      });
    }

    logger.info('Enhanced AI request successful', {
      correlationId,
      agentRole,
      tokensUsed: usage.total_tokens,
      responseLength: response.data.choices?.[0]?.message?.content?.length,
      duration,
    });

    return {
      ...response.data,
      metadata: {
        correlationId,
        agentRole,
        duration,
        templateId: options.templateId,
        projectId: options.projectId,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Enhanced AI request failed', {
      correlationId,
      agentRole,
      error: error.message,
      status: error.response?.status,
      duration,
      circuitState: cursorCircuitBreaker.getMetrics().state,
    });

    throw error;
  }
}

// ==============================================
// API Routes
// ==============================================

// Enhanced AI Prompt endpoint with template support
app.post('/api/v1/ai/prompt', aiLimiter, async (req, res) => {
  try {
    const {
      prompt,
      agentRole,
      options = {},
      projectId,
      userId,
      templateId,
      templateContext,
    } = req.body;

    // Validation
    if (!prompt || !agentRole) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Prompt and agentRole are required',
        correlationId: req.id,
      });
    }

    if (!Object.values(AGENT_ROLES).includes(agentRole)) {
      return res.status(400).json({
        error: 'INVALID_AGENT_ROLE',
        message: `Invalid agent role. Must be one of: ${Object.values(AGENT_ROLES).join(', ')}`,
        correlationId: req.id,
      });
    }

    // Validate template if specified
    if (templateId) {
      const template = promptManager.getTemplate(templateId);
      if (!template) {
        return res.status(400).json({
          error: 'INVALID_TEMPLATE',
          message: `Template not found: ${templateId}`,
          correlationId: req.id,
        });
      }

      if (templateContext) {
        const validation = promptManager.validateContext(
          templateId,
          templateContext
        );
        if (!validation.valid) {
          return res.status(400).json({
            error: 'INVALID_TEMPLATE_CONTEXT',
            message: 'Missing required template variables',
            details: {
              missing: validation.missingVariables,
              required: validation.requiredVariables,
            },
            correlationId: req.id,
          });
        }
      }
    }

    const enhancedOptions = {
      ...options,
      projectId,
      userId,
      correlationId: req.id,
      templateId,
      templateContext,
    };

    const aiResponse = await makeAIRequest(prompt, agentRole, enhancedOptions);

    res.status(200).json({
      success: true,
      data: {
        response: aiResponse.choices[0].message.content,
        usage: aiResponse.usage,
        model: aiResponse.model,
        agentRole,
        metadata: aiResponse.metadata,
      },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Enhanced AI prompt error', {
      correlationId: req.id,
      error: error.message,
      stack: error.stack,
      circuitState: cursorCircuitBreaker
        ? cursorCircuitBreaker.getMetrics()?.state
        : 'unknown',
    });

    // Determine appropriate error response based on error type
    let statusCode = 500;
    let errorCode = 'AI_REQUEST_FAILED';

    if (error.message.includes('Budget limit')) {
      statusCode = 429;
      errorCode = 'BUDGET_EXCEEDED';
    } else if (error.message.includes('Circuit breaker')) {
      statusCode = 503;
      errorCode = 'SERVICE_UNAVAILABLE';
    }

    res.status(statusCode).json({
      error: errorCode,
      message: error.message,
      correlationId: req.id,
    });
  }
});

// Enhanced agent status endpoint
app.get('/api/v1/ai/agents', (req, res) => {
  const circuitMetrics = cursorCircuitBreaker.getMetrics();

  res.status(200).json({
    success: true,
    data: {
      availableAgents: Object.values(AGENT_ROLES),
      agentConfigs: Object.entries(AGENT_CONFIGS).map(([role, config]) => ({
        role,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      })),
      serviceStatus: {
        circuitState: circuitMetrics.state,
        healthy: circuitMetrics.state === CIRCUIT_STATES.CLOSED,
        metrics: circuitMetrics.metrics,
      },
    },
    correlationId: req.id,
  });
});

// ==============================================
// New Stage 2.1 API Endpoints
// ==============================================

// Template management endpoints
app.get('/api/v1/ai/templates', (req, res) => {
  try {
    const { role, category } = req.query;
    let templates;

    if (role) {
      templates = promptManager.getTemplatesByRole(role);
    } else if (category) {
      templates = promptManager.getTemplatesByCategory(category);
    } else {
      templates = promptManager.getAllTemplates();
    }

    res.status(200).json({
      success: true,
      data: { templates },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Template listing error', {
      correlationId: req.id,
      error: error.message,
    });

    res.status(500).json({
      error: 'TEMPLATE_ERROR',
      message: 'Failed to retrieve templates',
      correlationId: req.id,
    });
  }
});

app.get('/api/v1/ai/templates/:templateId', (req, res) => {
  try {
    const { templateId } = req.params;
    const template = promptManager.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        error: 'TEMPLATE_NOT_FOUND',
        message: `Template not found: ${templateId}`,
        correlationId: req.id,
      });
    }

    res.status(200).json({
      success: true,
      data: { template: { id: templateId, ...template } },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Template retrieval error', {
      correlationId: req.id,
      templateId: req.params.templateId,
      error: error.message,
    });

    res.status(500).json({
      error: 'TEMPLATE_ERROR',
      message: 'Failed to retrieve template',
      correlationId: req.id,
    });
  }
});

// Token usage and budget endpoints
app.get('/api/v1/ai/usage/:scope/:identifier', async (req, res) => {
  try {
    const { scope, identifier } = req.params;
    const { timeRange = 'daily' } = req.query;

    const analytics = await tokenManager.getUsageAnalytics(scope, identifier, {
      timeRange,
    });

    res.status(200).json({
      success: true,
      data: { analytics },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Usage analytics error', {
      correlationId: req.id,
      scope: req.params.scope,
      identifier: req.params.identifier,
      error: error.message,
    });

    res.status(500).json({
      error: 'ANALYTICS_ERROR',
      message: 'Failed to retrieve usage analytics',
      correlationId: req.id,
    });
  }
});

app.get('/api/v1/ai/budget/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const budgetStatus = await tokenManager.getProjectBudgetStatus(projectId);

    res.status(200).json({
      success: true,
      data: { budgetStatus },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Budget status error', {
      correlationId: req.id,
      projectId: req.params.projectId,
      error: error.message,
    });

    res.status(500).json({
      error: 'BUDGET_ERROR',
      message: 'Failed to retrieve budget status',
      correlationId: req.id,
    });
  }
});

// Cursor CLI integration endpoints
app.post('/api/v1/cursor/project', async (req, res) => {
  try {
    const { projectId, repositoryUrl } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Project ID is required',
        correlationId: req.id,
      });
    }

    const projectPath = await cursorCLI.createProjectWorkspace(
      projectId,
      repositoryUrl
    );

    res.status(201).json({
      success: true,
      data: {
        projectId,
        projectPath,
        repositoryUrl,
      },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Project creation error', {
      correlationId: req.id,
      error: error.message,
    });

    res.status(500).json({
      error: 'PROJECT_CREATION_ERROR',
      message: 'Failed to create project workspace',
      correlationId: req.id,
    });
  }
});

app.post('/api/v1/cursor/generate', async (req, res) => {
  try {
    const { projectId, prompt, options = {} } = req.body;

    if (!projectId || !prompt) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Project ID and prompt are required',
        correlationId: req.id,
      });
    }

    const projectInfo = await cursorCLI.getProjectInfo(projectId);
    if (!projectInfo.exists) {
      return res.status(404).json({
        error: 'PROJECT_NOT_FOUND',
        message: `Project not found: ${projectId}`,
        correlationId: req.id,
      });
    }

    const result = await cursorCLI.generateCode(
      projectInfo.projectPath,
      prompt,
      options
    );

    res.status(200).json({
      success: true,
      data: { result },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Code generation error', {
      correlationId: req.id,
      error: error.message,
    });

    res.status(500).json({
      error: 'CODE_GENERATION_ERROR',
      message: 'Failed to generate code',
      correlationId: req.id,
    });
  }
});

app.get('/api/v1/cursor/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectInfo = await cursorCLI.getProjectInfo(projectId);

    res.status(200).json({
      success: true,
      data: { projectInfo },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Project info error', {
      correlationId: req.id,
      projectId: req.params.projectId,
      error: error.message,
    });

    res.status(500).json({
      error: 'PROJECT_INFO_ERROR',
      message: 'Failed to retrieve project information',
      correlationId: req.id,
    });
  }
});

// Circuit breaker health and metrics
app.get('/api/v1/system/health', async (req, res) => {
  try {
    const circuitHealth = cursorCircuitBreaker.getHealthReport();
    const cursorCLIAvailable = await cursorCLI.checkCursorAvailability();

    const systemHealth = {
      overall:
        circuitHealth.healthy && cursorCLIAvailable ? 'healthy' : 'degraded',
      components: {
        circuitBreaker: circuitHealth,
        cursorCLI: {
          available: cursorCLIAvailable,
          healthy: cursorCLIAvailable,
        },
        promptManager: {
          templatesLoaded: promptManager.getAllTemplates().length,
          healthy: true,
        },
        tokenManager: {
          healthy: true,
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      data: { systemHealth },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('System health check error', {
      correlationId: req.id,
      error: error.message,
    });

    res.status(500).json({
      error: 'HEALTH_CHECK_ERROR',
      message: 'Failed to retrieve system health',
      correlationId: req.id,
    });
  }
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
    uptime: process.uptime(),
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
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    },
    dependencies: {
      cursorApi: cursorApiStatus,
    },
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
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
    correlationId: req.id,
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', {
    correlationId: req.id,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    correlationId: req.id,
  });
});

// ==============================================
// Server Startup
// ==============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(
    `QuantaPilot™ Cursor Integration Service started on port ${PORT}`,
    {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      cursorApiUrl: process.env.CURSOR_API_URL,
    }
  );
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
