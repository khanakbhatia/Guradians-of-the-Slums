/**
 * tests/setup.js
 * Keeps Winston's console transport (real request/security logging —
 * genuinely useful when running the app, just noise in a test run) quiet
 * during the suite. The file-based logging this exercises is left
 * untouched — only the console output is suppressed.
 */
process.env.NODE_ENV = 'test';
