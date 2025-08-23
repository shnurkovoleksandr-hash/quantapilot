export default {
  // Test environment
  testEnvironment: 'node',

  // File extensions to test (integration tests)
  testMatch: ['**/__tests__/**/*.integration.(js|ts)', '**/*.integration.(test|spec).(js|ts)'],

  // File extensions to process
  moduleFileExtensions: ['js', 'ts', 'json'],

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  // Coverage configuration
  collectCoverage: false, // Disable for integration tests

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test timeout (longer for integration tests)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/services/$1',
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/coverage/'],

  // Watch plugins (disabled for CI compatibility)
  // watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
