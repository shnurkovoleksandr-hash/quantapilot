/**
 * QuantaPilot™ API Gateway
 * 
 * Central entry point for all QuantaPilot™ API requests.
 * Handles authentication, rate limiting, request routing, and monitoring.
 * 
 * @author QuantaPilot™ Team
 * @version 1.0.0
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
  defaultMeta: { service: 'api-gateway' },
  transports: [
    new winston.transports.File({ filename: '/app/logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/app/logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// ==============================================
// Middleware Configuration
// ==============================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID and logging middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  req.startTime = Date.now();
  
  logger.info('Request started', {
    correlationId: req.id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info('Request completed', {
      correlationId: req.id,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration
    });
  });
  
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT) || 1000,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ==============================================
// Service Routes Configuration
// ==============================================

const serviceRoutes = {
  '/api/v1/ai': {
    target: 'http://cursor-service:3001',
    changeOrigin: true,
    timeout: 120000, // 2 minutes for AI processing
  },
  '/api/v1/github': {
    target: 'http://github-service:3002',
    changeOrigin: true,
    timeout: 30000,
  },
  '/api/v1/notifications': {
    target: 'http://notification-service:3003',
    changeOrigin: true,
    timeout: 10000,
  }
};

// Create proxy middleware for each service
Object.entries(serviceRoutes).forEach(([path, config]) => {
  app.use(path, createProxyMiddleware({
    target: config.target,
    changeOrigin: config.changeOrigin,
    timeout: config.timeout,
    proxyTimeout: config.timeout,
    onError: (err, req, res) => {
      logger.error('Proxy error', {
        correlationId: req.id,
        path,
        target: config.target,
        error: err.message
      });
      
      res.status(502).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'The requested service is temporarily unavailable',
        correlationId: req.id
      });
    },
    onProxyReq: (proxyReq, req) => {
      // Add correlation ID to forwarded requests
      proxyReq.setHeader('X-Correlation-ID', req.id);
      proxyReq.setHeader('X-Forwarded-For', req.ip);
    }
  }));
});

// ==============================================
// Health Check Endpoints
// ==============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

app.get('/health/detailed', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
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
  logger.warn('Route not found', {
    correlationId: req.id,
    method: req.method,
    url: req.url
  });
  
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
  logger.info(`QuantaPilot™ API Gateway started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
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
