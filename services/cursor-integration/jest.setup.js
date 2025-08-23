// Jest setup file for cursor integration tests

// Mock winston to prevent file system operations
jest.mock('winston', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      json: jest.fn(),
      simple: jest.fn()
    },
    transports: {
      File: jest.fn(),
      Console: jest.fn()
    }
  };
});

// Mock Redis globally
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(),
    setEx: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    incrByFloat: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn()
  }))
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.CURSOR_API_KEY = 'test-api-key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
