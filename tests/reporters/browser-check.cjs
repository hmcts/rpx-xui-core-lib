const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');
const featureMapping = require('../feature-evidence-map.json');

async function main() {
  const report = path.resolve(process.argv[2] ?? 'test-results/odhin/browser/index.html');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    const unsafeRequests = [];
    page.on('request', request => {
      if (request.url().includes('report-injection.invalid')) unsafeRequests.push(request.url());
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`console: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(report).href);
    const diagnosticMatrix = process.argv.includes('--diagnostic-matrix');
    if (process.argv.includes('--feature-matrix') || diagnosticMatrix) {
      const matrix = page.locator('#feature-evidence-matrix');
      assert.equal(await matrix.count(), 1, 'feature evidence matrix is rendered once');
      assert.equal(await matrix.isVisible(), true, 'feature evidence matrix is visible');
      const rows = matrix.locator('tbody tr');
      const expectedFeatures = [...featureMapping.features, ...featureMapping.suiteGroups, ...featureMapping.fallbacks].map(row => row.feature);
      assert.deepEqual(await rows.locator('th[scope="row"]').allTextContents(), expectedFeatures, 'mapped features are rendered in order');
      for (let index = 0; index < await rows.count(); index += 1) {
        assert.equal(await rows.nth(index).isVisible(), true, `mapped feature ${index + 1} is visible`);
      }
      assert.equal(await matrix.getByText('Not mapped', { exact: true }).first().isVisible(), true, 'unmapped layers are visible');
      assert.equal(await matrix.getByText('Required test outcomes only, not coverage or a complete feature inventory. Unclassified groups and unmapped layers make no feature claim. The aggregate contract gate and CI determine acceptance.', { exact: true }).isVisible(), true, 'coverage limitation is visible');
      if (diagnosticMatrix) {
        assert.equal(await matrix.getByText('Unavailable: run or gate incomplete', { exact: true }).first().isVisible(), true, 'diagnostic evidence is visibly unavailable');
        assert.equal(await matrix.getByText(/required cases passed/).count(), 0, 'diagnostic matrix cannot claim verified evidence');
      } else {
        assert.equal(await matrix.getByText(/required cases passed/).first().isVisible(), true, 'verified mapped evidence is visible');
        assert.equal(await matrix.getByText('Unavailable: run or gate incomplete', { exact: true }).count(), 0, 'successful report has no unavailable mapped evidence');
      }
      await page.setViewportSize({ width: 390, height: 844 });
      const scroll = matrix.getByRole('region', { name: 'Feature evidence table' });
      await scroll.focus();
      assert.equal(await scroll.evaluate(element => document.activeElement === element), true, 'table region is keyboard focusable');
      const before = await scroll.evaluate(element => ({ left: element.scrollLeft, width: element.clientWidth, content: element.scrollWidth }));
      assert.ok(before.content > before.width, 'mobile matrix needs horizontal scrolling');
      for (let attempt = 0; attempt < 60; attempt += 1) await page.keyboard.press('ArrowRight', { delay: 20 });
      await page.waitForFunction(element => element.scrollLeft + element.clientWidth >= element.scrollWidth - 2, await scroll.elementHandle(), { timeout: 3000 });
      const after = await scroll.evaluate(element => ({ left: element.scrollLeft, width: element.clientWidth, content: element.scrollWidth }));
      assert.ok(after.left > before.left, 'keyboard scroll moves the table');
      assert.ok(after.left + after.width >= after.content - 2, 'last column is reachable with keyboard');
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    assert.equal(await page.locator('#report-injected').count(), 0, 'metadata cannot inject HTML elements');
    assert.equal(await page.evaluate(() => Boolean(globalThis['__reportInjected'])), false, 'metadata cannot execute scripts');
    await page.locator('.report-metric').first().waitFor();
    assert.equal(await page.locator('.report-metric').count(), 4, 'four dashboard metrics render');
    assert.deepEqual(await page.locator('.report-grid .report-panel .info-box-header').allTextContents().then((titles) => titles.map((title) => title.replace(/[⠿↗]/g, '').trim())),
      ['Feature Overview', 'Run info', 'Global Summary', 'Projects Summary', 'Status by project'], 'responsive dashboard panels render in order');
    assert.equal(await page.locator('.report-grid .report-panel').first().evaluate((element) => getComputedStyle(element).gridColumn), '1 / -1', 'feature overview spans the dashboard');
    assert.equal(await page.locator('.report-panel > .odhin-thin-border').first().evaluate((element) => getComputedStyle(element).borderRadius), '16px', 'external presentation CSS loads');
    const total = Number((await page.locator('.report-metric strong').first().textContent()).trim());
    assert.ok(total > 0, 'run metric contains test results');
    const visibleRows = await page.locator('#test-list-table tbody tr').count();
    const tableInfo = await page.locator('#test-list-table_info').textContent();
    const tableInfoMatch = tableInfo?.match(/of\s+(\d+)\s+entries/);
    assert.ok(tableInfoMatch, 'test table pagination reports the final-result total');
    const reportedRows = Number(tableInfoMatch[1]);
    assert.ok(
      Math.max(visibleRows, reportedRows) >= total,
      'test rows cover final results and possible retries'
    );
    const featureRows = page.locator('#odhin-feature-summary tbody > tr').filter({ has: page.locator('.feature-toggle') });
    assert.ok(await featureRows.count() > 0, 'report contains a feature group');
    let groupedTests = 0;
    for (let index = 0; index < await featureRows.count(); index += 1) {
      await featureRows.nth(index).locator('.feature-toggle').click();
      const details = page.locator(`#feature-tests-${index}`);
      const tests = await details.locator('li').count();
      assert.ok(tests > 0, `feature ${index + 1} drill-down exposes tests`);
      assert.equal(await details.locator('.feature-test-steps').count(), tests, `feature ${index + 1} exposes step links`);
      groupedTests += tests;
    }
    assert.equal(groupedTests, reportedRows, 'feature groups account for every rendered report result row');
    await page.locator('#feature-tests-0 .feature-test-steps').first().click();
    const modal = page.locator('.modal.show').last();
    await modal.waitFor();
    assert.equal(await modal.locator('.result-tab-header button.active').textContent().then((text) => text.trim()), 'Steps', 'View steps opens the native test steps tab');
    assert.ok(await modal.locator('.result-tabcontent[style*="display: block"] .stepLine').count(), 'native test steps render');
    if ((await page.locator('#test-list-table').textContent()).includes('axe label')) {
      assert.ok((await modal.locator('.stepLine').allTextContents()).some(text => text.includes('</body>') && text.includes('<script')), 'hostile step metadata remains literal text');
    }
    await modal.locator('[data-bs-dismiss="modal"]').first().click();
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `report fits the ${width}px viewport`);
    }
    assert.deepEqual(errors, [], 'report JavaScript has no console or page errors');
    assert.deepEqual(unsafeRequests, [], 'metadata cannot initiate network requests');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
