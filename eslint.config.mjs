import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/**', 'dist/**', '.angular/**', 'playwright-report/**', 'test-results/**', '.yarn/**'] },
  ...tseslint.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly' } } },
];
