/** @type {import('jest').Config} */
const config = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'html', 'js', 'mjs', 'json'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|marked/)'],
  moduleNameMapper: {
    '^@copilotkitnext/core$': '<rootDir>/../core/src/index.ts',
    '^@copilotkitnext/shared$': '<rootDir>/../shared/src/index.ts',
    '^marked$': '<rootDir>/test-mocks/marked.ts',
  },
};

export default config;
