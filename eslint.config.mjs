import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/**', 'dist/**', '.angular/**', 'playwright-report/**', 'test-results/**', '.yarn/**',
    // Peggy generates this file; verify it against the grammar instead of editing it.
    'projects/core-lib/case/notifier/lib/shared/directives/conditional-show/services/condition-parser.generated.ts'] },
  ...tseslint.configs.recommended,
  // Preserve the published service contracts, including their private-state probes.
  { files: ['tests/i18n/lib/rpx-translation.service.spec.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/ban-ts-comment': 'off' } },
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  { files: ['**/*.mjs', '**/*.cjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly' } } },
];
