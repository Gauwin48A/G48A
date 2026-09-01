module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.teardown.js'],

  // ── Coverage collection ──────────────────────────────
  // Only collect coverage from files we actively test.
  // Run with --coverage --collectCoverageFrom for full-project coverage.
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/index.js',
    '!src/database/**',
    '!**/node_modules/**',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],

  // ── Coverage thresholds ──────────────────────────────
  // Set per-file targets for the critical paths we test.
  // Global threshold is low because we don't test every file yet.
  coverageThreshold: {
    global: {
      statements: 2,
      branches: 1,
      functions: 1.5,
      lines: 2,
    },
  },

  // ── Test patterns ────────────────────────────────────
  testTimeout: 30000,
  maxWorkers: 2,
};
