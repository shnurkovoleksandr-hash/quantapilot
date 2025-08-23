/**
 * Jest setup file for Cursor Integration Service tests
 * Fixes common test environment issues
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock fs module first
jest.mock('fs', () => {
  const mockFs = {
    promises: {
      mkdir: jest.fn().mockResolvedValue(),
      writeFile: jest.fn().mockResolvedValue(),
      readFile: jest.fn().mockResolvedValue(''),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => true }),
      readdir: jest.fn().mockResolvedValue([]),
      rm: jest.fn().mockResolvedValue(),
      access: jest.fn().mockResolvedValue(),
    },
  };

  return {
    ...jest.requireActual('fs'),
    promises: mockFs.promises,
  };
});

// Mock Redis globally
const mockRedis = {
  connect: jest.fn().mockResolvedValue(),
  disconnect: jest.fn().mockResolvedValue(),
  get: jest.fn().mockResolvedValue('0'),
  set: jest.fn().mockResolvedValue(),
  setEx: jest.fn().mockResolvedValue(),
  incr: jest.fn().mockResolvedValue(1),
  incrByFloat: jest.fn().mockResolvedValue(0.05),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(0),
  on: jest.fn(),
  expire: jest.fn().mockResolvedValue(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedis),
}));

// Mock winston to prevent file system operations
jest.mock('winston', () => {
  const originalWinston = jest.requireActual('winston');
  return {
    ...originalWinston,
    createLogger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    })),
    format: originalWinston.format,
    transports: {
      ...originalWinston.transports,
      Console: jest.fn().mockImplementation(() => ({
        log: jest.fn(),
      })),
      File: jest.fn().mockImplementation(() => ({
        log: jest.fn(),
      })),
    },
  };
});

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
}));

// Mock util.promisify
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn(fn => {
    if (fn.name === 'exec') {
      return jest
        .fn()
        .mockResolvedValue({ stdout: 'cursor v1.0.0', stderr: '' });
    }
    return jest.fn().mockResolvedValue();
  }),
}));

// Global test utilities
global.mockRedis = mockRedis;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Reset all mocks after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
