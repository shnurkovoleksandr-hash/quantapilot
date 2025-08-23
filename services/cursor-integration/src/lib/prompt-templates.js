/**
 * QuantaPilot™ AI Prompt Template Management System
 *
 * Manages role-based prompt templates for AI agents with dynamic context injection.
 * Provides optimized prompts for PR/Architect, Senior Developer, and QA Engineer roles.
 *
 * @author QuantaPilot™ Team
 * @version 1.0.0
 */

const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');

/**
 * Prompt template manager for AI agent interactions
 *
 * Features:
 * - Role-based prompt templates
 * - Dynamic context injection
 * - Token optimization
 * - Template versioning
 *
 * @class PromptTemplateManager
 */
class PromptTemplateManager {
  /**
   * Initialize prompt template manager
   * @param {Object} config - Configuration object
   * @param {string} config.templatesPath - Path to template files
   * @param {Object} config.logger - Winston logger instance
   */
  constructor(config = {}) {
    this.templatesPath =
      config.templatesPath || path.join(__dirname, '../templates');
    this.logger =
      config.logger ||
      winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        defaultMeta: { service: 'prompt-templates' },
        transports: [new winston.transports.Console()],
      });

    this.templates = new Map();
    this.templatesLoaded = false;
    this.loadTemplates().catch(error => {
      this.logger.error('Failed to load templates during initialization', {
        error: error.message,
      });
      // Load templates synchronously as fallback
      this.loadDefaultTemplatesSync();
    });
  }

  /**
   * Load all prompt templates from disk
   */
  async loadTemplates() {
    try {
      await this.ensureTemplatesDirectory();
      await this.initializeDefaultTemplates();
      this.templatesLoaded = true;

      this.logger.info('Prompt templates loaded successfully', {
        templateCount: this.templates.size,
      });
    } catch (error) {
      this.logger.error('Failed to load prompt templates', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Load default templates synchronously as fallback
   */
  loadDefaultTemplatesSync() {
    try {
      this.initializeDefaultTemplatesSync();
      this.templatesLoaded = true;

      this.logger.info('Default templates loaded synchronously', {
        templateCount: this.templates.size,
      });
    } catch (error) {
      this.logger.error('Failed to load default templates synchronously', {
        error: error.message,
      });
    }
  }

  /**
   * Ensure templates directory exists
   */
  async ensureTemplatesDirectory() {
    try {
      await fs.mkdir(this.templatesPath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create templates directory', {
        path: this.templatesPath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Initialize default prompt templates
   */
  async initializeDefaultTemplates() {
    const defaultTemplates = {
      // PR/Architect Templates
      pr_architect_analyze: {
        role: 'pr_architect',
        category: 'analysis',
        title: 'Project Analysis and Architecture Design',
        systemPrompt: `You are a Senior PR/Architect responsible for analyzing project requirements and creating comprehensive architecture designs.

**Your Core Responsibilities:**
- Analyze project requirements from README and codebase
- Design scalable and maintainable architecture
- Define technology stack and dependencies
- Create implementation roadmap
- Identify potential risks and mitigation strategies

**Focus Areas:**
- System design and component interaction
- Database schema and data flow
- API design and integration patterns
- Security considerations and best practices
- Performance optimization opportunities
- Testing strategy and quality assurance

**Output Format:**
Provide structured analysis with:
1. Project overview and requirements summary
2. Recommended architecture with diagrams
3. Technology stack justification
4. Implementation phases and timeline
5. Risk assessment and mitigation plan`,

        userTemplate: `Analyze the following project and create a comprehensive architecture design:

**Repository Information:**
{{repositoryUrl}}

**Project Context:**
{{projectContext}}

**Existing Codebase Analysis:**
{{codebaseAnalysis}}

**Requirements:**
{{requirements}}

**Constraints:**
{{constraints}}

**Budget Considerations:**
- Token Budget: {{tokenBudget}}
- Time Constraints: {{timeConstraints}}

Please provide a detailed architectural analysis and implementation plan.`,

        maxTokens: 4000,
        temperature: 0.7,
        version: '1.0.0',
      },

      pr_architect_review: {
        role: 'pr_architect',
        category: 'review',
        title: 'Architecture Review and Validation',
        systemPrompt: `You are a Senior PR/Architect conducting architecture review and validation.

**Review Focus:**
- Architecture adherence and consistency
- Design pattern implementation
- Code organization and structure
- Integration points and dependencies
- Security and performance implications

**Provide:**
- Architecture compliance assessment
- Improvement recommendations
- Risk identification
- Best practice validation`,

        userTemplate: `Review the following implementation against the original architecture:

**Original Architecture:**
{{originalArchitecture}}

**Current Implementation:**
{{currentImplementation}}

**Changes Made:**
{{changesSummary}}

**Specific Areas to Review:**
{{reviewAreas}}

Provide detailed review feedback and recommendations.`,

        maxTokens: 3000,
        temperature: 0.5,
        version: '1.0.0',
      },

      // Senior Developer Templates
      senior_developer_implement: {
        role: 'senior_developer',
        category: 'implementation',
        title: 'Code Implementation and Development',
        systemPrompt: `You are a Senior Developer responsible for generating production-ready code.

**Your Expertise:**
- Clean, efficient, and well-documented code
- Industry best practices and design patterns
- Security-conscious development
- Performance optimization
- Comprehensive error handling
- Thorough testing integration

**Code Standards:**
- Follow established conventions and style guides
- Include comprehensive documentation
- Implement proper error handling
- Add meaningful comments and JSDoc
- Ensure type safety where applicable
- Write testable and maintainable code

**Output Requirements:**
- Complete, runnable code files
- Proper imports and dependencies
- Configuration files if needed
- Clear implementation notes`,

        userTemplate: `Implement the following functionality based on the architecture specification:

**Architecture Specification:**
{{architectureSpec}}

**Implementation Requirements:**
{{implementationRequirements}}

**Existing Codebase:**
{{existingCode}}

**Technology Stack:**
{{techStack}}

**Specific Tasks:**
{{specificTasks}}

**Quality Requirements:**
- Code coverage: {{coverageTarget}}%
- Performance targets: {{performanceTargets}}
- Security standards: {{securityStandards}}

Generate complete, production-ready implementation.`,

        maxTokens: 8000,
        temperature: 0.3,
        version: '1.0.0',
      },

      senior_developer_refactor: {
        role: 'senior_developer',
        category: 'refactoring',
        title: 'Code Refactoring and Optimization',
        systemPrompt: `You are a Senior Developer specializing in code refactoring and optimization.

**Refactoring Focus:**
- Code quality improvement
- Performance optimization
- Maintainability enhancement
- Design pattern implementation
- Technical debt reduction

**Maintain:**
- Existing functionality and behavior
- API compatibility
- Test coverage
- Documentation accuracy`,

        userTemplate: `Refactor the following code based on the specified requirements:

**Current Code:**
{{currentCode}}

**Refactoring Goals:**
{{refactoringGoals}}

**Quality Metrics to Improve:**
{{qualityMetrics}}

**Constraints:**
{{constraints}}

Provide refactored code with improvement explanations.`,

        maxTokens: 6000,
        temperature: 0.3,
        version: '1.0.0',
      },

      // QA Engineer Templates
      qa_engineer_test_plan: {
        role: 'qa_engineer',
        category: 'testing',
        title: 'Comprehensive Test Plan Creation',
        systemPrompt: `You are a QA Engineer responsible for creating comprehensive test plans and ensuring code quality.

**Testing Expertise:**
- Unit testing strategies and implementation
- Integration testing design
- End-to-end testing scenarios
- Security testing considerations
- Performance testing approaches
- Edge case identification

**Test Types to Cover:**
- Unit tests with high coverage
- Integration tests for component interaction
- API testing with various scenarios
- Security vulnerability testing
- Performance and load testing
- Error handling and edge cases

**Quality Standards:**
- Minimum 85% code coverage
- Comprehensive edge case testing
- Security vulnerability scanning
- Performance benchmarking`,

        userTemplate: `Create a comprehensive test plan for the following implementation:

**Code Implementation:**
{{codeImplementation}}

**Architecture Specification:**
{{architectureSpec}}

**Testing Requirements:**
{{testingRequirements}}

**Quality Gates:**
{{qualityGates}}

**Risk Areas:**
{{riskAreas}}

**Testing Constraints:**
- Time budget: {{timeBudget}}
- Coverage target: {{coverageTarget}}%
- Performance targets: {{performanceTargets}}

Generate complete test suites with implementation code.`,

        maxTokens: 4000,
        temperature: 0.5,
        version: '1.0.0',
      },

      qa_engineer_review: {
        role: 'qa_engineer',
        category: 'review',
        title: 'Quality Assurance Review',
        systemPrompt: `You are a QA Engineer conducting quality assurance review.

**Review Areas:**
- Code quality and standards compliance
- Test coverage and effectiveness
- Security vulnerability assessment
- Performance analysis
- Documentation completeness
- Best practice adherence

**Provide:**
- Quality metrics assessment
- Issue identification and severity
- Testing recommendations
- Improvement suggestions`,

        userTemplate: `Conduct quality assurance review for:

**Implementation:**
{{implementation}}

**Test Results:**
{{testResults}}

**Quality Metrics:**
{{qualityMetrics}}

**Review Criteria:**
{{reviewCriteria}}

Provide comprehensive QA assessment and recommendations.`,

        maxTokens: 3000,
        temperature: 0.4,
        version: '1.0.0',
      },
    };

    // Store templates in memory
    for (const [templateId, template] of Object.entries(defaultTemplates)) {
      this.templates.set(templateId, template);
    }

    // Write templates to disk for persistence
    await this.saveTemplatesToDisk(defaultTemplates);
  }

  /**
   * Initialize default prompt templates synchronously
   */
  initializeDefaultTemplatesSync() {
    const defaultTemplates = {
      // PR/Architect Templates
      pr_architect_analyze: {
        role: 'pr_architect',
        category: 'analysis',
        title: 'Project Analysis and Architecture Design',
        systemPrompt: `You are a Senior PR/Architect responsible for analyzing project requirements and creating comprehensive architecture designs.

**Your Core Responsibilities:**
- Analyze project requirements from README and codebase
- Design scalable and maintainable architecture
- Define technology stack and dependencies
- Create implementation roadmap
- Identify potential risks and mitigation strategies

**Focus Areas:**
- System design and component interaction
- Database schema and data flow
- API design and integration patterns
- Security considerations and best practices
- Performance optimization opportunities
- Testing strategy and quality assurance

**Output Format:**
Provide structured analysis with:
1. Project overview and requirements summary
2. Recommended architecture with diagrams
3. Technology stack justification
4. Implementation phases and timeline
5. Risk assessment and mitigation plan`,

        userTemplate: `Analyze the following project and create a comprehensive architecture design:

**Repository Information:**
{{repositoryUrl}}

**Project Context:**
{{projectContext}}

**Existing Codebase Analysis:**
{{codebaseAnalysis}}

**Requirements:**
{{requirements}}

**Constraints:**
{{constraints}}

**Budget Considerations:**
- Token Budget: {{tokenBudget}}
- Time Constraints: {{timeConstraints}}

Please provide a detailed architectural analysis and implementation plan.`,

        maxTokens: 4000,
        temperature: 0.7,
        version: '1.0.0',
      },

      pr_architect_review: {
        role: 'pr_architect',
        category: 'review',
        title: 'Architecture Review and Validation',
        systemPrompt: `You are a Senior PR/Architect conducting architecture review and validation.

**Review Focus:**
- Architecture adherence and consistency
- Design pattern implementation
- Code organization and structure
- Integration points and dependencies
- Security and performance implications

**Provide:**
- Architecture compliance assessment
- Improvement recommendations
- Risk identification
- Best practice validation`,

        userTemplate: `Review the following implementation against the original architecture:

**Original Architecture:**
{{originalArchitecture}}

**Current Implementation:**
{{currentImplementation}}

**Changes Made:**
{{changesSummary}}

**Specific Areas to Review:**
{{reviewAreas}}

Provide detailed review feedback and recommendations.`,

        maxTokens: 3000,
        temperature: 0.5,
        version: '1.0.0',
      },

      // Senior Developer Templates
      senior_developer_implement: {
        role: 'senior_developer',
        category: 'implementation',
        title: 'Code Implementation and Development',
        systemPrompt: `You are a Senior Developer responsible for generating production-ready code.

**Your Expertise:**
- Clean, efficient, and well-documented code
- Industry best practices and design patterns
- Security-conscious development
- Performance optimization
- Comprehensive error handling
- Thorough testing integration

**Code Standards:**
- Follow established conventions and style guides
- Include comprehensive documentation
- Implement proper error handling
- Add meaningful comments and JSDoc
- Ensure type safety where applicable
- Write testable and maintainable code

**Output Requirements:**
- Complete, runnable code files
- Proper imports and dependencies
- Configuration files if needed
- Clear implementation notes`,

        userTemplate: `Implement the following functionality based on the architecture specification:

**Architecture Specification:**
{{architectureSpec}}

**Implementation Requirements:**
{{implementationRequirements}}

**Existing Codebase:**
{{existingCode}}

**Technology Stack:**
{{techStack}}

**Specific Tasks:**
{{specificTasks}}

**Quality Requirements:**
- Code coverage: {{coverageTarget}}%
- Performance targets: {{performanceTargets}}
- Security standards: {{securityStandards}}

Generate complete, production-ready implementation.`,

        maxTokens: 8000,
        temperature: 0.3,
        version: '1.0.0',
      },

      senior_developer_refactor: {
        role: 'senior_developer',
        category: 'refactoring',
        title: 'Code Refactoring and Optimization',
        systemPrompt: `You are a Senior Developer specializing in code refactoring and optimization.

**Refactoring Focus:**
- Code quality improvement
- Performance optimization
- Maintainability enhancement
- Design pattern implementation
- Technical debt reduction

**Maintain:**
- Existing functionality and behavior
- API compatibility
- Test coverage
- Documentation accuracy`,

        userTemplate: `Refactor the following code based on the specified requirements:

**Current Code:**
{{currentCode}}

**Refactoring Goals:**
{{refactoringGoals}}

**Quality Metrics to Improve:**
{{qualityMetrics}}

**Constraints:**
{{constraints}}

Provide refactored code with improvement explanations.`,

        maxTokens: 6000,
        temperature: 0.3,
        version: '1.0.0',
      },

      // QA Engineer Templates
      qa_engineer_test_plan: {
        role: 'qa_engineer',
        category: 'testing',
        title: 'Comprehensive Test Plan Creation',
        systemPrompt: `You are a QA Engineer responsible for creating comprehensive test plans and ensuring code quality.

**Testing Expertise:**
- Unit testing strategies and implementation
- Integration testing design
- End-to-end testing scenarios
- Security testing considerations
- Performance testing approaches
- Edge case identification

**Test Types to Cover:**
- Unit tests with high coverage
- Integration tests for component interaction
- API testing with various scenarios
- Security vulnerability testing
- Performance and load testing
- Error handling and edge cases

**Quality Standards:**
- Minimum 85% code coverage
- Comprehensive edge case testing
- Security vulnerability scanning
- Performance benchmarking`,

        userTemplate: `Create a comprehensive test plan for the following implementation:

**Code Implementation:**
{{codeImplementation}}

**Architecture Specification:**
{{architectureSpec}}

**Testing Requirements:**
{{testingRequirements}}

**Quality Gates:**
{{qualityGates}}

**Risk Areas:**
{{riskAreas}}

**Testing Constraints:**
- Time budget: {{timeBudget}}
- Coverage target: {{coverageTarget}}%
- Performance targets: {{performanceTargets}}

Generate complete test suites with implementation code.`,

        maxTokens: 4000,
        temperature: 0.5,
        version: '1.0.0',
      },

      qa_engineer_review: {
        role: 'qa_engineer',
        category: 'review',
        title: 'Quality Assurance Review',
        systemPrompt: `You are a QA Engineer conducting quality assurance review.

**Review Areas:**
- Code quality and standards compliance
- Test coverage and effectiveness
- Security vulnerability assessment
- Performance analysis
- Documentation completeness
- Best practice adherence

**Provide:**
- Quality metrics assessment
- Issue identification and severity
- Testing recommendations
- Improvement suggestions`,

        userTemplate: `Conduct quality assurance review for:

**Implementation:**
{{implementation}}

**Test Results:**
{{testResults}}

**Quality Metrics:**
{{qualityMetrics}}

**Review Criteria:**
{{reviewCriteria}}

Provide comprehensive QA assessment and recommendations.`,

        maxTokens: 3000,
        temperature: 0.4,
        version: '1.0.0',
      },
    };

    // Store templates in memory
    for (const [templateId, template] of Object.entries(defaultTemplates)) {
      this.templates.set(templateId, template);
    }
  }

  /**
   * Save templates to disk for persistence
   * @param {Object} templates - Templates to save
   */
  async saveTemplatesToDisk(templates) {
    try {
      const templatesFile = path.join(
        this.templatesPath,
        'default-templates.json'
      );
      await fs.writeFile(templatesFile, JSON.stringify(templates, null, 2));

      this.logger.info('Templates saved to disk', {
        file: templatesFile,
        count: Object.keys(templates).length,
      });
    } catch (error) {
      this.logger.error('Failed to save templates to disk', {
        error: error.message,
      });
    }
  }

  /**
   * Get prompt template by ID
   * @param {string} templateId - Template identifier
   * @returns {Object|null} Template object or null if not found
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get templates by role
   * @param {string} role - Agent role (pr_architect, senior_developer, qa_engineer)
   * @returns {Array<Object>} Array of templates for the role
   */
  getTemplatesByRole(role) {
    const roleTemplates = [];
    for (const [templateId, template] of this.templates) {
      if (template.role === role) {
        roleTemplates.push({ id: templateId, ...template });
      }
    }
    return roleTemplates;
  }

  /**
   * Get templates by category
   * @param {string} category - Template category
   * @returns {Array<Object>} Array of templates in the category
   */
  getTemplatesByCategory(category) {
    const categoryTemplates = [];
    for (const [templateId, template] of this.templates) {
      if (template.category === category) {
        categoryTemplates.push({ id: templateId, ...template });
      }
    }
    return categoryTemplates;
  }

  /**
   * Render prompt template with context variables
   * @param {string} templateId - Template identifier
   * @param {Object} context - Context variables for template rendering
   * @returns {Object} Rendered prompt with system and user messages
   */
  renderTemplate(templateId, context = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    try {
      const renderedUserPrompt = this.interpolateTemplate(
        template.userTemplate,
        context
      );
      const renderedSystemPrompt = this.interpolateTemplate(
        template.systemPrompt,
        context
      );

      const result = {
        templateId,
        role: template.role,
        category: template.category,
        title: template.title,
        systemPrompt: renderedSystemPrompt,
        userPrompt: renderedUserPrompt,
        maxTokens: template.maxTokens,
        temperature: template.temperature,
        version: template.version,
        renderedAt: new Date().toISOString(),
        contextKeys: Object.keys(context),
      };

      this.logger.info('Template rendered successfully', {
        templateId,
        role: template.role,
        userPromptLength: renderedUserPrompt.length,
        contextKeys: Object.keys(context).length,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to render template', {
        templateId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Interpolate template string with context variables
   * @param {string} template - Template string with {{variable}} placeholders
   * @param {Object} context - Context variables
   * @returns {string} Interpolated string
   */
  interpolateTemplate(template, context) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const value = context[variable.trim()];
      if (value === undefined || value === null) {
        this.logger.warn('Template variable not found in context', {
          variable,
          availableKeys: Object.keys(context),
        });
        return match; // Keep placeholder if variable not found
      }
      return String(value);
    });
  }

  /**
   * Optimize prompt for token efficiency
   * @param {string} prompt - Original prompt
   * @param {number} maxTokens - Maximum token limit
   * @returns {string} Optimized prompt
   */
  optimizePrompt(prompt, maxTokens = 4000) {
    // Rough token estimation (1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(prompt.length / 4);

    if (estimatedTokens <= maxTokens) {
      return prompt;
    }

    // Simple optimization: truncate while preserving structure
    const targetLength = maxTokens * 3.5; // Conservative estimate

    if (prompt.length <= targetLength) {
      return prompt;
    }

    // Find good truncation point (end of sentence)
    const truncated = prompt.substring(0, targetLength);
    const lastSentence = truncated.lastIndexOf('.');

    if (lastSentence > targetLength * 0.8) {
      return (
        truncated.substring(0, lastSentence + 1) +
        '\n\n[Content truncated for token limits]'
      );
    }

    return truncated + '\n\n[Content truncated for token limits]';
  }

  /**
   * Add custom template
   * @param {string} templateId - Template identifier
   * @param {Object} template - Template configuration
   */
  addTemplate(templateId, template) {
    const requiredFields = [
      'role',
      'category',
      'title',
      'systemPrompt',
      'userTemplate',
    ];
    for (const field of requiredFields) {
      if (!template[field]) {
        throw new Error(`Template missing required field: ${field}`);
      }
    }

    template.version = template.version || '1.0.0';
    template.maxTokens = template.maxTokens || 4000;
    template.temperature = template.temperature || 0.5;

    this.templates.set(templateId, template);

    this.logger.info('Custom template added', {
      templateId,
      role: template.role,
      category: template.category,
    });
  }

  /**
   * Get all available templates
   * @returns {Array<Object>} Array of all templates with metadata
   */
  getAllTemplates() {
    const allTemplates = [];
    for (const [templateId, template] of this.templates) {
      allTemplates.push({
        id: templateId,
        role: template.role,
        category: template.category,
        title: template.title,
        version: template.version,
        maxTokens: template.maxTokens,
        temperature: template.temperature,
      });
    }
    return allTemplates;
  }

  /**
   * Validate template context for completeness
   * @param {string} templateId - Template identifier
   * @param {Object} context - Context to validate
   * @returns {Object} Validation result with missing variables
   */
  validateContext(templateId, context) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const templateText = template.systemPrompt + template.userTemplate;
    const requiredVariables = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(templateText)) !== null) {
      const variable = match[1].trim();
      if (!requiredVariables.includes(variable)) {
        requiredVariables.push(variable);
      }
    }

    const missingVariables = requiredVariables.filter(
      variable => context[variable] === undefined || context[variable] === null
    );

    return {
      valid: missingVariables.length === 0,
      requiredVariables,
      missingVariables,
      providedVariables: Object.keys(context),
    };
  }
}

module.exports = PromptTemplateManager;
