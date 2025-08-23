/**
 * QuantaPilot™ Circuit Breaker and Error Handling System
 * 
 * Implements circuit breaker pattern for AI API calls with intelligent error handling,
 * retry logic, and graceful degradation strategies.
 * 
 * @author QuantaPilot™ Team
 * @version 1.0.0
 */

const winston = require('winston');
const EventEmitter = require('events');

/**
 * Circuit breaker states
 */
const CIRCUIT_STATES = {
  CLOSED: 'closed',       // Normal operation
  OPEN: 'open',          // Circuit is open, rejecting requests
  HALF_OPEN: 'half_open' // Testing if service has recovered
};

/**
 * Error categories for intelligent handling
 */
const ERROR_CATEGORIES = {
  TRANSIENT: 'transient',           // Temporary errors, safe to retry
  RATE_LIMIT: 'rate_limit',         // Rate limiting errors
  AUTH_ERROR: 'auth_error',         // Authentication/authorization errors
  QUOTA_EXCEEDED: 'quota_exceeded', // Token/quota exceeded
  SERVICE_ERROR: 'service_error',   // Service unavailable
  VALIDATION_ERROR: 'validation_error', // Request validation errors
  PERMANENT: 'permanent',           // Permanent errors, don't retry
  UNKNOWN: 'unknown'                // Unknown error type
};

/**
 * Circuit breaker implementation with intelligent error handling
 * 
 * Features:
 * - State-based request handling
 * - Configurable failure thresholds
 * - Exponential backoff retry logic
 * - Error categorization and handling
 * - Metrics collection and monitoring
 * - Graceful degradation strategies
 * 
 * @class CircuitBreaker
 * @extends EventEmitter
 */
class CircuitBreaker extends EventEmitter {
  /**
   * Initialize circuit breaker
   * @param {Object} config - Configuration object
   * @param {Function} config.requestFunction - Function to wrap with circuit breaker
   * @param {number} config.failureThreshold - Number of failures before opening circuit
   * @param {number} config.timeout - Request timeout in milliseconds
   * @param {number} config.resetTimeout - Time before attempting to close circuit
   * @param {number} config.monitoringPeriod - Period for failure rate calculation
   * @param {Object} config.logger - Winston logger instance
   */
  constructor(config = {}) {
    super();

    this.requestFunction = config.requestFunction;
    this.failureThreshold = config.failureThreshold || 5;
    this.timeout = config.timeout || 30000;
    this.resetTimeout = config.resetTimeout || 60000;
    this.monitoringPeriod = config.monitoringPeriod || 600000; // 10 minutes
    this.halfOpenMaxCalls = config.halfOpenMaxCalls || 3;

    this.logger = config.logger || winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'circuit-breaker' },
      transports: [new winston.transports.Console()]
    });

    // Circuit state
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCallCount = 0;

    // Metrics tracking
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      timeouts: 0,
      circuitOpenings: 0,
      stateChanges: [],
      errorCounts: {}
    };

    // Request history for monitoring period
    this.requestHistory = [];

    this.logger.info('Circuit breaker initialized', {
      failureThreshold: this.failureThreshold,
      timeout: this.timeout,
      resetTimeout: this.resetTimeout
    });
  }

  /**
   * Execute request through circuit breaker
   * @param {Array} args - Arguments to pass to request function
   * @returns {Promise} Request result or circuit breaker error
   */
  async execute(...args) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Check circuit state before executing
      if (this.state === CIRCUIT_STATES.OPEN) {
        if (this.shouldAttemptReset()) {
          this.setState(CIRCUIT_STATES.HALF_OPEN);
        } else {
          this.metrics.rejectedRequests++;
          throw new CircuitBreakerError('Circuit breaker is OPEN', 'CIRCUIT_OPEN');
        }
      }

      // Limit concurrent calls in half-open state
      if (this.state === CIRCUIT_STATES.HALF_OPEN) {
        if (this.halfOpenCallCount >= this.halfOpenMaxCalls) {
          this.metrics.rejectedRequests++;
          throw new CircuitBreakerError('Half-open circuit at capacity', 'HALF_OPEN_CAPACITY');
        }
        this.halfOpenCallCount++;
      }

      // Execute request with timeout
      const result = await this.executeWithTimeout(...args);
      
      // Handle successful request
      await this.onSuccess(Date.now() - startTime);
      
      return result;
    } catch (error) {
      // Handle failed request
      await this.onFailure(error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Execute request with timeout wrapper
   * @param {Array} args - Arguments for request function
   * @returns {Promise} Request result
   */
  async executeWithTimeout(...args) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.metrics.timeouts++;
        reject(new CircuitBreakerError('Request timeout', 'TIMEOUT'));
      }, this.timeout);

      try {
        const result = await this.requestFunction(...args);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Handle successful request
   * @param {number} duration - Request duration in milliseconds
   */
  async onSuccess(duration) {
    this.metrics.successfulRequests++;
    
    this.addToHistory({
      timestamp: Date.now(),
      success: true,
      duration
    });

    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.halfOpenCallCount--;
      
      // Check if we should close the circuit
      if (this.halfOpenCallCount === 0) {
        this.setState(CIRCUIT_STATES.CLOSED);
        this.resetFailureCount();
      }
    } else if (this.state === CIRCUIT_STATES.CLOSED) {
      // Reset failure count on successful request
      this.resetFailureCount();
    }

    this.emit('success', { duration, state: this.state });
  }

  /**
   * Handle failed request
   * @param {Error} error - Request error
   * @param {number} duration - Request duration in milliseconds
   */
  async onFailure(error, duration) {
    this.metrics.failedRequests++;
    
    const errorCategory = this.categorizeError(error);
    this.metrics.errorCounts[errorCategory] = (this.metrics.errorCounts[errorCategory] || 0) + 1;

    this.addToHistory({
      timestamp: Date.now(),
      success: false,
      duration,
      error: error.message,
      category: errorCategory
    });

    this.logger.error('Request failed through circuit breaker', {
      error: error.message,
      category: errorCategory,
      state: this.state,
      failureCount: this.failureCount + 1
    });

    // Handle based on error category
    if (this.shouldCountAsFailure(errorCategory)) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.state === CIRCUIT_STATES.HALF_OPEN) {
        // Immediately open circuit on failure in half-open state
        this.setState(CIRCUIT_STATES.OPEN);
        this.halfOpenCallCount = 0;
      } else if (this.failureCount >= this.failureThreshold) {
        // Open circuit when threshold reached
        this.setState(CIRCUIT_STATES.OPEN);
        this.metrics.circuitOpenings++;
      }
    }

    this.emit('failure', { 
      error, 
      category: errorCategory, 
      duration, 
      state: this.state,
      failureCount: this.failureCount
    });
  }

  /**
   * Categorize error for intelligent handling
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const status = error.response?.status;

    // Network and connection errors
    if (message.includes('timeout') || message.includes('econnreset') || 
        message.includes('enotfound') || message.includes('econnrefused')) {
      return ERROR_CATEGORIES.TRANSIENT;
    }

    // HTTP status code based categorization
    if (status) {
      if (status === 429) return ERROR_CATEGORIES.RATE_LIMIT;
      if (status === 401 || status === 403) return ERROR_CATEGORIES.AUTH_ERROR;
      if (status === 402 || status === 413) return ERROR_CATEGORIES.QUOTA_EXCEEDED;
      if (status >= 500 && status < 600) return ERROR_CATEGORIES.SERVICE_ERROR;
      if (status >= 400 && status < 500) return ERROR_CATEGORIES.VALIDATION_ERROR;
    }

    // AI-specific error patterns
    if (message.includes('rate limit') || message.includes('quota exceeded')) {
      return ERROR_CATEGORIES.RATE_LIMIT;
    }

    if (message.includes('authentication') || message.includes('unauthorized')) {
      return ERROR_CATEGORIES.AUTH_ERROR;
    }

    if (message.includes('service unavailable') || message.includes('overloaded')) {
      return ERROR_CATEGORIES.SERVICE_ERROR;
    }

    if (message.includes('invalid request') || message.includes('bad request')) {
      return ERROR_CATEGORIES.VALIDATION_ERROR;
    }

    return ERROR_CATEGORIES.UNKNOWN;
  }

  /**
   * Determine if error should count towards circuit failure
   * @param {string} errorCategory - Error category
   * @returns {boolean} Whether error should count as failure
   */
  shouldCountAsFailure(errorCategory) {
    // Don't count validation errors as circuit failures
    return ![
      ERROR_CATEGORIES.VALIDATION_ERROR,
      ERROR_CATEGORIES.AUTH_ERROR
    ].includes(errorCategory);
  }

  /**
   * Check if circuit should attempt reset from open state
   * @returns {boolean} Whether to attempt reset
   */
  shouldAttemptReset() {
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  /**
   * Set circuit state and emit events
   * @param {string} newState - New circuit state
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;

    this.metrics.stateChanges.push({
      timestamp: Date.now(),
      from: oldState,
      to: newState,
      failureCount: this.failureCount
    });

    this.logger.info('Circuit breaker state changed', {
      from: oldState,
      to: newState,
      failureCount: this.failureCount
    });

    this.emit('stateChange', { from: oldState, to: newState });

    // Reset half-open call count when entering other states
    if (newState !== CIRCUIT_STATES.HALF_OPEN) {
      this.halfOpenCallCount = 0;
    }
  }

  /**
   * Reset failure count
   */
  resetFailureCount() {
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  /**
   * Add request to history for monitoring
   * @param {Object} record - Request record
   */
  addToHistory(record) {
    this.requestHistory.push(record);
    
    // Keep only records within monitoring period
    const cutoffTime = Date.now() - this.monitoringPeriod;
    this.requestHistory = this.requestHistory.filter(
      record => record.timestamp > cutoffTime
    );
  }

  /**
   * Get current circuit breaker metrics
   * @returns {Object} Current metrics and state
   */
  getMetrics() {
    const recentHistory = this.requestHistory.filter(
      record => record.timestamp > Date.now() - this.monitoringPeriod
    );

    const recentFailures = recentHistory.filter(record => !record.success);
    const failureRate = recentHistory.length > 0 ? 
      recentFailures.length / recentHistory.length : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime,
      metrics: {
        ...this.metrics,
        recentRequests: recentHistory.length,
        recentFailures: recentFailures.length,
        failureRate: parseFloat(failureRate.toFixed(3)),
        averageResponseTime: recentHistory.length > 0 ?
          recentHistory.reduce((sum, r) => sum + r.duration, 0) / recentHistory.length : 0
      }
    };
  }

  /**
   * Get failure rate for specified time window
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {number} Failure rate (0-1)
   */
  getFailureRate(timeWindow = this.monitoringPeriod) {
    const cutoffTime = Date.now() - timeWindow;
    const recentHistory = this.requestHistory.filter(
      record => record.timestamp > cutoffTime
    );

    if (recentHistory.length === 0) return 0;

    const failures = recentHistory.filter(record => !record.success).length;
    return failures / recentHistory.length;
  }

  /**
   * Check if circuit is healthy
   * @returns {boolean} Whether circuit is healthy
   */
  isHealthy() {
    return this.state === CIRCUIT_STATES.CLOSED && 
           this.getFailureRate() < 0.5; // 50% failure rate threshold
  }

  /**
   * Manually open circuit (for maintenance, etc.)
   */
  forceOpen() {
    this.setState(CIRCUIT_STATES.OPEN);
    this.logger.info('Circuit breaker manually opened');
  }

  /**
   * Manually close circuit (force reset)
   */
  forceClose() {
    this.setState(CIRCUIT_STATES.CLOSED);
    this.resetFailureCount();
    this.logger.info('Circuit breaker manually closed');
  }

  /**
   * Get comprehensive health report
   * @returns {Object} Detailed health report
   */
  getHealthReport() {
    const metrics = this.getMetrics();
    const recentErrors = this.requestHistory
      .filter(record => !record.success && record.timestamp > Date.now() - 300000) // Last 5 minutes
      .reduce((acc, record) => {
        acc[record.category] = (acc[record.category] || 0) + 1;
        return acc;
      }, {});

    return {
      timestamp: new Date().toISOString(),
      state: this.state,
      healthy: this.isHealthy(),
      metrics,
      recentErrors,
      recommendations: this.generateRecommendations(metrics, recentErrors)
    };
  }

  /**
   * Generate recommendations based on current state
   * @param {Object} metrics - Current metrics
   * @param {Object} recentErrors - Recent error breakdown
   * @returns {Array<string>} Recommendations
   */
  generateRecommendations(metrics, recentErrors) {
    const recommendations = [];

    if (metrics.failureRate > 0.3) {
      recommendations.push('High failure rate detected - consider checking service health');
    }

    if (recentErrors[ERROR_CATEGORIES.RATE_LIMIT] > 0) {
      recommendations.push('Rate limiting detected - implement request throttling');
    }

    if (recentErrors[ERROR_CATEGORIES.AUTH_ERROR] > 0) {
      recommendations.push('Authentication errors - verify API credentials');
    }

    if (metrics.metrics.averageResponseTime > 10000) {
      recommendations.push('High response times - consider timeout adjustment');
    }

    if (this.state === CIRCUIT_STATES.OPEN) {
      recommendations.push('Circuit is open - service may be unhealthy');
    }

    return recommendations;
  }
}

/**
 * Custom error class for circuit breaker errors
 */
class CircuitBreakerError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.code = code;
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerError,
  CIRCUIT_STATES,
  ERROR_CATEGORIES
};
