/**
 * jest.config.js
 * Minimal config — CommonJS, no transform needed (plain Node, no TS/JSX).
 * testEnvironment 'node' since this is a backend API, not a browser app.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  clearMocks: true,
  testTimeout: 10000,
  setupFiles: ['<rootDir>/tests/setup.js'],
  // Every test file mocks Mongoose models directly (see tests/README.md) —
  // no real MongoDB connection needed, deliberately, so this suite runs
  // anywhere (CI, local, no network) without provisioning a database.
};
