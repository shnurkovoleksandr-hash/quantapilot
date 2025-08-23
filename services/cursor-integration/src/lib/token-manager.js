/**
 * QuantaPilot™ Token Usage Tracking and Management System
 *
 * Manages AI token usage, budget enforcement, and cost optimization.
 * Provides real-time tracking and alerts for token consumption.
 *
 * @author QuantaPilot™ Team
 * @version 1.0.0
 */

const winston = require('winston');
const redis = require('redis');

/**
 * Token manager for AI usage tracking and budget enforcement
 *
 * Features:
 * - Real-time token usage tracking
 * - Budget limit enforcement
 * - Cost calculation and optimization
 * - Usage analytics and reporting
 * - Alert system for budget thresholds
 *
 * @class TokenManager
 */
class TokenManager {
  /**
   * Initialize token manager
   * @param {Object} config - Configuration object
   * @param {Object} config.redis - Redis configuration
   * @param {Object} config.logger - Winston logger instance
   * @param {Object} config.pricing - AI model pricing configuration
   */
  constructor(config = {}) {
    this.logger =
      config.logger ||
      winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        defaultMeta: { service: 'token-manager' },
        transports: [new winston.transports.Console()],
      });

    // Initialize Redis client for token tracking
    this.initializeRedis(config.redis || {});

    // AI Model pricing (tokens per USD)
    this.pricing = {
      'cursor-large': {
        input: 0.00003, // $0.00003 per input token
        output: 0.00006, // $0.00006 per output token
      },
      'cursor-medium': {
        input: 0.00002,
        output: 0.00004,
      },
      'cursor-small': {
        input: 0.00001,
        output: 0.00002,
      },
      ...config.pricing,
    };

    // Default budget settings
    this.defaultBudgets = {
      project: {
        maxTokens: 100000,
        maxCostUSD: 50.0,
        warningThreshold: 0.8,
        dailyLimit: 25000,
      },
      user: {
        dailyTokens: 50000,
        monthlyCostUSD: 200.0,
        warningThreshold: 0.85,
      },
      agent: {
        pr_architect: { maxTokens: 30000 },
        senior_developer: { maxTokens: 50000 },
        qa_engineer: { maxTokens: 20000 },
      },
    };
  }

  /**
   * Initialize Redis connection
   * @param {Object} redisConfig - Redis configuration
   */
  async initializeRedis(redisConfig) {
    try {
      this.redis = redis.createClient({
        host: redisConfig.host || 'localhost',
        port: redisConfig.port || 6379,
        password: redisConfig.password,
        db: redisConfig.db || 0,
        ...redisConfig,
      });

      this.redis.on('error', error => {
        this.logger.error('Redis connection error', { error: error.message });
      });

      this.redis.on('connect', () => {
        this.logger.info('Redis connected successfully');
      });

      // Only connect if not in test environment
      if (process.env.NODE_ENV !== 'test') {
        await this.redis.connect();
      }
    } catch (error) {
      this.logger.error('Failed to initialize Redis', { error: error.message });
      // Don't throw in test environment
      if (process.env.NODE_ENV !== 'test') {
        throw error;
      }
    }
  }

  /**
   * Track token usage for an AI request
   * @param {Object} usage - Token usage data
   * @param {string} usage.projectId - Project identifier
   * @param {string} usage.userId - User identifier
   * @param {string} usage.agentRole - AI agent role
   * @param {string} usage.model - AI model used
   * @param {number} usage.inputTokens - Input tokens consumed
   * @param {number} usage.outputTokens - Output tokens generated
   * @param {number} usage.totalTokens - Total tokens used
   * @param {string} usage.correlationId - Request correlation ID
   * @returns {Promise<Object>} Usage tracking result with cost calculation
   */
  async trackUsage(usage) {
    try {
      const timestamp = new Date().toISOString();
      const cost = this.calculateCost(
        usage.model,
        usage.inputTokens,
        usage.outputTokens
      );

      const trackingData = {
        ...usage,
        cost,
        timestamp,
        trackingId: `${usage.correlationId}-${Date.now()}`,
      };

      // Store detailed usage record
      await this.storeUsageRecord(trackingData);

      // Update aggregated counters
      await this.updateUsageCounters(trackingData);

      // Check budget limits
      const budgetStatus = await this.checkBudgetLimits(trackingData);

      this.logger.info('Token usage tracked', {
        projectId: usage.projectId,
        agentRole: usage.agentRole,
        totalTokens: usage.totalTokens,
        cost: cost.total,
        budgetStatus: budgetStatus.status,
      });

      return {
        success: true,
        trackingId: trackingData.trackingId,
        cost,
        budgetStatus,
        timestamp,
      };
    } catch (error) {
      this.logger.error('Failed to track token usage', {
        error: error.message,
        usage,
      });
      throw error;
    }
  }

  /**
   * Calculate cost for token usage
   * @param {string} model - AI model identifier
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @returns {Object} Cost breakdown
   */
  calculateCost(model, inputTokens, outputTokens) {
    const modelPricing = this.pricing[model] || this.pricing['cursor-large'];

    const inputCost = (inputTokens || 0) * modelPricing.input;
    const outputCost = (outputTokens || 0) * modelPricing.output;
    const total = inputCost + outputCost;

    return {
      inputCost: parseFloat(inputCost.toFixed(6)),
      outputCost: parseFloat(outputCost.toFixed(6)),
      total: parseFloat(total.toFixed(6)),
      model,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
    };
  }

  /**
   * Store detailed usage record
   * @param {Object} trackingData - Complete tracking data
   */
  async storeUsageRecord(trackingData) {
    const key = `usage:record:${trackingData.trackingId}`;
    await this.redis.setEx(key, 86400 * 30, JSON.stringify(trackingData)); // 30 days retention
  }

  /**
   * Update aggregated usage counters
   * @param {Object} trackingData - Tracking data for aggregation
   */
  async updateUsageCounters(trackingData) {
    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().substring(0, 7);

    // Update project counters
    await this.incrementCounter(
      `usage:project:${trackingData.projectId}:tokens`,
      trackingData.totalTokens
    );
    await this.incrementCounter(
      `usage:project:${trackingData.projectId}:cost`,
      trackingData.cost.total
    );
    await this.incrementCounter(
      `usage:project:${trackingData.projectId}:daily:${today}:tokens`,
      trackingData.totalTokens
    );

    // Update user counters
    await this.incrementCounter(
      `usage:user:${trackingData.userId}:daily:${today}:tokens`,
      trackingData.totalTokens
    );
    await this.incrementCounter(
      `usage:user:${trackingData.userId}:monthly:${month}:cost`,
      trackingData.cost.total
    );

    // Update agent role counters
    await this.incrementCounter(
      `usage:agent:${trackingData.agentRole}:tokens`,
      trackingData.totalTokens
    );
    await this.incrementCounter(
      `usage:agent:${trackingData.agentRole}:daily:${today}:tokens`,
      trackingData.totalTokens
    );

    // Update model counters
    await this.incrementCounter(
      `usage:model:${trackingData.model}:tokens`,
      trackingData.totalTokens
    );
    await this.incrementCounter(
      `usage:model:${trackingData.model}:requests`,
      1
    );
  }

  /**
   * Increment a counter in Redis
   * @param {string} key - Counter key
   * @param {number} value - Value to increment by
   */
  async incrementCounter(key, value) {
    await this.redis.incrByFloat(key, value);
    await this.redis.expire(key, 86400 * 90); // 90 days retention
  }

  /**
   * Check budget limits and warnings
   * @param {Object} trackingData - Current usage data
   * @returns {Promise<Object>} Budget status with warnings
   */
  async checkBudgetLimits(trackingData) {
    const projectBudget = await this.getProjectBudgetStatus(
      trackingData.projectId
    );
    const userBudget = await this.getUserBudgetStatus(trackingData.userId);
    const agentBudget = await this.getAgentBudgetStatus(trackingData.agentRole);

    const status = {
      overall: 'healthy',
      project: projectBudget,
      user: userBudget,
      agent: agentBudget,
      warnings: [],
      limits: [],
    };

    // Check for budget warnings and limits
    if (
      projectBudget.tokenUsagePercent >
      this.defaultBudgets.project.warningThreshold
    ) {
      status.warnings.push('Project token budget approaching limit');
    }

    if (
      projectBudget.costUsagePercent >
      this.defaultBudgets.project.warningThreshold
    ) {
      status.warnings.push('Project cost budget approaching limit');
    }

    if (
      userBudget.dailyUsagePercent > this.defaultBudgets.user.warningThreshold
    ) {
      status.warnings.push('User daily token limit approaching');
    }

    // Check for hard limits
    if (projectBudget.tokenUsagePercent >= 1.0) {
      status.limits.push('Project token budget exceeded');
      status.overall = 'limit_exceeded';
    }

    if (projectBudget.costUsagePercent >= 1.0) {
      status.limits.push('Project cost budget exceeded');
      status.overall = 'limit_exceeded';
    }

    if (userBudget.dailyUsagePercent >= 1.0) {
      status.limits.push('User daily token limit exceeded');
      status.overall = 'limit_exceeded';
    }

    return status;
  }

  /**
   * Get project budget status
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Project budget status
   */
  async getProjectBudgetStatus(projectId) {
    const tokensUsed = parseFloat(
      (await this.redis.get(`usage:project:${projectId}:tokens`)) || '0'
    );
    const costUsed = parseFloat(
      (await this.redis.get(`usage:project:${projectId}:cost`)) || '0'
    );

    const budget = this.defaultBudgets.project;

    return {
      tokensUsed,
      tokensLimit: budget.maxTokens,
      tokenUsagePercent: tokensUsed / budget.maxTokens,
      costUsed,
      costLimit: budget.maxCostUSD,
      costUsagePercent: costUsed / budget.maxCostUSD,
    };
  }

  /**
   * Get user budget status
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} User budget status
   */
  async getUserBudgetStatus(userId) {
    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().substring(0, 7);

    const dailyTokens = parseFloat(
      (await this.redis.get(`usage:user:${userId}:daily:${today}:tokens`)) ||
        '0'
    );
    const monthlyCost = parseFloat(
      (await this.redis.get(`usage:user:${userId}:monthly:${month}:cost`)) ||
        '0'
    );

    const budget = this.defaultBudgets.user;

    return {
      dailyTokensUsed: dailyTokens,
      dailyTokensLimit: budget.dailyTokens,
      dailyUsagePercent: dailyTokens / budget.dailyTokens,
      monthlyCostUsed: monthlyCost,
      monthlyCostLimit: budget.monthlyCostUSD,
      monthlyUsagePercent: monthlyCost / budget.monthlyCostUSD,
    };
  }

  /**
   * Get agent budget status
   * @param {string} agentRole - Agent role
   * @returns {Promise<Object>} Agent budget status
   */
  async getAgentBudgetStatus(agentRole) {
    const tokensUsed = parseFloat(
      (await this.redis.get(`usage:agent:${agentRole}:tokens`)) || '0'
    );
    const budget =
      this.defaultBudgets.agent[agentRole] ||
      this.defaultBudgets.agent.senior_developer;

    return {
      tokensUsed,
      tokensLimit: budget.maxTokens,
      usagePercent: tokensUsed / budget.maxTokens,
    };
  }

  /**
   * Check if request is within budget limits
   * @param {string} projectId - Project identifier
   * @param {string} userId - User identifier
   * @param {string} agentRole - Agent role
   * @param {number} estimatedTokens - Estimated tokens for request
   * @returns {Promise<Object>} Budget check result
   */
  async checkRequestBudget(projectId, userId, agentRole, estimatedTokens) {
    const projectBudget = await this.getProjectBudgetStatus(projectId);
    const userBudget = await this.getUserBudgetStatus(userId);
    const agentBudget = await this.getAgentBudgetStatus(agentRole);

    const result = {
      allowed: true,
      warnings: [],
      limits: [],
    };

    // Check if request would exceed limits
    const projectTokensAfter = projectBudget.tokensUsed + estimatedTokens;
    const userDailyAfter = userBudget.dailyTokensUsed + estimatedTokens;
    const agentTokensAfter = agentBudget.tokensUsed + estimatedTokens;

    if (projectTokensAfter > this.defaultBudgets.project.maxTokens) {
      result.allowed = false;
      result.limits.push('Request would exceed project token budget');
    }

    if (userDailyAfter > this.defaultBudgets.user.dailyTokens) {
      result.allowed = false;
      result.limits.push('Request would exceed user daily token limit');
    }

    const agentMaxTokens =
      this.defaultBudgets.agent[agentRole]?.maxTokens ||
      this.defaultBudgets.agent.senior_developer.maxTokens;
    if (agentTokensAfter > agentMaxTokens) {
      result.warnings.push('Request approaches agent token limit');
    }

    return result;
  }

  /**
   * Get comprehensive usage analytics
   * @param {string} scope - Analytics scope (project, user, agent, global)
   * @param {string} identifier - Scope identifier
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Usage analytics data
   */
  async getUsageAnalytics(scope, identifier, options = {}) {
    const timeRange = options.timeRange || 'daily';
    const analytics = {
      scope,
      identifier,
      timeRange,
      summary: {},
      breakdown: {},
      trends: {},
    };

    try {
      switch (scope) {
        case 'project':
          analytics.summary = await this.getProjectAnalytics(
            identifier,
            timeRange
          );
          break;
        case 'user':
          analytics.summary = await this.getUserAnalytics(
            identifier,
            timeRange
          );
          break;
        case 'agent':
          analytics.summary = await this.getAgentAnalytics(
            identifier,
            timeRange
          );
          break;
        case 'global':
          analytics.summary = await this.getGlobalAnalytics(timeRange);
          break;
      }

      this.logger.info('Usage analytics generated', {
        scope,
        identifier,
        timeRange,
      });

      return analytics;
    } catch (error) {
      this.logger.error('Failed to generate usage analytics', {
        scope,
        identifier,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get project-specific analytics
   * @param {string} projectId - Project identifier
   * @param {string} timeRange - Time range for analytics
   * @returns {Promise<Object>} Project analytics
   */
  async getProjectAnalytics(projectId, timeRange) {
    const tokensUsed = parseFloat(
      (await this.redis.get(`usage:project:${projectId}:tokens`)) || '0'
    );
    const costUsed = parseFloat(
      (await this.redis.get(`usage:project:${projectId}:cost`)) || '0'
    );

    return {
      totalTokens: tokensUsed,
      totalCost: costUsed,
      budgetStatus: await this.getProjectBudgetStatus(projectId),
    };
  }

  /**
   * Get user-specific analytics
   * @param {string} userId - User identifier
   * @param {string} timeRange - Time range for analytics
   * @returns {Promise<Object>} User analytics
   */
  async getUserAnalytics(userId, timeRange) {
    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().substring(0, 7);

    const dailyTokens = parseFloat(
      (await this.redis.get(`usage:user:${userId}:daily:${today}:tokens`)) ||
        '0'
    );
    const monthlyCost = parseFloat(
      (await this.redis.get(`usage:user:${userId}:monthly:${month}:cost`)) ||
        '0'
    );

    return {
      dailyTokens,
      monthlyCost,
      budgetStatus: await this.getUserBudgetStatus(userId),
    };
  }

  /**
   * Get agent-specific analytics
   * @param {string} agentRole - Agent role
   * @param {string} timeRange - Time range for analytics
   * @returns {Promise<Object>} Agent analytics
   */
  async getAgentAnalytics(agentRole, timeRange) {
    const tokensUsed = parseFloat(
      (await this.redis.get(`usage:agent:${agentRole}:tokens`)) || '0'
    );

    return {
      totalTokens: tokensUsed,
      budgetStatus: await this.getAgentBudgetStatus(agentRole),
    };
  }

  /**
   * Get global analytics
   * @param {string} timeRange - Time range for analytics
   * @returns {Promise<Object>} Global analytics
   */
  async getGlobalAnalytics(timeRange) {
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
    };
  }

  /**
   * Set project budget limits
   * @param {string} projectId - Project identifier
   * @param {Object} budget - Budget configuration
   */
  async setProjectBudget(projectId, budget) {
    const budgetKey = `budget:project:${projectId}`;
    await this.redis.setEx(budgetKey, 86400 * 365, JSON.stringify(budget)); // 1 year retention

    this.logger.info('Project budget updated', {
      projectId,
      budget,
    });
  }

  /**
   * Reset usage counters for testing or new periods
   * @param {string} scope - Reset scope (project, user, agent)
   * @param {string} identifier - Scope identifier
   */
  async resetUsageCounters(scope, identifier) {
    const pattern = `usage:${scope}:${identifier}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(keys);
    }

    this.logger.info('Usage counters reset', {
      scope,
      identifier,
      keysDeleted: keys.length,
    });
  }

  /**
   * Generate token usage report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Comprehensive usage report
   */
  async generateUsageReport(options = {}) {
    const report = {
      generatedAt: new Date().toISOString(),
      period: options.period || 'current',
      summary: {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
      },
      breakdown: {
        byAgent: {},
        byModel: {},
        byProject: {},
      },
      trends: {},
      recommendations: [],
    };

    // Add implementation for comprehensive reporting
    // This would aggregate data from various Redis keys

    return report;
  }
}

module.exports = TokenManager;
