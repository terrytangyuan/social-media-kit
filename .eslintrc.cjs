module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'vite.config.ts',
    'postcss.config.js',
    'tailwind.config.js',
    'jest.config.js',
    'babel.config.js',
    'node_modules',
    'build',
    'coverage',
    '*.test.*',
    '__tests__',
    'tests',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  globals: {
    // Browser APIs
    'NotificationOptions': 'readonly',
    'Notification': 'readonly',
  },
  rules: {
    // General rules - keep minimal for now
    'no-console': 'off', // Allow console for debugging
    'no-debugger': 'warn',
    'prefer-const': 'warn',
    'no-var': 'error',
    'no-unused-vars': 'off', // Turn off for now since TS files need different handling
    'no-undef': 'error', // Check for undefined variables
  },
  overrides: [
    {
      // TypeScript files
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser APIs for TypeScript files
        'NotificationOptions': 'readonly',
        'Notification': 'readonly',
      },
      rules: {
        // Same basic rules for TS files
        'no-console': 'off',
        'no-debugger': 'warn', 
        'prefer-const': 'warn',
        'no-var': 'error',
        'no-unused-vars': 'off', // Let TypeScript handle this
        'no-undef': 'off', // TypeScript handles this better
      },
    },
  ],
}; 