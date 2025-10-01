/**
 * ESLint Configuration - Task T002
 * Backend linting rules for TypeScript
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // Disable strict type checking for external libraries with incomplete types (Prisma, Dockerode)
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    // Allow async methods without await (some are for interface consistency)
    '@typescript-eslint/require-await': 'warn',
    // Allow Promise.reject() with non-Error values
    '@typescript-eslint/prefer-promise-reject-errors': 'warn',
    // Prisma intersection types can trigger this false positive
    '@typescript-eslint/no-redundant-type-constituents': 'warn',
    // Allow enum comparisons between our enums and Prisma string literals
    '@typescript-eslint/no-unsafe-enum-comparison': 'off',
  },
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'dist',
    'node_modules',
    'src/api/websocket/logStream.ts',
    'src/api/websocket/terminal.ts',
    'src/api/websocket/status.ts',
  ],
};
