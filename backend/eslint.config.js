/**
 * ESLint Configuration - ESLint 9 Flat Config Format
 * Backend linting rules for TypeScript
 */
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'src/types/**/*.d.ts',
      '.eslintrc.js',
      'eslint.config.js',
    ],
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
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
  },
];
