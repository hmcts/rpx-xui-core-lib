const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { parse } = require('node-html-parser');
const OdhinReporter = require('odhin-reports-playwright').default;
const AdaptiveReporter = require('./odhin-adaptive.reporter.cjs');
const { deriveFeatureName } = require('./odhin-report-enhancer.cjs');
const { publishReport, slugifyBranch, validateSource } = require('./odhin-site-publisher.cjs');

const root = path.resolve(__dirname, '../..');
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'core-odhin-self-check-'));
const hostileText = '</body><script id="report-injected">globalThis.__reportInjected=true;fetch("https://report-injection.invalid/")</script><label>axe label</label><input> $& $` $\'';

test('core browser features use the feature directory while preserving other naming rules', () => {
  const posix = '/work/core/tests/browser/validation/accessibility.spec.mjs';
  const windows = 'C:\\work\\core\\tests\\browser\\i18n\\translation.spec.mjs';
  assert.equal(deriveFeatureName(posix), 'validation');
  assert.equal(deriveFeatureName(windows), 'i18n');
  assert.equal(deriveFeatureName(posix, ['chromium', posix, 'outer suite', 'nested suite', 'test']), 'nested suite');
  assert.equal(deriveFeatureName('/work/core/tests/cache-upgrade/cache.spec.mjs'), 'cache-upgrade');
  assert.equal(deriveFeatureName('/work/playwright_tests_new/integration/test/cases/flow.spec.ts'), 'cases');
});

for (const failing of [false, true]) {
  test(`real patched reporter renders ${failing ? 'failed' : 'passed'} test evidence`, { timeout: 60_000 }, async () => {
    const fixture = path.join(workspace, failing ? 'failed' : 'passed');
    fs.mkdirSync(fixture);
    const validationDir = path.join(fixture, 'tests/browser/validation');
    const i18nDir = path.join(fixture, 'tests/browser/i18n');
    fs.mkdirSync(validationDir, { recursive: true });
    fs.mkdirSync(i18nDir, { recursive: true });
    fs.writeFileSync(path.join(validationDir, 'report<metadata>.spec.cjs'), `const {test, expect} = require(${JSON.stringify(require.resolve('@playwright/test'))});
test(${JSON.stringify('representative report case ' + hostileText)}, async ({}, testInfo) => {
  testInfo.annotations.push({ type: ${JSON.stringify(hostileText)}, description: ${JSON.stringify(hostileText)} });
  await test.step(${JSON.stringify('check expected result ' + hostileText)}, async () => { console.log('self-check output'); expect(1, ${JSON.stringify(hostileText)}).toBe(${failing ? 2 : 1}); });
});\n`);
    if (!failing) fs.writeFileSync(path.join(i18nDir, 'translation.spec.cjs'), `const {test} = require(${JSON.stringify(require.resolve('@playwright/test'))}); test('translation case', async () => { await test.step(${JSON.stringify('check ' + hostileText)}, async () => {}); });\n`);
    const { reporters } = await import('./config.mjs');
    const projectName = 'Chromium "quoted" ' + hostileText;
    const requiredBrowserContracts = [
      { projectName, title: 'representative report case ' + hostileText, feature: 'validation' },
      { projectName, title: 'translation case', feature: 'i18n' },
      { projectName, title: 'not selected', feature: 'validation' },
    ];
    fs.mkdirSync(path.join(fixture, 'native'));
    fs.writeFileSync(path.join(fixture, 'native/browser.json'), '{"stale":true}');
    const productionReporters = reporters('browser').filter(([name]) => name !== 'json').map(([name, options]) => {
      if (!options) return [name];
      const odhin = name.endsWith('odhin-adaptive.reporter.cjs');
      return [name, { ...options,
        ...(odhin ? { title: 'RPX XUI Core ' + hostileText, project: 'Core ' + hostileText, release: hostileText, testEnvironment: hostileText, requiredBrowserContracts } : {}),
        ...(options.outputFolder ? { outputFolder: path.join(fixture, odhin ? 'report/browser' : `native/${name}`) } : {}),
        ...(options.outputFile ? { outputFile: path.join(fixture, 'native', path.basename(options.outputFile)) } : {}),
      }];
    });
    fs.writeFileSync(path.join(fixture, 'playwright.config.cjs'), `module.exports = {testDir: ${JSON.stringify(fixture)}, retries: 0, outputDir: ${JSON.stringify(path.join(fixture, 'artifacts'))}, projects: [{name: ${JSON.stringify('Chromium "quoted" ' + hostileText)}}], reporter: ${JSON.stringify(productionReporters)}};`);
    const run = spawnSync(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', '-c', path.join(fixture, 'playwright.config.cjs')], { cwd: root, encoding: 'utf8', timeout: 40_000, env: { ...process.env, CI: 'true', PW_ODHIN_LIGHTWEIGHT: 'false' } });
    assert.equal(run.status, failing ? 1 : 0, run.stdout + run.stderr);
    assert.deepEqual(validateSource(path.join(fixture, 'report')), ['browser']);
    const html = fs.readFileSync(path.join(fixture, 'report/browser/index.html'), 'utf8');
    assert.ok(html.includes('representative report case'));
    assert.ok(html.includes('./presentation/report.css'));
    assert.ok(html.includes('./presentation/report.js'));
    assert.ok(html.includes('&lt;script'));
    assert.ok(!html.includes('{{.TestCases}}'), 'replacement tokens in metadata remain literal');
    assert.ok(!html.includes('data:image/'));
    const evidence = parse(html).querySelector('#required-browser-evidence');
    assert.ok(evidence);
    const validation = evidence.querySelectorAll('tbody tr').find(row => row.querySelector('th')?.text.trim() === 'validation').querySelectorAll('td').map(cell => Number(cell.text));
    assert.deepEqual(validation, [failing ? 0 : 1, failing ? 1 : 0, 0, 1, 0]);
    assert.equal(fs.readFileSync(path.join(fixture, 'native/browser.json'), 'utf8'), '{"stale":true}');
    if (!failing) {
      const features = parse(html).querySelectorAll('#odhin-feature-summary tbody tr').map((row) => row.querySelector('td')?.text.trim());
      assert.deepEqual(features.sort(), ['i18n', 'validation']);
    }
    if (failing) {
      const logs = fs.readdirSync(path.join(fixture, 'report/browser/logs'));
      assert.equal(logs.length, 1);
      assert.match(fs.readFileSync(path.join(fixture, 'report/browser/logs', logs[0]), 'utf8'), /self-check output/);
    }
    const browser = spawnSync(process.execPath, [path.join(__dirname, 'browser-check.cjs'), path.join(fixture, 'report/browser/index.html')], { cwd: root, encoding: 'utf8', timeout: 20_000 });
    assert.equal(browser.status, 0, browser.stdout + browser.stderr);
    console.log(`Retained ${failing ? 'failed' : 'passed'} reporter self-check at ${fixture}`);
  });
}

test('publisher escapes branch metadata, preserves history, and rejects traversal and symlinks', () => {
  const sourceDir = path.join(workspace, 'publisher-source');
  const siteDir = path.join(workspace, 'publisher-site');
  for (const lane of ['browser', 'cache-upgrade']) {
    const directory = path.join(sourceDir, lane);
    fs.mkdirSync(path.join(directory, 'presentation'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'js'));
    fs.writeFileSync(path.join(directory, 'index.html'), '<html><head></head><body><div id="odhin-feature-summary">Tests</div><script id="core-lib-report-ui" src="./presentation/report.js"></script></body></html>');
    for (const asset of ['presentation/report.css', 'presentation/report.js', 'presentation/feature.css', 'js/chartjs.js']) fs.writeFileSync(path.join(directory, asset), 'asset');
  }
  const options = { sourceDir, siteDir, rawBranch: 'feature/<script>alert(1)</script>', runKey: '100-attempt-1', runId: '100', runAttempt: '1', sha: 'abc123', runUrl: 'https://github.com/hmcts/rpx-xui-core-lib/actions/runs/100' };
  const result = publishReport(options);
  const sourceIndex = path.join(sourceDir, 'browser/index.html');
  const completeHtml = fs.readFileSync(sourceIndex, 'utf8');
  fs.writeFileSync(sourceIndex, completeHtml.replace('<script id="core-lib-report-ui" src="./presentation/report.js"></script>', ''));
  assert.throws(() => validateSource(sourceDir), /Incomplete browser/);
  fs.writeFileSync(sourceIndex, completeHtml);
  const runDir = path.join(siteDir, result.runUrlPath);
  const runHtml = fs.readFileSync(path.join(runDir, 'index.html'), 'utf8');
  assert.ok(runHtml.includes('&lt;script&gt;'));
  assert.ok(!runHtml.includes('<script>'));
  assert.notEqual(slugifyBranch('feature/a'), slugifyBranch('feature-a'));
  assert.notEqual(slugifyBranch('feature/a'), slugifyBranch('feature/A'));
  for (const lane of ['browser', 'cache-upgrade']) {
    const file = path.join(runDir, lane, 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    for (const target of html.matchAll(/(?:href|src)="([^"#]+)"/g)) assert.ok(fs.existsSync(path.resolve(path.dirname(file), target[1])), target[1]);
  }
  assert.deepEqual(publishReport(options), result, 'identical replay can retry Pages deployment');
  fs.appendFileSync(path.join(sourceDir, 'browser/presentation/report.css'), 'changed');
  assert.throws(() => publishReport(options), /must not be overwritten/);
  publishReport({ ...options, runId: '101', runKey: '101-attempt-1' });
  const branchHtml = fs.readFileSync(path.join(siteDir, result.branchUrlPath, 'index.html'), 'utf8');
  assert.ok(branchHtml.indexOf('101-attempt-1') < branchHtml.indexOf('100-attempt-1'));
  assert.throws(() => publishReport({ ...options, runKey: '../escape' }), /Invalid run identifier/);
  assert.throws(() => publishReport({ ...options, runUrl: 'javascript:alert(1)' }), /HTTPS/);
  const cleanSourceDir = path.join(workspace, 'publisher-clean-source');
  fs.cpSync(sourceDir, cleanSourceDir, { recursive: true });
  fs.symlinkSync(siteDir, path.join(sourceDir, 'linked-site'));
  assert.throws(() => validateSource(sourceDir), /symbolic links/);
  assert.throws(() => publishReport({ ...options, sourceDir: cleanSourceDir, siteDir: sourceDir, runKey: '102-attempt-1', runId: '102' }), /symbolic links/);
});

test('publisher retries incomplete index creation after a run is archived', () => {
  const sourceDir = path.join(workspace, 'retry-source');
  const siteDir = path.join(workspace, 'retry-site');
  const browser = path.join(sourceDir, 'browser');
  fs.mkdirSync(path.join(browser, 'presentation'), { recursive: true });
  fs.mkdirSync(path.join(browser, 'js'));
  fs.writeFileSync(path.join(browser, 'index.html'), '<html><body><div id="odhin-feature-summary"></div><script id="core-lib-report-ui" src="./presentation/report.js"></script></body></html>');
  for (const asset of ['presentation/report.css', 'presentation/report.js', 'presentation/feature.css', 'js/chartjs.js']) fs.writeFileSync(path.join(browser, asset), 'asset');
  const options = { sourceDir, siteDir, rawBranch: 'master', runKey: '1-attempt-1', runId: '1', runAttempt: '1', sha: 'abc', runUrl: 'https://github.com/hmcts/rpx-xui-core-lib/actions/runs/1' };
  const invalidRun = path.join(siteDir, 'reports/master/runs/0-attempt-1');
  fs.mkdirSync(invalidRun, { recursive: true });
  fs.writeFileSync(path.join(invalidRun, 'odhin-run.json'), '{');
  assert.throws(() => publishReport(options), SyntaxError);
  assert.ok(fs.existsSync(path.join(siteDir, 'reports/master/runs/1-attempt-1/odhin-run.json')));
  fs.rmSync(invalidRun, { recursive: true });
  const result = publishReport(options);
  assert.match(fs.readFileSync(path.join(siteDir, result.branchUrlPath, 'index.html'), 'utf8'), /1-attempt-1/);
  assert.match(fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8'), /reports\/master/);
});

test('attachment names cannot escape the report directory', { timeout: 60_000 }, () => {
  const fixture = path.join(workspace, 'attachment-paths');
  const output = path.join(fixture, 'report');
  fs.mkdirSync(fixture);
  const image = path.join(fixture, 'source.png');
  const trace = path.join(fixture, 'source.zip');
  fs.writeFileSync(image, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9kAAAAASUVORK5CYII=', 'base64'));
  fs.writeFileSync(trace, 'controlled trace');
  fs.writeFileSync(path.join(fixture, 'attachment.spec.cjs'), `const {test} = require(${JSON.stringify(require.resolve('@playwright/test'))});
test('attachment path', async ({}, info) => {
  await info.attach('../../../escaped', {body: Buffer.from('controlled'), contentType: 'image/png'});
  await info.attach(${JSON.stringify('..\\..\\escaped-back')}, {body: Buffer.from('controlled-back'), contentType: 'image/png'});
  await info.attach('ordinary name', {body: Buffer.from('normal'), contentType: 'image/png'});
  await info.attach('screenshot', {path: ${JSON.stringify(image)}, contentType: 'image/png'});
  for (const kind of ['expected', 'actual', 'diff']) await info.attach('../../../comparison-' + kind + '.png', {path: ${JSON.stringify(image)}, contentType: 'image/png'});
  await info.attach('trace', {path: ${JSON.stringify(trace)}, contentType: 'application/zip'});
});`);
  fs.writeFileSync(path.join(fixture, 'playwright.config.cjs'), `module.exports = {testDir: ${JSON.stringify(fixture)}, outputDir: ${JSON.stringify(path.join(fixture, 'artifacts'))}, reporter: [[${JSON.stringify(path.join(__dirname, 'odhin-adaptive.reporter.cjs'))}, {outputFolder: ${JSON.stringify(output)}, indexFilename: 'index.html', lightweight: false, testOutput: false}]]};`);
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', '-c', path.join(fixture, 'playwright.config.cjs')], { cwd: root, encoding: 'utf8', timeout: 40_000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(fs.existsSync(path.join(fixture, 'escaped.png')), false);
  assert.equal(fs.existsSync(path.join(fixture, 'escaped-back.png')), false);
  const files = fs.readdirSync(path.join(output, 'screenshots'), { recursive: true }).map(String);
  assert.ok(files.some(file => file.endsWith('.._.._.._escaped.png')));
  assert.ok(files.some(file => file.endsWith('.._.._escaped-back.png')));
  assert.ok(files.some(file => file.endsWith('ordinary name.png')));
  for (const kind of ['expected', 'actual', 'diff']) assert.ok(files.some(file => file.endsWith('.._.._.._comparison-' + kind + '.png')));
  assert.ok(fs.readdirSync(path.join(output, 'traces'), { recursive: true }).map(String).some(file => file.endsWith('trace.zip')));
  const Help = require('odhin-reports-playwright/lib/help').default;
  const helper = Reflect.construct(Help, [{ embedAttachments: false, outputFolder: output }]);
  assert.throws(() => helper.base64ToFile(Buffer.from('controlled').toString('base64'), path.join(fixture, 'outside.png')), /escapes the report directory/);
  assert.equal(fs.existsSync(path.join(fixture, 'outside.png')), false);
  const outside = path.join(fixture, 'outside-directory');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(output, 'linked'));
  assert.throws(() => helper.base64ToFile(Buffer.from('controlled').toString('base64'), path.join(output, 'linked', 'escaped.png')), /symbolic link/);
  assert.equal(fs.existsSync(path.join(outside, 'escaped.png')), false);
  fs.unlinkSync(path.join(output, 'linked'));
  fs.symlinkSync(path.join(outside, 'escaped-file.png'), path.join(output, 'linked-file.png'));
  assert.throws(() => helper.base64ToFile(Buffer.from('controlled').toString('base64'), path.join(output, 'linked-file.png')), /symbolic link/);
  assert.equal(fs.existsSync(path.join(outside, 'escaped-file.png')), false);
  const payload = Buffer.from('first').toString('base64');
  assert.equal(helper.base64ToFile(payload, path.join(output, 'collisions', 'a.b.png')), 'a.b.png');
  assert.equal(helper.base64ToFile(Buffer.from('second').toString('base64'), path.join(output, 'collisions', 'a.b.png')), 'a.b_1.png');
  assert.equal(fs.readFileSync(path.join(output, 'collisions', 'a.b.png'), 'utf8'), 'first');
  assert.equal(fs.readFileSync(path.join(output, 'collisions', 'a.b_1.png'), 'utf8'), 'second');
});

test('steps without source locations escape metadata and preserve literal text', () => {
  const Help = require('odhin-reports-playwright/lib/help').default;
  const { parse } = require('node-html-parser');
  const helper = Reflect.construct(Help, [{}]);
  const html = helper.printStep('fixture', 0, { title: hostileText, duration: 0, steps: [] }, 10);
  const parsed = parse(html);
  assert.equal(parsed.querySelector('#report-injected'), null);
  assert.ok(parsed.textContent.includes(hostileText));
});

test('comparison attachment filenames remain text and cannot create event handlers', () => {
  const Help = require('odhin-reports-playwright/lib/help').default;
  const { parse } = require('node-html-parser');
  const image = path.join(workspace, 'comparison.png');
  fs.writeFileSync(image, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9kAAAAASUVORK5CYII=', 'base64'));
  const helper = Reflect.construct(Help, [{ embedAttachments: false, outputFolder: path.join(workspace, 'comparison-output') }]);
  const attachments = ['expected', 'actual', 'diff'].map(kind => ({ path: image, contentType: 'image/png', name: `image-${kind}." onerror="globalThis.__reportInjected=true` }));
  const html = helper.printScreenshotComparison('fixture', ...attachments);
  const parsed = parse(html);
  assert.equal(parsed.querySelectorAll('[onerror]').length, 0);
  assert.equal(parsed.querySelectorAll('a[download]').length, 3);
  assert.ok(parsed.textContent.includes('onerror="globalThis.__reportInjected=true'));
});

test('reporter configuration preserves native evidence and rejects unknown reporters', async () => {
  const { reporters } = await import('./config.mjs');
  const previous = process.env.PLAYWRIGHT_REPORTERS;
  try {
    delete process.env.PLAYWRIGHT_REPORTERS;
    const descriptions = reporters('browser');
    for (const name of ['html', 'junit', 'json']) assert.ok(descriptions.some(description => description[0] === name));
    assert.ok(descriptions.some(description => description[0].endsWith('odhin-adaptive.reporter.cjs')));
    process.env.PLAYWRIGHT_REPORTERS = 'not-a-reporter';
    assert.throws(() => reporters('browser'), /Unsupported Playwright reporter/);
  } finally {
    if (previous === undefined) delete process.env.PLAYWRIGHT_REPORTERS;
    else process.env.PLAYWRIGHT_REPORTERS = previous;
  }
});

test('vendored reporter is reproducible and unsupported modes cannot load removed tooling', () => {
  const archive = path.join(root, '.yarn/patches/odhin-reports-playwright-1.1.8-core.tgz');
  const tools = path.join(workspace, 'untrusted-tools');
  fs.mkdirSync(tools);
  fs.writeFileSync(path.join(tools, 'git'), '#!/bin/sh\nexit 73\n', { mode: 0o755 });
  const verified = spawnSync('python3', [path.join(__dirname, 'vendor-odhin.py'), '--verify', archive], {
    encoding: 'utf8', timeout: 10_000, env: { ...process.env, PATH: `${tools}${path.delimiter}${process.env.PATH}` },
  });
  assert.equal(verified.status, 0, verified.stdout + verified.stderr);
  const manifest = require('odhin-reports-playwright/package.json');
  assert.deepEqual(Object.keys(manifest.dependencies).sort(), ['ansi-to-html', 'fs-extra', 'lodash', 'picocolors']);
  for (const option of ['startServer', 'embedAssets', 'embedAttachments']) {
    assert.throws(() => Reflect.construct(OdhinReporter, [{ [option]: true }]), /Core Odhín does not support/);
    assert.throws(() => new AdaptiveReporter({ [option]: true }), /Core Odhín does not support/);
  }
  for (const removed of ['axios', 'html-minifier', 'static-server', 'node-html-to-image', 'puppeteer', 'portfinder']) {
    assert.throws(() => require.resolve(removed, { paths: [path.dirname(require.resolve('odhin-reports-playwright'))] }), { code: 'MODULE_NOT_FOUND' });
  }
});
