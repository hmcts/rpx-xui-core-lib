import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const javascript = ['eslint.config.mjs', ...['scripts', 'tests', 'apps/test-host'].flatMap((root) =>
  readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((file) => /\.(?:mjs|cjs)$/.test(file)).map((file) => `${root}/${file}`))];
const commands = [
  ['node_modules/eslint/bin/eslint.js', '.'],
  ['node_modules/typescript/bin/tsc', '-p', 'projects/core-lib/tsconfig.lib.json', '--noEmit'],
  ['node_modules/typescript/bin/tsc', '-p', 'projects/core-lib/forms/tsconfig.strict.json'],
  ['node_modules/typescript/bin/tsc', '-p', 'projects/core-lib/node/tsconfig.json', '--noEmit'],
  ['node_modules/typescript/bin/tsc', '-p', 'tests/node/tsconfig.json', '--noEmit'],
  ['node_modules/typescript/bin/tsc', '-p', 'tests/i18n/tsconfig.json', '--noEmit'],
  ['node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js', '-p', 'apps/test-host/tsconfig.app.json', '--noEmit'],
  ['node_modules/typescript/bin/tsc', '--allowJs', '--checkJs', '--noEmit', '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'bundler', '--types', 'node', 'tests/browser/window-probes.d.ts', ...javascript],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
