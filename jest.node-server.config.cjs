module.exports = {
  clearMocks: true,
  restoreMocks: true,
  setupFiles: ['<rootDir>/projects/core-lib/node/server/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'js'],
  roots: ['<rootDir>/projects/core-lib/node/server'],
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      '<rootDir>/projects/core-lib/node/node_modules/ts-jest',
      { tsconfig: `${__dirname}/projects/core-lib/node/tsconfig.json` },
    ],
  },
};
