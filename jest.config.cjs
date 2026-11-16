module.exports = {
  testEnvironment: 'jsdom',
  cacheDirectory: '<rootDir>/.jest-cache',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.js'],
  // The end-to-end test runs with Playwright (npm run e2e), not with Jest (#161).
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^\\./apiEnvironment\\.js$': '<rootDir>/src/tests/apiEnvironmentMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/src/tests/styleMock.js',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/src/tests/fileMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/services/api/apiEnvironment.js',
    '!src/tests/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
