// Plain Node Jest config for the sync e2e test: jest-expo's preset mocks global fetch,
// which would stop supabase-js from reaching the local PostgREST.
module.exports = {
  testEnvironment: 'node',
  globals: { __DEV__: false },
  testMatch: ['**/__tests__/e2e.test.ts'],
  transform: { '\\.[jt]sx?$': ['babel-jest', { presets: [require.resolve('babel-preset-expo', { paths: [require.resolve('expo')] })] }] },
  transformIgnorePatterns: ['/node_modules/(?!(zustand)/)'],
};
