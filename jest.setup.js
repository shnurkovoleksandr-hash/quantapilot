/**
 * Root Jest setup file for QuantaPilot™
 * Includes setup for all services
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Import cursor integration setup
require('./services/cursor-integration/jest.setup.js');

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
  createMockLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  }),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Reset all mocks after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
