/**
 * Integration tests for enhanced Cursor Integration Service
 * @jest-environment node
 */

const request = require('supertest');
const app = require('../src/index');

// Mock the new components
jest.mock('../src/lib/cursor-cli');
jest.mock('../src/lib/prompt-templates');
jest.mock('../src/lib/token-manager');
jest.mock('../src/lib/circuit-breaker');

const CursorCLI = require('../src/lib/cursor-cli');
const PromptTemplateManager = require('../src/lib/prompt-templates');
const TokenManager = require('../src/lib/token-manager');
const { CircuitBreaker, CIRCUIT_STATES } = require('../src/lib/circuit-breaker');

describe('Enhanced Cursor Integration Service', () => {
  let mockCursorCLI;
  let mockPromptManager;
  let mockTokenManager;
  let mockCircuitBreaker;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CursorCLI
    mockCursorCLI = {
      checkCursorAvailability: jest.fn().mockResolvedValue(true),
      createProjectWorkspace: jest.fn().mockResolvedValue('/tmp/test-project'),
      getProjectInfo: jest.fn().mockResolvedValue({ exists: true, projectPath: '/tmp/test-project' }),
      generateCode: jest.fn().mockResolvedValue({ success: true, files: [] }),
      analyzeCode: jest.fn().mockResolvedValue({ success: true, analysis: {} }),
      applyChanges: jest.fn().mockResolvedValue({ success: true, modifiedFiles: [] })
    };
    CursorCLI.mockImplementation(() => mockCursorCLI);

    // Mock PromptTemplateManager
    mockPromptManager = {
      loadTemplates: jest.fn().mockResolvedValue(),
      getTemplate: jest.fn(),
      getTemplatesByRole: jest.fn().mockReturnValue([]),
      getTemplatesByCategory: jest.fn().mockReturnValue([]),
      getAllTemplates: jest.fn().mockReturnValue([]),
      renderTemplate: jest.fn(),
      validateContext: jest.fn().mockReturnValue({ valid: true, missingVariables: [] })
    };
    PromptTemplateManager.mockImplementation(() => mockPromptManager);

    // Mock TokenManager
    mockTokenManager = {
      initializeRedis: jest.fn().mockResolvedValue(),
      trackUsage: jest.fn().mockResolvedValue({
        success: true,
        trackingId: 'test-tracking-id',
        cost: { total: 0.05 },
        budgetStatus: { status: 'healthy' }
      }),
      checkRequestBudget: jest.fn().mockResolvedValue({ allowed: true, warnings: [], limits: [] }),
      getProjectBudgetStatus: jest.fn().mockResolvedValue({
        tokensUsed: 1000,
        tokensLimit: 50000,
        tokenUsagePercent: 0.02
      }),
      getUsageAnalytics: jest.fn().mockResolvedValue({
        scope: 'project',
        identifier: 'test-project',
        summary: { totalTokens: 1000 }
      })
    };
    TokenManager.mockImplementation(() => mockTokenManager);

    // Mock CircuitBreaker
    mockCircuitBreaker = {
      execute: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({
        state: CIRCUIT_STATES.CLOSED,
        metrics: { totalRequests: 0, successfulRequests: 0, failedRequests: 0 }
      }),
      getHealthReport: jest.fn().mockReturnValue({
        healthy: true,
        state: CIRCUIT_STATES.CLOSED,
        metrics: {},
        recentErrors: {},
        recommendations: []
      })
    };
    CircuitBreaker.mockImplementation(() => mockCircuitBreaker);
  });

  describe('Enhanced AI Prompt Endpoint', () => {
    it('should process AI prompt with template', async () => {
      const mockTemplate = {
        role: 'pr_architect',
        category: 'analysis',
        userPrompt: 'Analyze the project: {{projectContext}}',
        systemPrompt: 'You are an architect.'
      };

      mockPromptManager.getTemplate.mockReturnValue(mockTemplate);
      mockPromptManager.renderTemplate.mockReturnValue({
        templateId: 'pr_architect_analyze',
        userPrompt: 'Analyze the project: Test context',
        systemPrompt: 'You are an architect.'
      });

      mockCircuitBreaker.execute.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Analysis complete' } }],
          usage: { total_tokens: 100 },
          model: 'cursor-large'
        }
      });

      const response = await request(app)
        .post('/api/v1/ai/prompt')
        .send({
          prompt: 'Analyze this project',
          agentRole: 'pr_architect',
          projectId: 'test-project',
          userId: 'test-user',
          templateId: 'pr_architect_analyze',
          templateContext: { projectContext: 'Test context' }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.response).toBe('Analysis complete');
      expect(mockTokenManager.trackUsage).toHaveBeenCalled();
    });

    it('should reject request when budget exceeded', async () => {
      mockTokenManager.checkRequestBudget.mockResolvedValue({
        allowed: false,
        limits: ['Budget limit exceeded']
      });

      const response = await request(app)
        .post('/api/v1/ai/prompt')
        .send({
          prompt: 'Test prompt',
          agentRole: 'pr_architect',
          projectId: 'test-project',
          userId: 'test-user'
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('BUDGET_EXCEEDED');
    });

    it('should handle invalid template', async () => {
      mockPromptManager.getTemplate.mockReturnValue(null);

      const response = await request(app)
        .post('/api/v1/ai/prompt')
        .send({
          prompt: 'Test prompt',
          agentRole: 'pr_architect',
          templateId: 'nonexistent_template'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_TEMPLATE');
    });

    it('should handle invalid template context', async () => {
      const mockTemplate = { role: 'pr_architect' };
      mockPromptManager.getTemplate.mockReturnValue(mockTemplate);
      mockPromptManager.validateContext.mockReturnValue({
        valid: false,
        missingVariables: ['projectContext'],
        requiredVariables: ['projectContext', 'requirements']
      });

      const response = await request(app)
        .post('/api/v1/ai/prompt')
        .send({
          prompt: 'Test prompt',
          agentRole: 'pr_architect',
          templateId: 'pr_architect_analyze',
          templateContext: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_TEMPLATE_CONTEXT');
      expect(response.body.details.missing).toContain('projectContext');
    });
  });

  describe('Template Management Endpoints', () => {
    it('should list all templates', async () => {
      const mockTemplates = [
        { id: 'template1', role: 'pr_architect', category: 'analysis' },
        { id: 'template2', role: 'senior_developer', category: 'implementation' }
      ];
      mockPromptManager.getAllTemplates.mockReturnValue(mockTemplates);

      const response = await request(app)
        .get('/api/v1/ai/templates');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toEqual(mockTemplates);
    });

    it('should filter templates by role', async () => {
      const mockTemplates = [
        { id: 'template1', role: 'pr_architect', category: 'analysis' }
      ];
      mockPromptManager.getTemplatesByRole.mockReturnValue(mockTemplates);

      const response = await request(app)
        .get('/api/v1/ai/templates?role=pr_architect');

      expect(response.status).toBe(200);
      expect(mockPromptManager.getTemplatesByRole).toHaveBeenCalledWith('pr_architect');
    });

    it('should get specific template', async () => {
      const mockTemplate = {
        role: 'pr_architect',
        category: 'analysis',
        title: 'Architecture Analysis'
      };
      mockPromptManager.getTemplate.mockReturnValue(mockTemplate);

      const response = await request(app)
        .get('/api/v1/ai/templates/pr_architect_analyze');

      expect(response.status).toBe(200);
      expect(response.body.data.template.id).toBe('pr_architect_analyze');
      expect(response.body.data.template.role).toBe('pr_architect');
    });

    it('should handle template not found', async () => {
      mockPromptManager.getTemplate.mockReturnValue(null);

      const response = await request(app)
        .get('/api/v1/ai/templates/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('Token Usage Endpoints', () => {
    it('should get usage analytics', async () => {
      const response = await request(app)
        .get('/api/v1/ai/usage/project/test-project');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTokenManager.getUsageAnalytics).toHaveBeenCalledWith(
        'project',
        'test-project',
        { timeRange: 'daily' }
      );
    });

    it('should get budget status', async () => {
      const response = await request(app)
        .get('/api/v1/ai/budget/test-project');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.budgetStatus.tokensUsed).toBe(1000);
    });
  });

  describe('Cursor CLI Endpoints', () => {
    it('should create project workspace', async () => {
      const response = await request(app)
        .post('/api/v1/cursor/project')
        .send({
          projectId: 'test-project',
          repositoryUrl: 'https://github.com/test/repo'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.projectId).toBe('test-project');
      expect(mockCursorCLI.createProjectWorkspace).toHaveBeenCalledWith(
        'test-project',
        'https://github.com/test/repo'
      );
    });

    it('should generate code', async () => {
      const response = await request(app)
        .post('/api/v1/cursor/generate')
        .send({
          projectId: 'test-project',
          prompt: 'Generate a login component'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockCursorCLI.generateCode).toHaveBeenCalled();
    });

    it('should handle project not found', async () => {
      mockCursorCLI.getProjectInfo.mockResolvedValue({ exists: false });

      const response = await request(app)
        .post('/api/v1/cursor/generate')
        .send({
          projectId: 'nonexistent-project',
          prompt: 'Generate code'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('PROJECT_NOT_FOUND');
    });

    it('should get project info', async () => {
      const mockProjectInfo = {
        exists: true,
        projectPath: '/tmp/test-project',
        fileCount: 5
      };
      mockCursorCLI.getProjectInfo.mockResolvedValue(mockProjectInfo);

      const response = await request(app)
        .get('/api/v1/cursor/project/test-project');

      expect(response.status).toBe(200);
      expect(response.body.data.projectInfo).toEqual(mockProjectInfo);
    });
  });

  describe('System Health Endpoint', () => {
    it('should report system health', async () => {
      const response = await request(app)
        .get('/api/v1/system/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.systemHealth.overall).toBeDefined();
      expect(response.body.data.systemHealth.components).toBeDefined();
      expect(response.body.data.systemHealth.components.circuitBreaker).toBeDefined();
      expect(response.body.data.systemHealth.components.cursorCLI).toBeDefined();
    });

    it('should report degraded health when CLI unavailable', async () => {
      mockCursorCLI.checkCursorAvailability.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/v1/system/health');

      expect(response.status).toBe(200);
      expect(response.body.data.systemHealth.overall).toBe('degraded');
      expect(response.body.data.systemHealth.components.cursorCLI.available).toBe(false);
    });
  });

  describe('Enhanced Agent Status', () => {
    it('should include circuit breaker metrics', async () => {
      const response = await request(app)
        .get('/api/v1/ai/agents');

      expect(response.status).toBe(200);
      expect(response.body.data.serviceStatus).toBeDefined();
      expect(response.body.data.serviceStatus.circuitState).toBe(CIRCUIT_STATES.CLOSED);
      expect(response.body.data.serviceStatus.healthy).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle template manager errors', async () => {
      mockPromptManager.getAllTemplates.mockImplementation(() => {
        throw new Error('Template error');
      });

      const response = await request(app)
        .get('/api/v1/ai/templates');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('TEMPLATE_ERROR');
    });

    it('should handle token manager errors', async () => {
      mockTokenManager.getUsageAnalytics.mockRejectedValue(new Error('Redis error'));

      const response = await request(app)
        .get('/api/v1/ai/usage/project/test-project');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('ANALYTICS_ERROR');
    });

    it('should handle cursor CLI errors', async () => {
      mockCursorCLI.createProjectWorkspace.mockRejectedValue(new Error('CLI error'));

      const response = await request(app)
        .post('/api/v1/cursor/project')
        .send({ projectId: 'test-project' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('PROJECT_CREATION_ERROR');
    });
  });

  describe('Validation', () => {
    it('should validate required fields for project creation', async () => {
      const response = await request(app)
        .post('/api/v1/cursor/project')
        .send({}); // Missing projectId

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_REQUEST');
    });

    it('should validate required fields for code generation', async () => {
      const response = await request(app)
        .post('/api/v1/cursor/generate')
        .send({ projectId: 'test-project' }); // Missing prompt

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_REQUEST');
    });
  });
});
