const base = require('../../../../../jest.config.base');

module.exports = {
  ...base,
  rootDir: '../../../.',
  displayName: 'backend',
  testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
  setupFiles: ['<rootDir>/tests/configurations/jest.setup.ts'],
  reporters: [
    'default',
    ['jest-html-reporters', { multipleReportsUnitePath: './reports', pageTitle: 'unit', publicPath: './reports', filename: 'unit.html' }],
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!*/node_modules/',
    '!/vendor/**',
    '!*/common/**',
    '!**/controllers/**',
    '!**/routes/**',
    '!**/redis/**',
    '!<rootDir>/src/*',
  ],
};
