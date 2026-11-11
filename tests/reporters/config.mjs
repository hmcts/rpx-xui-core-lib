import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;

/** @param {'browser' | 'cache-upgrade'} lane @returns {import('@playwright/test').ReporterDescription[]} */
export function reporters(lane) {
  const defaults = `${process.env.PLAYWRIGHT_DEFAULT_REPORTER ?? (process.env.CI ? 'dot' : 'list')},html,junit,json,odhin`;
  const names = (process.env.PLAYWRIGHT_REPORTERS ?? defaults).split(',').map(name => name.trim()).filter(Boolean);
  return names.map(name => {
    if (name === 'list' || name === 'dot') return [name];
    if (name === 'html') return ['html', { open: 'never', outputFolder: resolve(root, lane === 'browser' ? 'playwright-report' : 'test-results/cache-upgrade-html') }];
    if (name === 'junit') return ['junit', { outputFile: resolve(root, `test-results/${lane === 'browser' ? 'browser' : 'cache-upgrade'}-junit.xml`) }];
    if (name === 'json') return ['json', { outputFile: resolve(root, lane === 'browser' ? 'test-results/browser.json' : 'test-results/cache-upgrade-report.json') }];
    if (name === 'odhin') return [resolve(root, 'tests/reporters/odhin-adaptive.reporter.cjs'), {
      outputFolder: resolve(root, process.env.PW_ODHIN_OUTPUT ?? 'test-results/odhin', lane),
      indexFilename: 'index.html',
      title: `RPX XUI Core · ${lane}`,
      testEnvironment: process.env.CI ? 'CI' : 'local',
      project: 'RPX XUI Core',
      release: process.env.PW_ODHIN_RELEASE ?? version,
      embedAssets: false,
      embedAttachments: false,
      startServer: false,
      testOutput: 'only-on-failure',
    }];
    throw new Error(`Unsupported Playwright reporter: ${name}`);
  });
}
