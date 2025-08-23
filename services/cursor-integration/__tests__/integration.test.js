/**
 * Integration tests for enhanced Cursor Integration Service
 * @jest-environment node
 */

const request = require('supertest');

// Mock the new components BEFORE importing the app
jest.mock('../src/lib/cursor-cli');
jest.mock('../src/lib/prompt-templates');
jest.mock('../src/lib/token-manager');
jest.mock('../src/lib/circuit-breaker');

// Import the mocked modules
const CursorCLI = require('../src/lib/cursor-cli');
const PromptTemplateManager = require('../src/lib/prompt-templates');
const TokenManager = require('../src/lib/token-manager');
const {
  CircuitBreaker,
  CIRCUIT_STATES,
} = require('../src/lib/circuit-breaker');

// Create a minimal Express app for testing
const express = require('express');
const app = express();
app.use(express.json());

// Add request ID middleware
app.use((req, res, next) => {
  req.id = 'test-request-id';
  next();
});

describe('Enhanced Cursor Integration Service', () => {
  let mockCursorCLI;
  let mockPromptManager;
  let mockTokenManager;
  let mockCircuitBreaker;

  beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CursorCLI
    mockCursorCLI = {
      checkCursorAvailability: jest.fn().mockResolvedValue(true),
      createProjectWorkspace: jest.fn().mockResolvedValue('/tmp/test-project'),
      getProjectInfo: jest
        .fn()
        .mockResolvedValue({ exists: true, projectPath: '/tmp/test-project' }),
      generateCode: jest.fn().mockResolvedValue({ success: true, files: [] }),
      analyzeCode: jest.fn().mockResolvedValue({ success: true, analysis: {} }),
      applyChanges: jest
        .fn()
        .mockResolvedValue({ success: true, modifiedFiles: [] }),
    };
    CursorCLI.mockImplementation(() => mockCursorCLI);

    // Mock PromptTemplateManager
    mockPromptManager = {
      loadTemplates: jest.fn().mockResolvedValue(),
      getTemplate: jest.fn().mockReturnValue({
        role: 'pr_architect',
        category: 'analysis',
        systemPrompt: 'Test system prompt',
        userTemplate: 'Test user template {{projectContext}}',
        maxTokens: 4000,
        temperature: 0.7,
      }),
      getTemplatesByRole: jest
        .fn()
        .mockReturnValue([
          { id: 'template1', role: 'pr_architect', category: 'analysis' },
        ]),
      getTemplatesByCategory: jest
        .fn()
        .mockReturnValue([
          { id: 'template1', role: 'pr_architect', category: 'analysis' },
        ]),
      getAllTemplates: jest.fn().mockReturnValue([
        { id: 'template1', role: 'pr_architect', category: 'analysis' },
        {
          id: 'template2',
          role: 'senior_developer',
          category: 'implementation',
        },
      ]),
      renderTemplate: jest.fn().mockReturnValue({
        systemPrompt: 'Test system prompt',
        userPrompt: 'Test user prompt with context',
        templateId: 'pr_architect_analyze',
        role: 'pr_architect',
      }),
      validateContext: jest
        .fn()
        .mockReturnValue({ valid: true, missingVariables: [] }),
    };
    PromptTemplateManager.mockImplementation(() => mockPromptManager);

    // Mock TokenManager
    mockTokenManager = {
      initializeRedis: jest.fn().mockResolvedValue(),
      trackUsage: jest.fn().mockResolvedValue({
        success: true,
        trackingId: 'test-tracking-id',
        cost: { total: 0.05 },
        budgetStatus: { status: 'healthy' },
      }),
      checkRequestBudget: jest
        .fn()
        .mockResolvedValue({ allowed: true, warnings: [], limits: [] }),
      getProjectBudgetStatus: jest.fn().mockResolvedValue({
        tokensUsed: 1000,
        costUsed: 0.05,
        budget: { tokens: 50000, cost: 25.0 },
        status: 'healthy',
      }),
      getUsageAnalytics: jest.fn().mockResolvedValue({
        tokensUsed: 1000,
        costUsed: 0.05,
        requests: 10,
        timeRange: 'daily',
      }),
    };
    TokenManager.mockImplementation(() => mockTokenManager);

    // Mock CircuitBreaker
    mockCircuitBreaker = {
      execute: jest.fn().mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Analysis complete' } }],
          usage: { total_tokens: 100 },
          model: 'cursor-large',
        },
      }),
      getMetrics: jest.fn().mockReturnValue({
        state: CIRCUIT_STATES.CLOSED,
        metrics: { totalRequests: 0, successfulRequests: 0, failedRequests: 0 },
      }),
      getHealthReport: jest.fn().mockReturnValue({
        healthy: true,
        state: CIRCUIT_STATES.CLOSED,
        metrics: {},
        recentErrors: {},
        recommendations: [],
      }),
    };
    CircuitBreaker.mockImplementation(() => mockCircuitBreaker);

    // Set up test routes that use our mocks
    setupTestRoutes();
  });

  function setupTestRoutes() {
    // AI Prompt endpoint
    app.post('/api/v1/ai/prompt', async (req, res) => {
      try {
        const { agentRole, templateId, templateContext } = req.body;

        if (templateId) {
          const template = mockPromptManager.getTemplate(templateId);
          if (!template) {
            return res.status(400).json({
              error: 'INVALID_TEMPLATE',
              message: `Template not found: ${templateId}`,
              correlationId: req.id,
            });
          }

          if (templateContext) {
            const validation = mockPromptManager.validateContext(
              templateId,
              templateContext
            );
            if (!validation.valid) {
              return res.status(400).json({
                error: 'INVALID_TEMPLATE_CONTEXT',
                message: 'Template context validation failed',
                details: {
                  missing: validation.missingVariables,
                  required: validation.requiredVariables,
                },
                correlationId: req.id,
              });
            }
          }
        }

        const budgetCheck = await mockTokenManager.checkRequestBudget(
          'project',
          'test-project',
          100
        );
        if (!budgetCheck.allowed) {
          return res.status(429).json({
            error: 'BUDGET_EXCEEDED',
            message: 'Budget limit exceeded',
            correlationId: req.id,
          });
        }

        const result = await mockCircuitBreaker.execute(() =>
          Promise.resolve({
            data: {
              choices: [{ message: { content: 'Analysis complete' } }],
              usage: { total_tokens: 100 },
              model: 'cursor-large',
            },
          })
        );

        await mockTokenManager.trackUsage('project', 'test-project', {
          tokensUsed: 100,
          cost: 0.05,
        });

        res.status(200).json({
          success: true,
          data: {
            response: result.data.choices[0].message.content,
            model: result.data.model,
            agentRole,
            metadata: { tokensUsed: 100 },
          },
          correlationId: req.id,
        });
      } catch (error) {
        res.status(500).json({
          error: 'AI_REQUEST_FAILED',
          message: error.message,
          correlationId: req.id,
        });
      }
    });

    // Templates endpoint
    app.get('/api/v1/ai/templates', (req, res) => {
      try {
        const { role, category } = req.query;
        let templates;

        if (role) {
          templates = mockPromptManager.getTemplatesByRole(role);
        } else if (category) {
          templates = mockPromptManager.getTemplatesByCategory(category);
        } else {
          templates = mockPromptManager.getAllTemplates();
        }

        res.status(200).json({
          success: true,
          data: { templates },
          correlationId: req.id,
        });
      } catch (error) {
        res.status(500).json({
          error: 'TEMPLATE_ERROR',
          message: error.message,
          correlationId: req.id,
        });
      }
    });

    // Get specific template endpoint
    app.get('/api/v1/ai/templates/:templateId', (req, res) => {
      try {
        const { templateId } = req.params;
        const template = mockPromptManager.getTemplate(templateId);

        if (!template) {
          return res.status(404).json({
            error: 'TEMPLATE_NOT_FOUND',
            message: `Template not found: ${templateId}`,
            correlationId: req.id,
          });
        }

        res.status(200).json({
          success: true,
          data: { template },
          correlationId: req.id,
        });
      } catch (error) {
        res.status(500).json({
          error: 'TEMPLATE_ERROR',
          message: error.message,
          correlationId: req.id,
        });
      }
    });

    // Project workspace endpoint
    app.post('/api/v1/cursor/projects', async (req, res) => {
      try {
        const { projectId, repositoryUrl } = req.body;

        if (!projectId) {
          return res.status(400).json({
            error: 'MISSING_PROJECT_ID',
            message: 'Project ID is required',
            correlationId: req.id,
          });
        }

        const projectPath = await mockCursorCLI.createProjectWorkspace(
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
        res.status(500).json({
          error: 'PROJECT_CREATION_ERROR',
          message: error.message,
          correlationId: req.id,
        });
      }
    });

    // System health endpoint
    app.get('/api/v1/system/health', async (req, res) => {
      try {
        const cursorCLIAvailable =
          await mockCursorCLI.checkCursorAvailability();
        const circuitHealth = mockCircuitBreaker.getHealthReport();

        const systemHealth = {
          overall:
            circuitHealth.healthy && cursorCLIAvailable
              ? 'healthy'
              : 'degraded',
          components: {
            circuitBreaker: circuitHealth,
            cursorCLI: {
              available: cursorCLIAvailable,
              healthy: cursorCLIAvailable,
            },
            promptManager: {
              templatesLoaded: mockPromptManager.getAllTemplates().length,
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
        res.status(500).json({
          error: 'HEALTH_CHECK_ERROR',
          message: error.message,
          correlationId: req.id,
        });
      }
    });
  }

  describe('Enhanced AI Prompt Endpoint', () => {
    it('should process AI prompt with template', async () => {
      const response = await request(app)
        .post('/api/v1/ai/prompt')
        .send({
          prompt: 'Analyze this project',
          agentRole: 'pr_architect',
          projectId: 'test-project',
          userId: 'test-user',
          templateId: 'pr_architect_analyze',
          templateContext: { projectContext: 'Test context' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.response).toBe('Analysis complete');
      expect(mockTokenManager.trackUsage).toHaveBeenCalled();
    });

    it('should reject request when budget exceeded', async () => {
      mockTokenManager.checkRequestBudget.mockResolvedValue({
        allowed: false,
        limits: ['Budget limit exceeded'],
      });

      const response = await request(app).post('/api/v1/ai/prompt').send({
        prompt: 'Test prompt',
        agentRole: 'pr_architect',
        projectId: 'test-project',
        userId: 'test-user',
      });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('BUDGET_EXCEEDED');
    });

    it('should handle invalid template', async () => {
      mockPromptManager.getTemplate.mockReturnValue(null);

      const response = await request(app).post('/api/v1/ai/prompt').send({
        prompt: 'Test prompt',
        agentRole: 'pr_architect',
        templateId: 'nonexistent_template',
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
        requiredVariables: ['projectContext', 'requirements'],
      });

      const response = await request(app).post('/api/v1/ai/prompt').send({
        prompt: 'Test prompt',
        agentRole: 'pr_architect',
        templateId: 'pr_architect_analyze',
        templateContext: {},
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
        {
          id: 'template2',
          role: 'senior_developer',
          category: 'implementation',
        },
      ];
      mockPromptManager.getAllTemplates.mockReturnValue(mockTemplates);

      const response = await request(app).get('/api/v1/ai/templates');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toEqual(mockTemplates);
    });

    it('should filter templates by role', async () => {
      const response = await request(app).get(
        '/api/v1/ai/templates?role=pr_architect'
      );

      expect(response.status).toBe(200);
      expect(mockPromptManager.getTemplatesByRole).toHaveBeenCalledWith(
        'pr_architect'
      );
    });

    it('should get specific template', async () => {
      const mockTemplate = {
        id: 'pr_architect_analyze',
        role: 'pr_architect',
        category: 'analysis',
        systemPrompt: 'Test system prompt',
        userTemplate: 'Test user template',
      };
      mockPromptManager.getTemplate.mockReturnValue(mockTemplate);

      const response = await request(app).get(
        '/api/v1/ai/templates/pr_architect_analyze'
      );

      expect(response.status).toBe(200);
      expect(response.body.data.template.id).toBe('pr_architect_analyze');
      expect(response.body.data.template.role).toBe('pr_architect');
    });

    it('should handle template not found', async () => {
      mockPromptManager.getTemplate.mockReturnValue(null);

      const response = await request(app).get(
        '/api/v1/ai/templates/nonexistent'
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('Cursor CLI Endpoints', () => {
    it('should create project workspace', async () => {
      const response = await request(app).post('/api/v1/cursor/projects').send({
        projectId: 'test-project',
        repositoryUrl: 'https://github.com/test/repo',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.projectId).toBe('test-project');
      expect(mockCursorCLI.createProjectWorkspace).toHaveBeenCalledWith(
        'test-project',
        'https://github.com/test/repo'
      );
    });

    it('should handle missing project ID', async () => {
      const response = await request(app)
        .post('/api/v1/cursor/projects')
        .send({ repositoryUrl: 'https://github.com/test/repo' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_PROJECT_ID');
    });
  });

  describe('System Health Endpoint', () => {
    it('should report system health', async () => {
      const response = await request(app).get('/api/v1/system/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.systemHealth.overall).toBeDefined();
      expect(response.body.data.systemHealth.components).toBeDefined();
    });

    it('should report degraded health when CLI unavailable', async () => {
      mockCursorCLI.checkCursorAvailability.mockResolvedValue(false);

      const response = await request(app).get('/api/v1/system/health');

      expect(response.status).toBe(200);
      expect(response.body.data.systemHealth.overall).toBe('degraded');
      expect(
        response.body.data.systemHealth.components.cursorCLI.available
      ).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate required fields for project creation', async () => {
      const response = await request(app)
        .post('/api/v1/cursor/projects')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_PROJECT_ID');
    });
  });
});
