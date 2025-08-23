/**
 * QuantaPilot™ GitHub Integration Service
 *
 * Handles GitHub API integration, repository management, and webhook processing.
 * Manages repository analysis, code commits, and pull request creation.
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
const { Octokit } = require('@octokit/rest');
// const { Webhooks } = require('@octokit/webhooks'); // TODO: Implement webhook handling
const crypto = require('crypto');
// const simpleGit = require('simple-git'); // TODO: Implement Git operations
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

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
  defaultMeta: { service: 'github-integration' },
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
// GitHub API Configuration
// ==============================================
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'QuantaPilot-Integration/1.0.0',
});

// TODO: Implement webhook handling
// const webhooks = new Webhooks({
//   secret: process.env.GITHUB_WEBHOOK_SECRET,
// });

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

// Raw body parsing for webhooks
app.use('/api/v1/github/webhooks', express.raw({ type: 'application/json' }));

// Regular body parsing for other endpoints
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
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests, please try again later.',
  },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Allow more webhooks
  message: {
    error: 'WEBHOOK_RATE_LIMITED',
    message: 'Too many webhook requests.',
  },
});

app.use('/api/v1/github', generalLimiter);
app.use('/api/v1/github/webhooks', webhookLimiter);

// ==============================================
// Repository Management Functions
// ==============================================

async function analyzeRepository(owner, repo) {
  try {
    logger.info('Analyzing repository', { owner, repo });

    // Get repository info
    const { data: repoInfo } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    // Get README content
    let readmeContent = null;
    try {
      const { data: readme } = await octokit.rest.repos.getReadme({
        owner,
        repo,
      });
      readmeContent = Buffer.from(readme.content, 'base64').toString();
    } catch (error) {
      logger.warn('README not found', { owner, repo });
    }

    // Get languages
    const { data: languages } = await octokit.rest.repos.listLanguages({
      owner,
      repo,
    });

    // Get recent commits
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 10,
    });

    // Get repository structure (top-level files)
    const { data: contents } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
    });

    return {
      repository: {
        name: repoInfo.name,
        fullName: repoInfo.full_name,
        description: repoInfo.description,
        url: repoInfo.html_url,
        cloneUrl: repoInfo.clone_url,
        defaultBranch: repoInfo.default_branch,
        language: repoInfo.language,
        size: repoInfo.size,
        stargazersCount: repoInfo.stargazers_count,
        forksCount: repoInfo.forks_count,
        openIssuesCount: repoInfo.open_issues_count,
        createdAt: repoInfo.created_at,
        updatedAt: repoInfo.updated_at,
      },
      readme: readmeContent,
      languages,
      recentCommits: commits.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author,
        date: commit.commit.author.date,
      })),
      structure: contents.map(item => ({
        name: item.name,
        type: item.type,
        size: item.size,
      })),
    };
  } catch (error) {
    logger.error('Repository analysis failed', {
      owner,
      repo,
      error: error.message,
    });
    throw error;
  }
}

async function createBranch(owner, repo, branchName, baseBranch = 'main') {
  try {
    // Get the SHA of the base branch
    const { data: baseRef } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });

    // Create new branch
    const { data: newRef } = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseRef.object.sha,
    });

    logger.info('Branch created', {
      owner,
      repo,
      branchName,
      baseBranch,
      sha: newRef.object.sha,
    });

    return newRef;
  } catch (error) {
    logger.error('Branch creation failed', {
      owner,
      repo,
      branchName,
      error: error.message,
    });
    throw error;
  }
}

async function createPullRequest(
  owner,
  repo,
  title,
  body,
  headBranch,
  baseBranch = 'main'
) {
  try {
    const { data: pullRequest } = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head: headBranch,
      base: baseBranch,
    });

    logger.info('Pull request created', {
      owner,
      repo,
      pullRequestNumber: pullRequest.number,
      title,
      headBranch,
      baseBranch,
    });

    return pullRequest;
  } catch (error) {
    logger.error('Pull request creation failed', {
      owner,
      repo,
      title,
      error: error.message,
    });
    throw error;
  }
}

// ==============================================
// API Routes
// ==============================================

// Analyze repository
app.post('/api/v1/github/repositories/analyze', async (req, res) => {
  try {
    const { repositoryUrl } = req.body;

    if (!repositoryUrl) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Repository URL is required',
        correlationId: req.id,
      });
    }

    // Parse GitHub URL
    const urlMatch = repositoryUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!urlMatch) {
      return res.status(400).json({
        error: 'INVALID_REPOSITORY_URL',
        message: 'Invalid GitHub repository URL',
        correlationId: req.id,
      });
    }

    const [, owner, repo] = urlMatch;
    const repoName = repo.replace('.git', '');

    const analysis = await analyzeRepository(owner, repoName);

    res.status(200).json({
      success: true,
      data: analysis,
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Repository analysis error', {
      correlationId: req.id,
      error: error.message,
      stack: error.stack,
    });

    const statusCode = error.status === 404 ? 404 : 500;
    const errorMessage =
      error.status === 404
        ? 'Repository not found'
        : 'Failed to analyze repository';

    res.status(statusCode).json({
      error: 'REPOSITORY_ANALYSIS_FAILED',
      message: errorMessage,
      correlationId: req.id,
    });
  }
});

// Create branch
app.post('/api/v1/github/repositories/branches', async (req, res) => {
  try {
    const { owner, repo, branchName, baseBranch } = req.body;

    if (!owner || !repo || !branchName) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Owner, repo, and branchName are required',
        correlationId: req.id,
      });
    }

    const branch = await createBranch(owner, repo, branchName, baseBranch);

    res.status(201).json({
      success: true,
      data: branch,
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Branch creation error', {
      correlationId: req.id,
      error: error.message,
    });

    res.status(500).json({
      error: 'BRANCH_CREATION_FAILED',
      message: 'Failed to create branch',
      correlationId: req.id,
    });
  }
});

// Create pull request
app.post('/api/v1/github/repositories/pull-requests', async (req, res) => {
  try {
    const { owner, repo, title, body, headBranch, baseBranch } = req.body;

    if (!owner || !repo || !title || !headBranch) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Owner, repo, title, and headBranch are required',
        correlationId: req.id,
      });
    }

    const pullRequest = await createPullRequest(
      owner,
      repo,
      title,
      body,
      headBranch,
      baseBranch
    );

    res.status(201).json({
      success: true,
      data: pullRequest,
      correlationId: req.id,
    });
  } catch (error) {
    logger.error('Pull request creation error', {
      correlationId: req.id,
      error: error.message,
    });

    res.status(500).json({
      error: 'PULL_REQUEST_CREATION_FAILED',
      message: 'Failed to create pull request',
      correlationId: req.id,
    });
  }
});

// Webhook endpoint
app.post('/api/v1/github/webhooks', async (req, res) => {
  try {
    const signature = req.get('x-hub-signature-256');
    const payload = req.body;

    // Verify webhook signature
    if (process.env.GITHUB_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      if (signature !== `sha256=${expectedSignature}`) {
        logger.warn('Invalid webhook signature', { signature });
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.get('x-github-event');
    const parsedPayload = JSON.parse(payload.toString());

    logger.info('Webhook received', {
      event,
      repository: parsedPayload.repository?.full_name,
      action: parsedPayload.action,
    });

    // Process webhook based on event type
    switch (event) {
      case 'push':
        logger.info('Push event received', {
          repository: parsedPayload.repository.full_name,
          ref: parsedPayload.ref,
          commits: parsedPayload.commits.length,
        });
        break;

      case 'pull_request':
        logger.info('Pull request event received', {
          repository: parsedPayload.repository.full_name,
          action: parsedPayload.action,
          number: parsedPayload.number,
        });
        break;

      case 'issues':
        logger.info('Issue event received', {
          repository: parsedPayload.repository.full_name,
          action: parsedPayload.action,
          number: parsedPayload.issue.number,
        });
        break;

      default:
        logger.info('Unhandled webhook event', { event });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'WEBHOOK_PROCESSING_FAILED',
      message: 'Failed to process webhook',
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
    service: 'github-integration',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

app.get('/health/detailed', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  let githubApiStatus = 'unknown';

  try {
    await octokit.rest.meta.get();
    githubApiStatus = 'healthy';
  } catch (error) {
    githubApiStatus = 'unhealthy';
    logger.warn('GitHub API health check failed', { error: error.message });
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'github-integration',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    },
    dependencies: {
      githubApi: githubApiStatus,
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
    `QuantaPilot™ GitHub Integration Service started on port ${PORT}`,
    {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
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
