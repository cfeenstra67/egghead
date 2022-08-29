/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  globals: {
    LOG_LEVEL: 'info',
    DEV_MODE: false,
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'test',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
    '^.+\\.txt$': 'jest-text-transformer',
  }
};
