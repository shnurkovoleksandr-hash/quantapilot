/**
 * Unit tests for Circuit Breaker
 * @jest-environment node
 */

const { CircuitBreaker, CircuitBreakerError, CIRCUIT_STATES, ERROR_CATEGORIES } = require('../src/lib/circuit-breaker');
const winston = require('winston');

describe('CircuitBreaker', () => {
  let circuitBreaker;
  let mockRequestFunction;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockLogger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console({ silent: true })]
    });

    mockRequestFunction = jest.fn();
    
    circuitBreaker = new CircuitBreaker({
      requestFunction: mockRequestFunction,
      failureThreshold: 3,
      timeout: 5000,
      resetTimeout: 10000,
      logger: mockLogger
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const cb = new CircuitBreaker({ requestFunction: jest.fn() });
      
      expect(cb.failureThreshold).toBe(5);
      expect(cb.timeout).toBe(30000);
      expect(cb.resetTimeout).toBe(60000);
      expect(cb.state).toBe(CIRCUIT_STATES.CLOSED);
    });

    it('should initialize with custom configuration', () => {
      expect(circuitBreaker.failureThreshold).toBe(3);
      expect(circuitBreaker.timeout).toBe(5000);
      expect(circuitBreaker.resetTimeout).toBe(10000);
      expect(circuitBreaker.state).toBe(CIRCUIT_STATES.CLOSED);
    });
  });

  describe('execute - closed state', () => {
    it('should execute request successfully', async () => {
      const mockResponse = { data: 'success' };
      mockRequestFunction.mockResolvedValue(mockResponse);

      const result = await circuitBreaker.execute('test', 'args');

      expect(result).toBe(mockResponse);
      expect(mockRequestFunction).toHaveBeenCalledWith('test', 'args');
      expect(circuitBreaker.state).toBe(CIRCUIT_STATES.CLOSED);
      expect(circuitBreaker.metrics.successfulRequests).toBe(1);
    });

    it('should handle request failure', async () => {
      const error = new Error('Request failed');
      mockRequestFunction.mockRejectedValue(error);

      await expect(circuitBreaker.execute('test')).rejects.toThrow('Request failed');
      
      expect(circuitBreaker.failureCount).toBe(1);
      expect(circuitBreaker.metrics.failedRequests).toBe(1);
      expect(circuitBreaker.state).toBe(CIRCUIT_STATES.CLOSED);
    });

    it('should open circuit after reaching failure threshold', async () => {
      const error = new Error('Request failed');
      mockRequestFunction.mockRejectedValue(error);

      // Trigger 3 failures (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('test');
        } catch (e) {
          // Expected failures
        }
      }

      expect(circuitBreaker.state).toBe(CIRCUIT_STATES.OPEN);
      expect(circuitBreaker.failureCount).toBe(3);
      expect(circuitBreaker.metrics.circuitOpenings).toBe(1);
    });
  });

  describe('execute - open state', () => {
    beforeEach(() => {
      // Force circuit to open state
      circuitBreaker.setState(CIRCUIT_STATES.OPEN);
      circuitBreaker.lastFailureTime = Date.now();
    });

    it('should reject requests immediately when circuit is open', async () => {
      await expect(circuitBreaker.execute('test')).rejects.toThrow(CircuitBreakerError);
      
      expect(mockRequestFunction).not.toHaveBeenCalled();
      expect(circuitBreaker.metrics.rejectedRequests).toBe(1);
    });

    it('should transition to half-open after reset timeout', async () => {
      mockRequestFunction.mockResolvedValue({ data: 'success' });

      // Fast forward past reset timeout
      jest.advanceTimersByTime(10001);

      const result = await circuitBreaker.execute('test');

      expect(result.data).toBe('success');
      expect(circuitBreaker.state).toBe(CIRCUIT_STATES.CLOSED);
    });
  });

  describe('execute - half-open state', () => {
    beforeEach(() => {
      circuitBreaker.setState(CIRCUIT_STATES.HALF_OPEN);
    });

    it('should close circuit on successful request', async () => {
      const mockResponse = { data: 'success' };
      mockRequestFunction.mockResolvedValue(mockResponse);

      const result = await circuitBreaker.execute('test');

      expect(result).toBe(mockResponse);
      expect(circuitBreaker.state).toBe(CIRCUIT_STATES.CLOSED);
      expect(circuitBreaker.failureCount).toBe(0);
    });

    it('should open circuit immediately on failure', async () => {
      const error = new Error('Request failed');
      mockRequestFunction.mockRejectedValue(error);

      await expect(circuitBreaker.execute('test')).rejects.toThrow('Request failed');
      
      expect(circuitBreaker.state).toBe(CIRCUIT_STATES.OPEN);
    });

    it('should limit concurrent calls in half-open state', async () => {
      mockRequestFunction.mockImplementation(() => new Promise(() => {})); // Never resolves

      // Start max calls
      const promises = [];
      for (let i = 0; i < circuitBreaker.halfOpenMaxCalls; i++) {
        promises.push(circuitBreaker.execute('test'));
      }

      // Next call should be rejected
      await expect(circuitBreaker.execute('test')).rejects.toThrow(CircuitBreakerError);
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running requests', async () => {
      mockRequestFunction.mockImplementation(() => new Promise(() => {})); // Never resolves

      const executePromise = circuitBreaker.execute('test');

      // Fast forward past timeout
      jest.advanceTimersByTime(5001);

      await expect(executePromise).rejects.toThrow('Request timeout');
      expect(circuitBreaker.metrics.timeouts).toBe(1);
    });

    it('should not timeout fast requests', async () => {
      mockRequestFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: 'success' }), 1000))
      );

      const executePromise = circuitBreaker.execute('test');

      // Advance time but not past timeout
      jest.advanceTimersByTime(1000);

      const result = await executePromise;
      expect(result.data).toBe('success');
      expect(circuitBreaker.metrics.timeouts).toBe(0);
    });
  });

  describe('error categorization', () => {
    it('should categorize network errors as transient', () => {
      const error = new Error('ECONNRESET');
      const category = circuitBreaker.categorizeError(error);
      expect(category).toBe(ERROR_CATEGORIES.TRANSIENT);
    });

    it('should categorize timeout errors as transient', () => {
      const error = new Error('Request timeout');
      const category = circuitBreaker.categorizeError(error);
      expect(category).toBe(ERROR_CATEGORIES.TRANSIENT);
    });

    it('should categorize 429 status as rate limit', () => {
      const error = new Error('Rate limited');
      error.response = { status: 429 };
      const category = circuitBreaker.categorizeError(error);
      expect(category).toBe(ERROR_CATEGORIES.RATE_LIMIT);
    });

    it('should categorize 401 status as auth error', () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      const category = circuitBreaker.categorizeError(error);
      expect(category).toBe(ERROR_CATEGORIES.AUTH_ERROR);
    });

    it('should categorize 500 status as service error', () => {
      const error = new Error('Internal server error');
      error.response = { status: 500 };
      const category = circuitBreaker.categorizeError(error);
      expect(category).toBe(ERROR_CATEGORIES.SERVICE_ERROR);
    });

    it('should categorize 400 status as validation error', () => {
      const error = new Error('Bad request');
      error.response = { status: 400 };
      const category = circuitBreaker.categorizeError(error);
      expect(category).toBe(ERROR_CATEGORIES.VALIDATION_ERROR);
    });

    it('should categorize unknown errors as unknown', () => {
      const error = new Error('Some other error');
      const category = circuitBreaker.categorizeError(error);
      expect(category).toBe(ERROR_CATEGORIES.UNKNOWN);
    });
  });

  describe('failure counting', () => {
    it('should count transient errors as failures', () => {
      const transientError = new Error('ECONNRESET');
      const shouldCount = circuitBreaker.shouldCountAsFailure(
        circuitBreaker.categorizeError(transientError)
      );
      expect(shouldCount).toBe(true);
    });

    it('should not count validation errors as failures', () => {
      const validationError = new Error('Bad request');
      validationError.response = { status: 400 };
      const shouldCount = circuitBreaker.shouldCountAsFailure(
        circuitBreaker.categorizeError(validationError)
      );
      expect(shouldCount).toBe(false);
    });

    it('should not count auth errors as failures', () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      const shouldCount = circuitBreaker.shouldCountAsFailure(
        circuitBreaker.categorizeError(authError)
      );
      expect(shouldCount).toBe(false);
    });
  });

  describe('metrics and monitoring', () => {
    it('should track request metrics', async () => {
      mockRequestFunction.mockResolvedValue({ data: 'success' });

      await circuitBreaker.execute('test');

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.metrics.totalRequests).toBe(1);
      expect(metrics.metrics.successfulRequests).toBe(1);
      expect(metrics.metrics.failedRequests).toBe(0);
    });

    it('should track failure metrics', async () => {
      const error = new Error('Request failed');
      mockRequestFunction.mockRejectedValue(error);

      try {
        await circuitBreaker.execute('test');
      } catch (e) {
        // Expected failure
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.metrics.totalRequests).toBe(1);
      expect(metrics.metrics.successfulRequests).toBe(0);
      expect(metrics.metrics.failedRequests).toBe(1);
    });

    it('should calculate failure rate', async () => {
      mockRequestFunction
        .mockResolvedValueOnce({ data: 'success' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ data: 'success' });

      // Execute requests
      await circuitBreaker.execute('test1');
      try {
        await circuitBreaker.execute('test2');
      } catch (e) { /* Expected */ }
      await circuitBreaker.execute('test3');

      const failureRate = circuitBreaker.getFailureRate();
      expect(failureRate).toBeCloseTo(1/3, 2); // 1 failure out of 3 requests
    });

    it('should track state changes', () => {
      const initialStateChanges = circuitBreaker.getMetrics().metrics.stateChanges.length;
      
      circuitBreaker.setState(CIRCUIT_STATES.OPEN);
      circuitBreaker.setState(CIRCUIT_STATES.HALF_OPEN);
      circuitBreaker.setState(CIRCUIT_STATES.CLOSED);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.metrics.stateChanges.length).toBe(initialStateChanges + 3);
    });
  });

  describe('health monitoring', () => {
    it('should report healthy when closed with low failure rate', async () => {
      mockRequestFunction.mockResolvedValue({ data: 'success' });
      
      await circuitBreaker.execute('test');
      
      expect(circuitBreaker.isHealthy()).toBe(true);
    });

    it('should report unhealthy when open', () => {
      circuitBreaker.setState(CIRCUIT_STATES.OPEN);
      
      expect(circuitBreaker.isHealthy()).toBe(false);
    });

    it('should generate health report', () => {
      const report = circuitBreaker.getHealthReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.state).toBe(CIRCUIT_STATES.CLOSED);
      expect(report.healthy).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should generate recommendations based on state', () => {
      circuitBreaker.setState(CIRCUIT_STATES.OPEN);
      
      const report = circuitBreaker.getHealthReport();
      
      expect(report.recommendations).toContain('Circuit is open - service may be unhealthy');
    });
  });

  describe('manual control', () => {
    it('should force open circuit', () => {
      circuitBreaker.forceOpen();
      
      expect(circuitBreaker.state).toBe(CIRCUIT_STATES.OPEN);
    });

    it('should force close circuit', () => {
      circuitBreaker.setState(CIRCUIT_STATES.OPEN);
      circuitBreaker.failureCount = 5;
      
      circuitBreaker.forceClose();
      
      expect(circuitBreaker.state).toBe(CIRCUIT_STATES.CLOSED);
      expect(circuitBreaker.failureCount).toBe(0);
    });
  });

  describe('event emission', () => {
    it('should emit success events', async () => {
      const successHandler = jest.fn();
      circuitBreaker.on('success', successHandler);
      
      mockRequestFunction.mockResolvedValue({ data: 'success' });
      
      await circuitBreaker.execute('test');
      
      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
          state: CIRCUIT_STATES.CLOSED
        })
      );
    });

    it('should emit failure events', async () => {
      const failureHandler = jest.fn();
      circuitBreaker.on('failure', failureHandler);
      
      const error = new Error('Request failed');
      mockRequestFunction.mockRejectedValue(error);
      
      try {
        await circuitBreaker.execute('test');
      } catch (e) {
        // Expected failure
      }
      
      expect(failureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error,
          category: ERROR_CATEGORIES.UNKNOWN,
          duration: expect.any(Number),
          state: CIRCUIT_STATES.CLOSED,
          failureCount: 1
        })
      );
    });

    it('should emit state change events', () => {
      const stateChangeHandler = jest.fn();
      circuitBreaker.on('stateChange', stateChangeHandler);
      
      circuitBreaker.setState(CIRCUIT_STATES.OPEN);
      
      expect(stateChangeHandler).toHaveBeenCalledWith({
        from: CIRCUIT_STATES.CLOSED,
        to: CIRCUIT_STATES.OPEN
      });
    });
  });
});
