/**
 * Unit tests for Prompt Template Manager
 * @jest-environment node
 */

const path = require('path');
const fs = require('fs').promises;
const PromptTemplateManager = require('../src/lib/prompt-templates');
const winston = require('winston');

// FS mocking is now handled globally in jest.setup.js

describe('PromptTemplateManager', () => {
  let promptManager;
  let mockLogger;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockLogger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console({ silent: true })],
    });

    // FS mocking is handled globally

    promptManager = new PromptTemplateManager({
      templatesPath: '/tmp/test-templates',
      logger: mockLogger,
    });

    // Force sync loading of templates for tests
    promptManager.loadDefaultTemplatesSync();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', async () => {
      const manager = new PromptTemplateManager();
      await manager.loadTemplates();

      expect(manager.templatesPath).toBe(
        path.join(__dirname, '../src/templates')
      );
    });

    it('should initialize with custom configuration', async () => {
      expect(promptManager.templatesPath).toBe('/tmp/test-templates');
      expect(promptManager.logger).toBe(mockLogger);
    });
  });

  describe('template management', () => {
    it('should load default templates', () => {
      const templates = promptManager.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);

      // Check for specific role templates
      const architectTemplates = templates.filter(
        t => t.role === 'pr_architect'
      );
      const developerTemplates = templates.filter(
        t => t.role === 'senior_developer'
      );
      const qaTemplates = templates.filter(t => t.role === 'qa_engineer');

      expect(architectTemplates.length).toBeGreaterThan(0);
      expect(developerTemplates.length).toBeGreaterThan(0);
      expect(qaTemplates.length).toBeGreaterThan(0);
    });

    it('should get template by ID', () => {
      const template = promptManager.getTemplate('pr_architect_analyze');

      expect(template).toBeDefined();
      expect(template.role).toBe('pr_architect');
      expect(template.category).toBe('analysis');
      expect(template.systemPrompt).toBeDefined();
      expect(template.userTemplate).toBeDefined();
    });

    it('should return null for non-existent template', () => {
      const template = promptManager.getTemplate('nonexistent_template');
      expect(template).toBeNull();
    });

    it('should get templates by role', () => {
      const architectTemplates =
        promptManager.getTemplatesByRole('pr_architect');

      expect(architectTemplates.length).toBeGreaterThan(0);
      architectTemplates.forEach(template => {
        expect(template.role).toBe('pr_architect');
      });
    });

    it('should get templates by category', () => {
      const analysisTemplates =
        promptManager.getTemplatesByCategory('analysis');

      expect(analysisTemplates.length).toBeGreaterThan(0);
      analysisTemplates.forEach(template => {
        expect(template.category).toBe('analysis');
      });
    });
  });

  describe('template rendering', () => {
    it('should render template with context variables', () => {
      const context = {
        repositoryUrl: 'https://github.com/test/repo',
        projectContext: 'Test project context',
        requirements: 'Build a web application',
        tokenBudget: 50000,
      };

      const rendered = promptManager.renderTemplate(
        'pr_architect_analyze',
        context
      );

      expect(rendered.templateId).toBe('pr_architect_analyze');
      expect(rendered.role).toBe('pr_architect');
      expect(rendered.userPrompt).toContain('https://github.com/test/repo');
      expect(rendered.userPrompt).toContain('Test project context');
      expect(rendered.userPrompt).toContain('Build a web application');
      expect(rendered.userPrompt).toContain('50000');
    });

    it('should handle missing template for rendering', () => {
      expect(() => {
        promptManager.renderTemplate('nonexistent_template', {});
      }).toThrow('Template not found: nonexistent_template');
    });

    it('should preserve placeholders for missing context variables', () => {
      const context = {
        repositoryUrl: 'https://github.com/test/repo',
        // Missing other required variables
      };

      const rendered = promptManager.renderTemplate(
        'pr_architect_analyze',
        context
      );

      expect(rendered.userPrompt).toContain('https://github.com/test/repo');
      expect(rendered.userPrompt).toContain('{{projectContext}}'); // Should remain as placeholder
    });
  });

  describe('template interpolation', () => {
    it('should interpolate simple variables', () => {
      const template = 'Hello {{name}}, welcome to {{project}}!';
      const context = { name: 'John', project: 'QuantaPilot' };

      const result = promptManager.interpolateTemplate(template, context);

      expect(result).toBe('Hello John, welcome to QuantaPilot!');
    });

    it('should handle variables with whitespace', () => {
      const template = 'Value: {{ spaced_var }}';
      const context = { spaced_var: 'test value' };

      const result = promptManager.interpolateTemplate(template, context);

      expect(result).toBe('Value: test value');
    });

    it('should handle nested object values', () => {
      const template = 'Count: {{metrics.count}}, Total: {{metrics.total}}';
      const context = {
        'metrics.count': 5,
        'metrics.total': 100,
      };

      const result = promptManager.interpolateTemplate(template, context);

      expect(result).toBe('Count: 5, Total: 100');
    });

    it('should convert non-string values to strings', () => {
      const template = 'Number: {{count}}, Boolean: {{enabled}}';
      const context = { count: 42, enabled: true };

      const result = promptManager.interpolateTemplate(template, context);

      expect(result).toBe('Number: 42, Boolean: true');
    });
  });

  describe('prompt optimization', () => {
    it('should not modify prompt within token limits', () => {
      const shortPrompt = 'This is a short prompt.';
      const optimized = promptManager.optimizePrompt(shortPrompt, 1000);

      expect(optimized).toBe(shortPrompt);
    });

    it('should truncate long prompts', () => {
      const longPrompt = 'A'.repeat(20000); // Very long prompt
      const optimized = promptManager.optimizePrompt(longPrompt, 1000);

      expect(optimized.length).toBeLessThan(longPrompt.length);
      expect(optimized).toContain('[Content truncated for token limits]');
    });

    it('should find good truncation points', () => {
      const promptWithSentences =
        'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const optimized = promptManager.optimizePrompt(promptWithSentences, 10); // Very low limit

      expect(optimized).toContain('.');
      expect(optimized).toContain('[Content truncated for token limits]');
    });
  });

  describe('custom templates', () => {
    it('should add custom template successfully', () => {
      const customTemplate = {
        role: 'custom_agent',
        category: 'custom',
        title: 'Custom Template',
        systemPrompt: 'You are a custom agent.',
        userTemplate: 'Execute task: {{task}}',
        maxTokens: 2000,
        temperature: 0.5,
      };

      promptManager.addTemplate('custom_template', customTemplate);

      const retrieved = promptManager.getTemplate('custom_template');
      expect(retrieved).toEqual(customTemplate);
    });

    it('should validate required fields for custom templates', () => {
      const incompleteTemplate = {
        role: 'custom_agent',
        title: 'Custom Template',
        // Missing required fields
      };

      expect(() => {
        promptManager.addTemplate('incomplete_template', incompleteTemplate);
      }).toThrow('Template missing required field');
    });

    it('should set default values for optional fields', () => {
      const minimalTemplate = {
        role: 'custom_agent',
        category: 'custom',
        title: 'Minimal Template',
        systemPrompt: 'You are a custom agent.',
        userTemplate: 'Execute task: {{task}}',
        // No maxTokens, temperature, or version
      };

      promptManager.addTemplate('minimal_template', minimalTemplate);

      const retrieved = promptManager.getTemplate('minimal_template');
      expect(retrieved.version).toBe('1.0.0');
      expect(retrieved.maxTokens).toBe(4000);
      expect(retrieved.temperature).toBe(0.5);
    });
  });

  describe('context validation', () => {
    it('should validate complete context', () => {
      const context = {
        repositoryUrl: 'https://github.com/test/repo',
        projectContext: 'Test context',
        codebaseAnalysis: 'Analysis results',
        requirements: 'Build application',
        constraints: 'Time constraints',
        tokenBudget: 50000,
        timeConstraints: '1 week',
      };

      const validation = promptManager.validateContext(
        'pr_architect_analyze',
        context
      );

      expect(validation.valid).toBe(true);
      expect(validation.missingVariables).toHaveLength(0);
    });

    it('should identify missing variables', () => {
      const incompleteContext = {
        repositoryUrl: 'https://github.com/test/repo',
        // Missing other variables
      };

      const validation = promptManager.validateContext(
        'pr_architect_analyze',
        incompleteContext
      );

      expect(validation.valid).toBe(false);
      expect(validation.missingVariables.length).toBeGreaterThan(0);
      expect(validation.requiredVariables).toContain('projectContext');
    });

    it('should handle validation for non-existent template', () => {
      expect(() => {
        promptManager.validateContext('nonexistent_template', {});
      }).toThrow('Template not found: nonexistent_template');
    });
  });

  describe('error handling', () => {
    it('should handle template rendering errors gracefully', () => {
      // Mock a template with circular reference to cause JSON stringify error
      const problematicTemplate = {
        role: 'test',
        category: 'test',
        title: 'Test',
        systemPrompt: 'System {{invalid}}',
        userTemplate: 'User {{invalid}}',
      };

      promptManager.addTemplate('problematic', problematicTemplate);

      const context = {};
      const rendered = promptManager.renderTemplate('problematic', context);

      // Should still work but with placeholder preserved
      expect(rendered.userPrompt).toContain('{{invalid}}');
    });

    it('should handle file system errors during initialization', async () => {
      // Create a new manager specifically for this test without mocking loadTemplates
      const mockManager = {
        ensureTemplatesDirectory: jest
          .fn()
          .mockRejectedValue(new Error('Permission denied')),
        loadTemplates: jest.fn().mockImplementation(async function () {
          await this.ensureTemplatesDirectory();
        }),
        logger: mockLogger,
      };

      await expect(mockManager.loadTemplates()).rejects.toThrow(
        'Permission denied'
      );
    });
  });
});
