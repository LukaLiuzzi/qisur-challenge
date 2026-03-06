import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  resetMocks: true,
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
};

export default config;
