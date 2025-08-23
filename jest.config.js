export default {
  // Test environment
  testEnvironment: 'node',

  // File extensions to test
  testMatch: ['**/__tests__/**/*.(js|ts)', '**/*.(test|spec).(js|ts)'],

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
  collectCoverage: false, // Disabled for CI
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'services/**/*.{js,ts}',
    '!services/**/node_modules/**',
    '!services/**/coverage/**',
    '!services/**/dist/**',
    '!services/**/*.test.{js,ts}',
    '!services/**/*.spec.{js,ts}',
    '!services/**/__tests__/**',
    '!services/dashboard/**', // Exclude React dashboard files
  ],

  // Coverage thresholds (reduced for initial setup)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test timeout
  testTimeout: 10000,

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
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname',
  // ],
};
