/**
 * Unit tests for Token Manager
 * @jest-environment node
 */

const TokenManager = require('../src/lib/token-manager');
const winston = require('winston');

// Redis mocking is now handled globally in jest.setup.js

describe('TokenManager', () => {
  let tokenManager;
  let mockLogger;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockLogger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console({ silent: true })],
    });

    global.global.mockRedis.connect.mockResolvedValue();

    tokenManager = new TokenManager({
      redis: {
        host: 'localhost',
        port: 6379,
      },
      logger: mockLogger,
    });

    await tokenManager.initializeRedis({});
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(tokenManager.pricing).toBeDefined();
      expect(tokenManager.defaultBudgets).toBeDefined();
    });

    it('should initialize with custom pricing', async () => {
      const customPricing = {
        'custom-model': {
          input: 0.00001,
          output: 0.00002,
        },
      };

      const manager = new TokenManager({
        pricing: customPricing,
        logger: mockLogger,
      });

      expect(manager.pricing['custom-model']).toEqual(
        customPricing['custom-model']
      );
    });
  });

  describe('cost calculation', () => {
    it('should calculate cost correctly for known model', () => {
      const cost = tokenManager.calculateCost('cursor-large', 1000, 500);

      expect(cost.inputCost).toBe(0.03); // 1000 * 0.00003
      expect(cost.outputCost).toBe(0.03); // 500 * 0.00006
      expect(cost.total).toBe(0.06);
      expect(cost.model).toBe('cursor-large');
      expect(cost.inputTokens).toBe(1000);
      expect(cost.outputTokens).toBe(500);
    });

    it('should use default pricing for unknown model', () => {
      const cost = tokenManager.calculateCost('unknown-model', 1000, 500);

      // Should use cursor-large pricing as default
      expect(cost.total).toBe(0.06);
      expect(cost.model).toBe('unknown-model');
    });

    it('should handle zero tokens', () => {
      const cost = tokenManager.calculateCost('cursor-large', 0, 0);

      expect(cost.total).toBe(0);
      expect(cost.inputTokens).toBe(0);
      expect(cost.outputTokens).toBe(0);
    });

    it('should handle undefined tokens', () => {
      const cost = tokenManager.calculateCost(
        'cursor-large',
        undefined,
        undefined
      );

      expect(cost.total).toBe(0);
      expect(cost.inputTokens).toBe(0);
      expect(cost.outputTokens).toBe(0);
    });
  });

  describe('usage tracking', () => {
    const mockUsage = {
      projectId: 'test-project',
      userId: 'test-user',
      agentRole: 'senior_developer',
      model: 'cursor-large',
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      correlationId: 'test-correlation-id',
    };

    it('should track usage successfully', async () => {
      global.global.mockRedis.setEx.mockResolvedValue('OK');
      global.global.mockRedis.incrByFloat.mockResolvedValue();
      global.global.mockRedis.expire.mockResolvedValue();
      global.global.mockRedis.get.mockResolvedValue('0');

      const result = await tokenManager.trackUsage(mockUsage);

      expect(result.success).toBe(true);
      expect(result.trackingId).toBeDefined();
      expect(result.cost).toBeDefined();
      expect(result.cost.total).toBe(0.06); // Based on cursor-large pricing
      expect(global.global.mockRedis.setEx).toHaveBeenCalled();
      expect(global.global.mockRedis.incrByFloat).toHaveBeenCalled(); // Various counters
    });

    it('should handle tracking errors', async () => {
      global.global.mockRedis.setEx.mockRejectedValue(new Error('Redis error'));

      await expect(tokenManager.trackUsage(mockUsage)).rejects.toThrow(
        'Redis error'
      );
    });

    it('should calculate cost in tracking', async () => {
      global.mockRedis.setEx.mockResolvedValue('OK');
      global.mockRedis.incrByFloat.mockResolvedValue();
      global.mockRedis.expire.mockResolvedValue();
      global.mockRedis.get.mockResolvedValue('0');

      const result = await tokenManager.trackUsage(mockUsage);

      expect(result.cost.inputCost).toBe(0.03);
      expect(result.cost.outputCost).toBe(0.03);
      expect(result.cost.total).toBe(0.06);
    });
  });

  describe('budget status checking', () => {
    it('should get project budget status', async () => {
      global.mockRedis.get
        .mockResolvedValueOnce('25000') // tokens used
        .mockResolvedValueOnce('15.50'); // cost used

      const status = await tokenManager.getProjectBudgetStatus('test-project');

      expect(status.tokensUsed).toBe(25000);
      expect(status.costUsed).toBe(15.5);
      expect(status.tokenUsagePercent).toBe(0.25); // 25000 / 100000
      expect(status.costUsagePercent).toBe(0.31); // 15.5 / 50
    });

    it('should handle missing usage data', async () => {
      global.mockRedis.get.mockResolvedValue(null);

      const status = await tokenManager.getProjectBudgetStatus('new-project');

      expect(status.tokensUsed).toBe(0);
      expect(status.costUsed).toBe(0);
      expect(status.tokenUsagePercent).toBe(0);
      expect(status.costUsagePercent).toBe(0);
    });

    it('should get user budget status', async () => {
      // const today = new Date().toISOString().split('T')[0]; // Unused
      // const month = new Date().toISOString().substring(0, 7); // Unused

      global.mockRedis.get
        .mockResolvedValueOnce('15000') // daily tokens
        .mockResolvedValueOnce('75.25'); // monthly cost

      const status = await tokenManager.getUserBudgetStatus('test-user');

      expect(status.dailyTokensUsed).toBe(15000);
      expect(status.monthlyCostUsed).toBe(75.25);
      expect(status.dailyUsagePercent).toBe(0.3); // 15000 / 50000
      expect(status.monthlyUsagePercent).toBeCloseTo(0.376, 3); // 75.25 / 200
    });

    it('should get agent budget status', async () => {
      global.mockRedis.get.mockResolvedValue('35000');

      const status =
        await tokenManager.getAgentBudgetStatus('senior_developer');

      expect(status.tokensUsed).toBe(35000);
      expect(status.tokensLimit).toBe(50000);
      expect(status.usagePercent).toBe(0.7);
    });

    it('should use default budget for unknown agent', async () => {
      global.mockRedis.get.mockResolvedValue('10000');

      const status = await tokenManager.getAgentBudgetStatus('unknown_agent');

      expect(status.tokensLimit).toBe(50000); // senior_developer default
    });
  });

  describe('budget limit checking', () => {
    it('should allow request within limits', async () => {
      // Mock current usage below limits
      global.mockRedis.get
        .mockResolvedValueOnce('10000') // project tokens
        .mockResolvedValueOnce('5.0') // project cost
        .mockResolvedValueOnce('5000') // daily tokens
        .mockResolvedValueOnce('25.0') // monthly cost
        .mockResolvedValueOnce('10000'); // agent tokens

      const result = await tokenManager.checkRequestBudget(
        'test-project',
        'test-user',
        'senior_developer',
        5000
      );

      expect(result.allowed).toBe(true);
      expect(result.limits).toHaveLength(0);
    });

    it('should reject request exceeding project token limit', async () => {
      // Mock usage near limits
      global.mockRedis.get
        .mockResolvedValueOnce('95000') // project tokens
        .mockResolvedValueOnce('5.0') // project cost
        .mockResolvedValueOnce('5000') // daily tokens
        .mockResolvedValueOnce('25.0') // monthly cost
        .mockResolvedValueOnce('10000'); // agent tokens

      const result = await tokenManager.checkRequestBudget(
        'test-project',
        'test-user',
        'senior_developer',
        10000 // Would exceed 100,000 limit
      );

      expect(result.allowed).toBe(false);
      expect(result.limits).toContain(
        'Request would exceed project token budget'
      );
    });

    it('should reject request exceeding user daily limit', async () => {
      global.mockRedis.get
        .mockResolvedValueOnce('10000') // project tokens
        .mockResolvedValueOnce('5.0') // project cost
        .mockResolvedValueOnce('45000') // daily tokens
        .mockResolvedValueOnce('25.0') // monthly cost
        .mockResolvedValueOnce('10000'); // agent tokens

      const result = await tokenManager.checkRequestBudget(
        'test-project',
        'test-user',
        'senior_developer',
        10000 // Would exceed 50,000 daily limit
      );

      expect(result.allowed).toBe(false);
      expect(result.limits).toContain(
        'Request would exceed user daily token limit'
      );
    });

    it('should warn about approaching agent limit', async () => {
      global.mockRedis.get
        .mockResolvedValueOnce('10000') // project tokens
        .mockResolvedValueOnce('5.0') // project cost
        .mockResolvedValueOnce('5000') // daily tokens
        .mockResolvedValueOnce('25.0') // monthly cost
        .mockResolvedValueOnce('48000'); // agent tokens near limit

      const result = await tokenManager.checkRequestBudget(
        'test-project',
        'test-user',
        'senior_developer',
        3000
      );

      expect(result.allowed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('budget management', () => {
    it('should set project budget', async () => {
      global.mockRedis.setEx.mockResolvedValue('OK');

      const customBudget = {
        maxTokens: 200000,
        maxCostUSD: 100.0,
      };

      await tokenManager.setProjectBudget('test-project', customBudget);

      expect(global.mockRedis.setEx).toHaveBeenCalledWith(
        'budget:project:test-project',
        86400 * 365,
        JSON.stringify(customBudget)
      );
    });

    it('should reset usage counters', async () => {
      const mockKeys = [
        'usage:project:test-project:tokens',
        'usage:project:test-project:cost',
      ];
      global.mockRedis.keys.mockResolvedValue(mockKeys);
      global.mockRedis.del.mockResolvedValue(2);

      await tokenManager.resetUsageCounters('project', 'test-project');

      expect(global.mockRedis.keys).toHaveBeenCalledWith(
        'usage:project:test-project:*'
      );
      expect(global.mockRedis.del).toHaveBeenCalledWith(mockKeys);
    });

    it('should handle no keys to reset', async () => {
      global.mockRedis.keys.mockResolvedValue([]);

      await tokenManager.resetUsageCounters('project', 'test-project');

      expect(global.mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('analytics', () => {
    it('should get project analytics', async () => {
      global.mockRedis.get
        .mockResolvedValueOnce('50000') // tokens
        .mockResolvedValueOnce('25.0') // cost
        .mockResolvedValueOnce('50000') // budget status tokens
        .mockResolvedValueOnce('25.0'); // budget status cost

      const analytics = await tokenManager.getUsageAnalytics(
        'project',
        'test-project'
      );

      expect(analytics.scope).toBe('project');
      expect(analytics.identifier).toBe('test-project');
      expect(analytics.summary.totalTokens).toBe(50000);
      expect(analytics.summary.totalCost).toBe(25.0);
    });

    it('should handle analytics for different scopes', async () => {
      const analytics = await tokenManager.getUsageAnalytics(
        'user',
        'test-user'
      );

      expect(analytics.scope).toBe('user');
      expect(analytics.identifier).toBe('test-user');
    });

    it('should handle analytics errors', async () => {
      global.mockRedis.get.mockRejectedValue(new Error('Redis error'));

      await expect(
        tokenManager.getUsageAnalytics('project', 'test-project')
      ).rejects.toThrow('Redis error');
    });
  });

  describe('usage report generation', () => {
    it('should generate basic usage report', async () => {
      const report = await tokenManager.generateUsageReport();

      expect(report.generatedAt).toBeDefined();
      expect(report.period).toBe('current');
      expect(report.summary).toBeDefined();
      expect(report.breakdown).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should generate report with custom options', async () => {
      const options = { period: 'monthly' };
      const report = await tokenManager.generateUsageReport(options);

      expect(report.period).toBe('monthly');
    });
  });
});
