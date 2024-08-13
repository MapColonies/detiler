const base = require('../../../../../jest.config.base');

module.exports = {
    ...base,
    rootDir: '../../../.',
    displayName: 'client',
    testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
    setupFiles: ['<rootDir>/tests/configurations/jest.setup.ts'],
    reporters: [
        'default',
        ['jest-html-reporters', { multipleReportsUnitePath: './reports', pageTitle: 'unit', publicPath: './reports', filename: 'unit.html' }],
    ],
};
