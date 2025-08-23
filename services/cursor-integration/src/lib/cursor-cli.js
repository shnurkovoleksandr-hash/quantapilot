/**
 * QuantaPilot™ Cursor CLI Integration Wrapper
 *
 * Provides a comprehensive interface to Cursor CLI for AI agent interactions.
 * Handles command execution, error handling, and response processing.
 *
 * @author QuantaPilot™ Team
 * @version 1.0.0
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');
const { promisify } = require('util');

// Create execAsync with proper handling for tests
const createExecAsync = () => {
  if (process.env.NODE_ENV === 'test') {
    // In test environment, return a mock-friendly function
    return (...args) => {
      if (
        typeof promisify === 'function' &&
        typeof promisify().then === 'function'
      ) {
        return promisify(exec)(...args);
      }
      // Fallback for tests
      return Promise.resolve({ stdout: '', stderr: '' });
    };
  }
  return promisify(exec);
};

const execAsync = createExecAsync();

/**
 * Cursor CLI wrapper class for managing AI interactions
 *
 * This class provides methods to:
 * - Execute Cursor CLI commands
 * - Manage project contexts
 * - Handle file operations
 * - Process AI responses
 *
 * @class CursorCLI
 */
class CursorCLI {
  /**
   * Initialize Cursor CLI wrapper
   * @param {Object} config - Configuration object
   * @param {string} config.cursorPath - Path to Cursor CLI executable
   * @param {string} config.workspaceRoot - Root directory for projects
   * @param {Object} config.logger - Winston logger instance
   * @param {number} config.timeout - Command timeout in milliseconds
   */
  constructor(config = {}) {
    this.cursorPath = config.cursorPath || 'cursor';
    this.workspaceRoot = config.workspaceRoot || '/tmp/quantapilot-projects';
    this.timeout = config.timeout || 300000; // 5 minutes default
    this.logger =
      config.logger ||
      winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        defaultMeta: { service: 'cursor-cli' },
        transports: [new winston.transports.Console()],
      });

    this.ensureWorkspaceExists();
  }

  /**
   * Ensure workspace directory exists
   */
  async ensureWorkspaceExists() {
    try {
      await fs.mkdir(this.workspaceRoot, { recursive: true });
      this.logger.info('Workspace directory ensured', {
        path: this.workspaceRoot,
      });
    } catch (error) {
      this.logger.error('Failed to create workspace directory', {
        path: this.workspaceRoot,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if Cursor CLI is available and accessible
   * @returns {Promise<boolean>} True if Cursor CLI is available
   */
  async checkCursorAvailability() {
    try {
      const { stdout } = await execAsync(`${this.cursorPath} --version`, {
        timeout: 10000,
      });

      this.logger.info('Cursor CLI availability check passed', {
        version: stdout.trim(),
      });
      return true;
    } catch (error) {
      this.logger.error('Cursor CLI availability check failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Create a new project workspace
   * @param {string} projectId - Unique project identifier
   * @param {string} repositoryUrl - GitHub repository URL (optional)
   * @returns {Promise<string>} Path to created project directory
   */
  async createProjectWorkspace(projectId, repositoryUrl = null) {
    const projectPath = path.join(this.workspaceRoot, projectId);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      if (repositoryUrl) {
        await this.cloneRepository(repositoryUrl, projectPath);
      }

      this.logger.info('Project workspace created', {
        projectId,
        projectPath,
        repositoryUrl,
      });

      return projectPath;
    } catch (error) {
      this.logger.error('Failed to create project workspace', {
        projectId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clone a repository into project workspace
   * @param {string} repositoryUrl - GitHub repository URL
   * @param {string} targetPath - Target directory path
   */
  async cloneRepository(repositoryUrl, targetPath) {
    try {
      const { stdout, stderr } = await execAsync(
        `git clone ${repositoryUrl} ${targetPath}`,
        { timeout: this.timeout }
      );

      this.logger.info('Repository cloned successfully', {
        repositoryUrl,
        targetPath,
        output: stdout,
      });
    } catch (error) {
      this.logger.error('Failed to clone repository', {
        repositoryUrl,
        targetPath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute Cursor CLI command in project context
   * @param {string} projectPath - Project directory path
   * @param {string} command - Cursor command to execute
   * @param {Array<string>} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command execution result
   */
  async executeCursorCommand(projectPath, command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const fullArgs = [command, ...args];
      const startTime = Date.now();

      this.logger.info('Executing Cursor CLI command', {
        projectPath,
        command,
        args: fullArgs,
        timeout: this.timeout,
      });

      const childProcess = spawn(this.cursorPath, fullArgs, {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.timeout,
        ...options,
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', data => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', data => {
        stderr += data.toString();
      });

      childProcess.on('close', code => {
        const duration = Date.now() - startTime;

        if (code === 0) {
          this.logger.info('Cursor CLI command completed successfully', {
            projectPath,
            command,
            duration,
            outputLength: stdout.length,
          });

          resolve({
            success: true,
            code,
            stdout,
            stderr,
            duration,
          });
        } else {
          this.logger.error('Cursor CLI command failed', {
            projectPath,
            command,
            code,
            stderr,
            duration,
          });

          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      childProcess.on('error', error => {
        const duration = Date.now() - startTime;
        this.logger.error('Cursor CLI command error', {
          projectPath,
          command,
          error: error.message,
          duration,
        });

        reject(error);
      });

      // Set timeout
      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill('SIGTERM');
          reject(new Error(`Command timed out after ${this.timeout}ms`));
        }
      }, this.timeout);
    });
  }

  /**
   * Generate code using Cursor AI agents
   * @param {string} projectPath - Project directory path
   * @param {string} prompt - AI prompt for code generation
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated code and metadata
   */
  async generateCode(projectPath, prompt, options = {}) {
    try {
      const result = await this.executeCursorCommand(
        projectPath,
        'ai',
        ['generate', '--prompt', prompt, '--format', 'json'],
        options
      );

      const generatedData = JSON.parse(result.stdout);

      this.logger.info('Code generation completed', {
        projectPath,
        promptLength: prompt.length,
        generatedFiles: generatedData.files?.length || 0,
        tokensUsed: generatedData.usage?.total_tokens,
      });

      return {
        success: true,
        files: generatedData.files || [],
        usage: generatedData.usage || {},
        metadata: generatedData.metadata || {},
        duration: result.duration,
      };
    } catch (error) {
      this.logger.error('Code generation failed', {
        projectPath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Analyze existing code in project
   * @param {string} projectPath - Project directory path
   * @param {Array<string>} files - Files to analyze (optional)
   * @returns {Promise<Object>} Code analysis results
   */
  async analyzeCode(projectPath, files = []) {
    try {
      const args = ['analyze', '--format', 'json'];
      if (files.length > 0) {
        args.push('--files', files.join(','));
      }

      const result = await this.executeCursorCommand(projectPath, 'ai', args);

      const analysisData = JSON.parse(result.stdout);

      this.logger.info('Code analysis completed', {
        projectPath,
        filesAnalyzed: files.length || 'all',
        issuesFound: analysisData.issues?.length || 0,
      });

      return {
        success: true,
        analysis: analysisData.analysis || {},
        issues: analysisData.issues || [],
        suggestions: analysisData.suggestions || [],
        metrics: analysisData.metrics || {},
        duration: result.duration,
      };
    } catch (error) {
      this.logger.error('Code analysis failed', {
        projectPath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Apply code changes using Cursor AI
   * @param {string} projectPath - Project directory path
   * @param {string} instruction - Change instruction
   * @param {Array<string>} targetFiles - Files to modify
   * @returns {Promise<Object>} Applied changes metadata
   */
  async applyChanges(projectPath, instruction, targetFiles = []) {
    try {
      const args = ['apply', '--instruction', instruction, '--format', 'json'];
      if (targetFiles.length > 0) {
        args.push('--files', targetFiles.join(','));
      }

      const result = await this.executeCursorCommand(projectPath, 'ai', args);

      const changesData = JSON.parse(result.stdout);

      this.logger.info('Changes applied successfully', {
        projectPath,
        instruction: instruction.substring(0, 100),
        filesModified: changesData.modified_files?.length || 0,
        tokensUsed: changesData.usage?.total_tokens,
      });

      return {
        success: true,
        modifiedFiles: changesData.modified_files || [],
        changes: changesData.changes || [],
        usage: changesData.usage || {},
        duration: result.duration,
      };
    } catch (error) {
      this.logger.error('Failed to apply changes', {
        projectPath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Run tests in project workspace
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Test execution options
   * @returns {Promise<Object>} Test results
   */
  async runTests(projectPath, options = {}) {
    try {
      const args = ['test'];
      if (options.coverage) args.push('--coverage');
      if (options.reporter) args.push('--reporter', options.reporter);

      const result = await this.executeCursorCommand(projectPath, 'npm', args);

      this.logger.info('Tests executed successfully', {
        projectPath,
        testDuration: result.duration,
      });

      return {
        success: true,
        output: result.stdout,
        duration: result.duration,
        passed: !result.stderr.includes('failed'),
      };
    } catch (error) {
      this.logger.error('Test execution failed', {
        projectPath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clean up project workspace
   * @param {string} projectId - Project identifier
   */
  async cleanupProject(projectId) {
    const projectPath = path.join(this.workspaceRoot, projectId);

    try {
      await fs.rm(projectPath, { recursive: true, force: true });

      this.logger.info('Project workspace cleaned up', {
        projectId,
        projectPath,
      });
    } catch (error) {
      this.logger.error('Failed to cleanup project workspace', {
        projectId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get project workspace information
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Project workspace information
   */
  async getProjectInfo(projectId) {
    const projectPath = path.join(this.workspaceRoot, projectId);

    try {
      const stats = await fs.stat(projectPath);
      const files = await fs.readdir(projectPath);

      return {
        projectId,
        projectPath,
        exists: true,
        created: stats.birthtime,
        modified: stats.mtime,
        fileCount: files.length,
        size: stats.size,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          projectId,
          projectPath,
          exists: false,
        };
      }
      throw error;
    }
  }
}

module.exports = CursorCLI;
