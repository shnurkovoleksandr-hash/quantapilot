/**
 * QuantaPilot™ Notification Service
 *
 * Handles multi-channel notifications including Telegram, email, and webhooks.
 * Manages HITL decision notifications and project status updates.
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
const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

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
  defaultMeta: { service: 'notifications' },
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
// Notification Providers Configuration
// ==============================================

// Telegram Bot
let telegramBot = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
  telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: false,
  });
  logger.info('Telegram bot initialized');
} else {
  logger.warn('Telegram bot token not provided');
}

// Email transporter
let emailTransporter = null;
if (process.env.SMTP_HOST) {
  emailTransporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  logger.info('Email transporter initialized');
} else {
  logger.warn('SMTP configuration not provided');
}

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests, please try again later.',
  },
});

app.use(limiter);

// ==============================================
// Notification Templates
// ==============================================

const NOTIFICATION_TYPES = {
  PROJECT_CREATED: 'project_created',
  PROJECT_COMPLETED: 'project_completed',
  PROJECT_FAILED: 'project_failed',
  HITL_DECISION_REQUIRED: 'hitl_decision_required',
  HITL_DECISION_APPROVED: 'hitl_decision_approved',
  STAGE_COMPLETED: 'stage_completed',
  ERROR_OCCURRED: 'error_occurred',
};

const templateCache = new Map();

async function loadTemplate(templateName) {
  try {
    if (templateCache.has(templateName)) {
      return templateCache.get(templateName);
    }

    const templatePath = path.join('/app/templates', `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const template = handlebars.compile(templateContent);

    templateCache.set(templateName, template);
    return template;
  } catch (error) {
    logger.error('Template loading failed', {
      templateName,
      error: error.message,
    });
    return null;
  }
}

// ==============================================
// Notification Handlers
// ==============================================

async function sendTelegramNotification(chatId, message, options = {}) {
  if (!telegramBot) {
    throw new Error('Telegram bot not configured');
  }

  try {
    const result = await telegramBot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...options,
    });

    logger.info('Telegram notification sent', {
      chatId,
      messageId: result.message_id,
      messageLength: message.length,
    });

    return result;
  } catch (error) {
    logger.error('Telegram notification failed', {
      chatId,
      error: error.message,
    });
    throw error;
  }
}

async function sendEmailNotification(to, subject, templateName, templateData) {
  if (!emailTransporter) {
    throw new Error('Email transporter not configured');
  }

  try {
    const template = await loadTemplate(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const htmlContent = template(templateData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@quantapilot.com',
      to,
      subject,
      html: htmlContent,
    };

    const result = await emailTransporter.sendMail(mailOptions);

    logger.info('Email notification sent', {
      to,
      subject,
      messageId: result.messageId,
      templateName,
    });

    return result;
  } catch (error) {
    logger.error('Email notification failed', {
      to,
      subject,
      templateName,
      error: error.message,
    });
    throw error;
  }
}

async function sendNotification(type, recipients, data) {
  const results = [];

  for (const recipient of recipients) {
    try {
      switch (recipient.type) {
        case 'telegram':
          if (recipient.chatId) {
            const message = formatTelegramMessage(type, data);
            const result = await sendTelegramNotification(
              recipient.chatId,
              message
            );
            results.push({ type: 'telegram', status: 'success', result });
          }
          break;

        case 'email':
          if (recipient.email) {
            const subject = formatEmailSubject(type, data);
            const templateName = getEmailTemplate(type);
            const result = await sendEmailNotification(
              recipient.email,
              subject,
              templateName,
              data
            );
            results.push({ type: 'email', status: 'success', result });
          }
          break;

        default:
          logger.warn('Unknown recipient type', { type: recipient.type });
      }
    } catch (error) {
      logger.error('Notification sending failed', {
        recipientType: recipient.type,
        error: error.message,
      });
      results.push({
        type: recipient.type,
        status: 'error',
        error: error.message,
      });
    }
  }

  return results;
}

function formatTelegramMessage(type, data) {
  switch (type) {
    case NOTIFICATION_TYPES.PROJECT_CREATED:
      return (
        `🚀 *Project Created*\n\n` +
        `Project: ${data.projectName}\n` +
        `Repository: ${data.repositoryUrl}\n` +
        `Status: ${data.status}\n` +
        `Created: ${new Date(data.createdAt).toLocaleString()}`
      );

    case NOTIFICATION_TYPES.HITL_DECISION_REQUIRED:
      return (
        `⚠️ *Human Decision Required*\n\n` +
        `Project: ${data.projectName}\n` +
        `Stage: ${data.stage}\n` +
        `Decision: ${data.decisionType}\n` +
        `Context: ${data.context}\n\n` +
        `Please review and approve in the dashboard.`
      );

    case NOTIFICATION_TYPES.PROJECT_COMPLETED:
      return (
        `✅ *Project Completed*\n\n` +
        `Project: ${data.projectName}\n` +
        `Duration: ${data.duration}\n` +
        `Stages Completed: ${data.stagesCompleted}\n` +
        `Repository: ${data.repositoryUrl}`
      );

    case NOTIFICATION_TYPES.PROJECT_FAILED:
      return (
        `❌ *Project Failed*\n\n` +
        `Project: ${data.projectName}\n` +
        `Stage: ${data.stage}\n` +
        `Error: ${data.error}\n` +
        `Please check the logs for details.`
      );

    default:
      return `📢 *QuantaPilot™ Notification*\n\n${JSON.stringify(data, null, 2)}`;
  }
}

function formatEmailSubject(type, data) {
  switch (type) {
    case NOTIFICATION_TYPES.PROJECT_CREATED:
      return `QuantaPilot™ - Project Created: ${data.projectName}`;
    case NOTIFICATION_TYPES.HITL_DECISION_REQUIRED:
      return `QuantaPilot™ - Decision Required: ${data.projectName}`;
    case NOTIFICATION_TYPES.PROJECT_COMPLETED:
      return `QuantaPilot™ - Project Completed: ${data.projectName}`;
    case NOTIFICATION_TYPES.PROJECT_FAILED:
      return `QuantaPilot™ - Project Failed: ${data.projectName}`;
    default:
      return 'QuantaPilot™ - Notification';
  }
}

function getEmailTemplate(type) {
  switch (type) {
    case NOTIFICATION_TYPES.PROJECT_CREATED:
      return 'project_created';
    case NOTIFICATION_TYPES.HITL_DECISION_REQUIRED:
      return 'hitl_decision_required';
    case NOTIFICATION_TYPES.PROJECT_COMPLETED:
      return 'project_completed';
    case NOTIFICATION_TYPES.PROJECT_FAILED:
      return 'project_failed';
    default:
      return 'generic_notification';
  }
}

// ==============================================
// API Routes
// ==============================================

// Send notification
app.post('/api/v1/notifications/send', async (req, res) => {
  try {
    const { type, recipients, data } = req.body;

    if (!type || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Type and recipients array are required',
        correlationId: req.id,
      });
    }

    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
      return res.status(400).json({
        error: 'INVALID_NOTIFICATION_TYPE',
        message: `Invalid notification type. Must be one of: ${Object.values(NOTIFICATION_TYPES).join(', ')}`,
        correlationId: req.id,
      });
    }

    const results = await sendNotification(type, recipients, data);

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    res.status(200).json({
      success: true,
      data: {
        type,
        recipients: recipients.length,
        results: {
          success: successCount,
          errors: errorCount,
          details: results,
        },
      },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Notification sending error', {
      correlationId: req.id,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'NOTIFICATION_SEND_FAILED',
      message: 'Failed to send notification',
      correlationId: req.id,
    });
  }
});

// Get notification types
app.get('/api/v1/notifications/types', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      types: Object.values(NOTIFICATION_TYPES),
      providers: {
        telegram: !!telegramBot,
        email: !!emailTransporter,
      },
    },
    correlationId: req.id,
  });
});

// Test notification endpoint
app.post('/api/v1/notifications/test', async (req, res) => {
  try {
    const { type, recipient } = req.body;

    if (!type || !recipient) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Type and recipient are required',
        correlationId: req.id,
      });
    }

    const testData = {
      projectName: 'Test Project',
      repositoryUrl: 'https://github.com/test/repo',
      status: 'testing',
      createdAt: new Date().toISOString(),
    };

    const results = await sendNotification(type, [recipient], testData);

    res.status(200).json({
      success: true,
      data: {
        message: 'Test notification sent',
        results,
      },
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Test notification error', {
      correlationId: req.id,
      error: error.message,
    });

    res.status(500).json({
      error: 'TEST_NOTIFICATION_FAILED',
      message: 'Failed to send test notification',
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
    service: 'notifications',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

app.get('/health/detailed', async (req, res) => {
  const memoryUsage = process.memoryUsage();

  // Test email connectivity
  let emailStatus = 'not_configured';
  if (emailTransporter) {
    try {
      await emailTransporter.verify();
      emailStatus = 'healthy';
    } catch (error) {
      emailStatus = 'unhealthy';
      logger.warn('Email health check failed', { error: error.message });
    }
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'notifications',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    },
    providers: {
      telegram: telegramBot ? 'configured' : 'not_configured',
      email: emailStatus,
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
  logger.info(`QuantaPilot™ Notification Service started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    providers: {
      telegram: !!telegramBot,
      email: !!emailTransporter,
    },
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
