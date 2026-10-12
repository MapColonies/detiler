const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
    transform: {
        '^.+\\.ts$': ['@swc/jest'],
    },
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/../../' }),
    coverageReporters: ['text', 'html'],
    collectCoverage: true,
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts', '!*/node_modules/', '!/vendor/**', '!*/common/**', '!<rootDir>/src/*', '!**/DAL/**'
    ],
    moduleDirectories: ['node_modules', 'src'],
    testEnvironment: 'node',
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: -10,
        },
    },
};
