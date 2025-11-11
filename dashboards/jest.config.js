module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config-loader.js',
    '!src/convert.js',
    '!src/dashboard-builder.js',
    '!src/grouped-dashboard.js',
    '!src/watch-dashboards.js',
    '!src/dashboard-query-reference.js',
    '!src/dashboard-query-lookup.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
