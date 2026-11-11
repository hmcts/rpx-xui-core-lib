/* global require, module */

const fs = require('fs');
const path = require('path');
const { createHash } = require('node:crypto');
const { parse } = require('node-html-parser');


function deriveFeatureName(filePath, titlePath = []) {
  const normalized = String(filePath ?? '')
    .replace(/\\/g, '/')
    .trim();

  const titles = Array.isArray(titlePath) ? titlePath.map(String) : [];
  const fileIndex = titles.findIndex((title) => {
    const normalizedTitle = title.replace(/\\/g, '/');
    return normalizedTitle === normalized || normalized.endsWith(`/${normalizedTitle}`);
  });
  const suiteTitles = fileIndex >= 0 ? titles.slice(fileIndex + 1, -1).filter(Boolean) : [];
  if (suiteTitles.length > 1) {
    return suiteTitles.at(-1);
  }

  if (!normalized) {
    return 'unknown';
  }

  const rootedPatterns = [
    /\/tests\/browser\/([^/]+)\//i,
    /\/playwright_tests_new\/integration\/test\/([^/]+)\//i,
    /\/playwright_tests_new\/E2E\/tests?\/([^/]+)\//i,
    /\/playwright_tests_new\/e2e\/tests?\/([^/]+)\//i,
    /\/playwright_tests_new\/api\/([^/]+)\//i,
    /\/tests?\/([^/]+)\//i,
  ];

  for (const pattern of rootedPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  const baseName = normalized.split('/').pop() ?? normalized;
  return baseName.replace(/\.[^.]+$/, '');
}

function createEmptyFeatureStat(name) {
  return {
    name,
    totalTests: 0,
    durationMs: 0,
    passed: 0,
    failed: 0,
    timedOut: 0,
    skipped: 0,
    interrupted: 0,
    flaky: 0,
  };
}

function normalizeFeatureStats(featureStats) {
  const source =
    featureStats instanceof Map
      ? Array.from(featureStats.values())
      : Array.isArray(featureStats)
        ? featureStats
        : Object.values(featureStats ?? {});

  return source
    .map((entry) => ({
      ...createEmptyFeatureStat(String(entry?.name ?? 'unknown')),
      ...entry,
      totalTests: Number(entry?.totalTests ?? 0),
      durationMs: Number(entry?.durationMs ?? 0),
      passed: Number(entry?.passed ?? 0),
      failed: Number(entry?.failed ?? 0),
      timedOut: Number(entry?.timedOut ?? 0),
      skipped: Number(entry?.skipped ?? 0),
      interrupted: Number(entry?.interrupted ?? 0),
      flaky: Number(entry?.flaky ?? 0),
    }))
    .sort((left, right) => {
      if (right.totalTests !== left.totalTests) {
        return right.totalTests - left.totalTests;
      }
      return left.name.localeCompare(right.name);
    });
}

function colorForFeature(name) {
  let hash = 0;
  for (const char of String(name)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 68% 52%)`;
}

function percentOf(total, value) {
  if (!total) {
    return '0.00';
  }
  return ((value / total) * 100).toFixed(2);
}

function formatDuration(durationMs) {
  const safeDuration = Math.max(0, Math.round(Number(durationMs) || 0));
  const hours = Math.floor(safeDuration / 3600000);
  const minutes = Math.floor((safeDuration % 3600000) / 60000);
  const seconds = Math.floor((safeDuration % 60000) / 1000);
  const milliseconds = safeDuration % 1000;
  return `${hours}h ${minutes}m ${seconds}s ${milliseconds}ms`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function injectEnhancerStyles(root) {
  const head = root.querySelector('head');
  if (!head) {
    return;
  }

  root.querySelectorAll('#odhin-enhancer-styles').forEach((node) => node.remove());
  head.appendChild(
    parse(`
<style id="odhin-enhancer-styles">
  .odhin-dashboard-stack {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0;
    align-self: stretch;
    height: 100%;
  }

  .odhin-dashboard-stack > .dashboard-block {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .odhin-dashboard-stack > .dashboard-block .odhin-table {
    flex: 1 1 auto;
  }

  #odhin-feature-summary .odhin-feature-overview-layout {
    display: grid;
    grid-template-columns: clamp(220px, 26%, 340px) minmax(0, 1fr);
    gap: clamp(12px, 1.6vw, 20px);
    align-items: stretch;
    padding: clamp(12px, 1.2vw, 18px);
    min-height: 100%;
  }

  #odhin-feature-summary .odhin-feature-overview-layout.odhin-feature-overview-layout-compact {
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  }

  #odhin-feature-summary .odhin-feature-overview-layout.odhin-feature-overview-layout-balanced {
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  }

  #odhin-feature-summary .odhin-feature-overview-sidebar {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }

  #odhin-feature-summary .odhin-feature-overview-title {
    text-align: center;
    margin-bottom: 4px;
  }

  #odhin-feature-summary .odhin-feature-overview-cards {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: clamp(10px, 1vw, 14px);
  }

  #odhin-feature-summary .odhin-feature-overview-layout.odhin-feature-overview-layout-compact .odhin-feature-overview-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  #odhin-feature-summary .odhin-feature-overview-card {
    border: 1px solid #d8e3ef;
    border-radius: 12px;
    background: #f8fbfe;
    color: #16324f;
    padding: 14px 10px;
    text-align: center;
  }

  #odhin-feature-summary .odhin-feature-overview-card-value {
    font-size: 34px;
    line-height: 1;
    font-weight: 700;
  }

  #odhin-feature-summary .odhin-feature-overview-card-label {
    margin-top: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  .odhin-a11y-test-evidence {
    background: #fff4f4;
    border-left: 10px solid #d4351c;
    border-top: 4px solid #ffdd00;
    color: #0b0c0c;
    font-family: Arial, sans-serif;
    margin: 0 0 16px;
    padding: 14px;
  }

  .odhin-a11y-test-evidence h2 {
    color: #0b0c0c;
    font-size: 22px;
    margin: 0 0 8px;
  }

  .odhin-a11y-test-evidence h3 {
    color: #0b0c0c;
    font-size: 18px;
    margin: 12px 0 6px;
  }

  .odhin-a11y-test-evidence p {
    margin: 0 0 8px;
  }

  .odhin-a11y-test-evidence ul {
    margin: 0 0 10px 20px;
    padding: 0;
  }

  .odhin-a11y-test-evidence code {
    background: #f3f2f1;
    color: #0b0c0c;
    padding: 2px 4px;
  }

  .odhin-a11y-test-nav {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0 0 12px;
  }

  .odhin-a11y-test-nav button {
    background: #f3f2f1;
    border: 1px solid #505a5f;
    color: #0b0c0c;
    cursor: pointer;
    font-weight: 700;
    padding: 6px 10px;
  }

  .odhin-a11y-test-nav button:first-child {
    background: #1d70b8;
    border-color: #1d70b8;
    color: #fff;
  }

  .odhin-a11y-test-nav button:hover:not(:disabled) {
    background: #ffdd00;
    border-color: #0b0c0c;
    color: #0b0c0c;
  }

  .odhin-a11y-test-nav button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .odhin-a11y-test-nav span {
    font-weight: 700;
  }

  .odhin-a11y-test-evidence a {
    color: #0b0c0c;
    display: inline-block;
    font-weight: bold;
    margin: 4px 8px 0 0;
    padding: 8px 12px;
  }

  .odhin-a11y-test-evidence a:first-of-type {
    background: #d4351c;
    color: #ffffff;
  }

  .odhin-a11y-test-evidence a:nth-of-type(2) {
    background: #ffdd00;
  }

  .odhin-a11y-test-evidence a:nth-of-type(3) {
    background: #f3f2f1;
  }

  .odhin-a11y-table-issues {
    max-width: 520px;
    white-space: normal;
  }

  .odhin-a11y-table-issues div,
  .odhin-a11y-table-hint {
    line-height: 1.35;
  }

  .odhin-a11y-table-hint {
    max-width: 420px;
    white-space: normal;
  }

  #test-list-table tbody tr.odhin-a11y-row-focus td {
    box-shadow: inset 0 0 0 3px #ffdd00;
  }

  .odhin-a11y-issue-summary {
    border: 1px solid #b1b4b6;
    margin: 0 0 16px;
  }

  .odhin-a11y-issue-summary h2 {
    background: #f3f2f1;
    border-bottom: 1px solid #b1b4b6;
    font-size: 18px;
    margin: 0;
    padding: 10px 12px;
  }

  .odhin-a11y-issue-summary table {
    margin: 0;
  }

  .odhin-a11y-issue-summary td,
  .odhin-a11y-issue-summary th {
    vertical-align: top;
  }

  .odhin-a11y-filter-bar {
    margin: 0 0 16px;
  }

  .odhin-a11y-filter-bar button {
    background: #f3f2f1;
    border: 1px solid #505a5f;
    color: #0b0c0c;
    cursor: pointer;
    font-weight: 700;
    margin: 0 6px 6px 0;
    padding: 5px 8px;
  }

  .odhin-a11y-filter-bar button:hover {
    background: #ffdd00;
  }

  #odhin-feature-summary .odhin-feature-overview-largest {
    width: 100%;
    border: 1px solid #d8e3ef;
    border-radius: 12px;
    background: #ffffff;
    padding: 12px 14px;
    color: #16324f;
  }

  #odhin-feature-summary .odhin-feature-overview-largest-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #53657d;
  }

  #odhin-feature-summary .odhin-feature-overview-largest-feature {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  #odhin-feature-summary .odhin-feature-overview-largest-note {
    margin-top: 8px;
    font-size: 13px;
    color: #53657d;
  }

  #odhin-feature-summary .odhin-feature-overview-table {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  #odhin-feature-summary .odhin-feature-overview-table .tableFixHead {
    margin-left: 0 !important;
    height: auto;
    flex: 1 1 auto;
  }

  #odhin-feature-summary .odhin-feature-overview-table table {
    width: 100%;
  }

  #odhin-feature-summary .odhin-feature-overview-table th,
  #odhin-feature-summary .odhin-feature-overview-table td {
    vertical-align: middle;
    white-space: nowrap;
  }

  #odhin-feature-summary .odhin-feature-overview-table td:first-child,
  #odhin-feature-summary .odhin-feature-overview-table th:first-child {
    white-space: normal;
  }

  @media (max-width: 1399px) {
    #odhin-feature-summary .odhin-feature-overview-layout {
      grid-template-columns: 1fr;
    }

    #odhin-feature-summary .odhin-feature-overview-sidebar {
      justify-content: flex-start;
    }
  }
</style>`)
  );
}

function buildFeatureOverviewBlock(featureStats) {
  const totalTests = featureStats.reduce((sum, feature) => sum + feature.totalTests, 0);
  const topFeature = featureStats[0];
  const summaryLabel = featureStats.length > 1 ? 'Distribution' : 'Summary';
  const layoutDensityClass =
    featureStats.length <= 3
      ? 'odhin-feature-overview-layout-compact'
      : featureStats.length <= 6
        ? 'odhin-feature-overview-layout-balanced'
        : 'odhin-feature-overview-layout-dense';
  const tableViewportPx = Math.min(520, Math.max(156, 72 + featureStats.length * 40));
  const rows = featureStats
    .map((feature) => {
      const color = colorForFeature(feature.name);
      return `
                <tr>
                  <td class="text-start fs-6 text-secondary-emphasis summary-row-left-column" style="border-left: 8px solid ${color};">
                    ${escapeHtml(feature.name)}
                  </td>
                  <td class="text-secondary-emphasis">${feature.totalTests}</td>
                  <td class="text-secondary-emphasis">${formatDuration(feature.durationMs)}</td>
                  <td class="result-status-passed">${feature.passed} (<label class="fst-italic">${percentOf(feature.totalTests, feature.passed)}%</label>)</td>
                  <td class="result-status-failed">${feature.failed} (<label class="fst-italic">${percentOf(feature.totalTests, feature.failed)}%</label>)</td>
                  <td class="result-status-timedOut">${feature.timedOut} (<label class="fst-italic">${percentOf(feature.totalTests, feature.timedOut)}%</label>)</td>
                  <td class="result-status-skipped">${feature.skipped} (<label class="fst-italic">${percentOf(feature.totalTests, feature.skipped)}%</label>)</td>
                  <td class="result-status-interrupted">${feature.interrupted} (<label class="fst-italic">${percentOf(feature.totalTests, feature.interrupted)}%</label>)</td>
                  <td class="result-status-flaky">${feature.flaky} (<label class="fst-italic">${percentOf(feature.totalTests, feature.flaky)}%</label>)</td>
                  <td class="text-secondary-emphasis">${percentOf(totalTests, feature.totalTests)}%</td>
                </tr>`;
    })
    .join('\n');

  return `
<div class="mt-3 mb-3 odhin-thin-border dashboard-block" id="odhin-feature-summary">
  <div class="info-box-header">
    Feature Overview
  </div>
  <div class="odhin-table">
    <div class="odhin-feature-overview-layout ${layoutDensityClass}">
      <div class="odhin-feature-overview-sidebar">
        <div class="odhin-text-2 odhin-feature-overview-title">${summaryLabel}</div>
        <div class="odhin-feature-overview-cards">
          <div class="odhin-feature-overview-card">
            <div class="odhin-feature-overview-card-value">${totalTests}</div>
            <div class="odhin-feature-overview-card-label">Tests</div>
          </div>
          <div class="odhin-feature-overview-card">
            <div class="odhin-feature-overview-card-value">${featureStats.length}</div>
            <div class="odhin-feature-overview-card-label">Features</div>
          </div>
        </div>
        <div class="odhin-feature-overview-largest">
          <div class="odhin-feature-overview-largest-title">Largest feature</div>
          <div class="odhin-feature-overview-largest-feature">
            <span style="display:inline-block;width:12px;height:12px;border-radius:999px;background:${colorForFeature(topFeature.name)};"></span>
            <span style="font-size:16px;font-weight:700;">${escapeHtml(topFeature.name)}</span>
          </div>
          <div class="odhin-feature-overview-largest-note">
            ${topFeature.totalTests} tests (${percentOf(totalTests, topFeature.totalTests)}% of this run)
          </div>
        </div>
      </div>
      <div class="odhin-feature-overview-table">
          <div class="table-responsive tableFixHead" style="max-height:${tableViewportPx}px;">
            <table class="table table-sm mb-0">
              <thead>
                <tr>
                  <th class="odhin-text-2 px-2">Feature</th>
                  <th class="odhin-text-2 px-2">Tests</th>
                  <th class="odhin-text-2 px-2">Execution Time</th>
                  <th class="odhin-text-2 px-2">Passed</th>
                  <th class="odhin-text-2 px-2">Failed</th>
                  <th class="odhin-text-2 px-2">Timed Out</th>
                  <th class="odhin-text-2 px-2">Skipped</th>
                  <th class="odhin-text-2 px-2">Interrupted</th>
                  <th class="odhin-text-2 px-2">Flaky</th>
                  <th class="odhin-text-2 px-2">Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="10" class="text-secondary-emphasis text-start">No grouped features found</td></tr>'}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  </div>
</div>`;
}

function replaceDashboardBlock(root, title, replacementHtml) {
  const block = root
    .querySelectorAll('.dashboard-block')
    .find((candidate) => candidate.querySelector('.info-box-header')?.text.trim() === title);

  if (!block) {
    return false;
  }

  block.replaceWith(parse(replacementHtml));
  return true;
}

function removeDuplicateFeatureStatusBlock(root) {
  const featureStatusBlocks = root
    .querySelectorAll('.dashboard-block')
    .filter((candidate) => candidate.querySelector('.info-box-header')?.text.trim() === 'Status by feature');

  featureStatusBlocks.forEach((candidate) => candidate.remove());
}

function removeLegacyFileChartInitializer(scriptContent) {
  return String(scriptContent)
    .replace(
      /\s*(?:let|const|var)\s+ctxFile\s*=\s*document\.getElementById\('chart-file'\)\.getContext\('2d'\);\s*(?:let|const|var)\s+chartFile\s*=\s*new\s+Chart\(ctxFile,\s*\{[\s\S]*?\}\s*\);\s*/g,
      '\n'
    )
    .replace(/\n{3,}/g, '\n\n');
}

function stripLegacyFileChartArtifacts(root) {
  root.querySelectorAll('#chart-file').forEach((node) => node.remove());
  root.querySelectorAll('script').forEach((scriptNode) => {
    const currentContent = scriptNode.innerHTML;
    const nextContent = removeLegacyFileChartInitializer(currentContent);
    if (nextContent !== currentContent) {
      scriptNode.set_content(nextContent);
    }
  });
}

function defaultTestListRowsPerPage(html) {
  return String(html)
    .replace(
      /\$\("#test-list-table"\)\.DataTable\(\{pageLength:100,lengthMenu:\[10,25,50,100\]\}\)/g,
      '$("#test-list-table").DataTable({pageLength:100,lengthMenu:[10,25,50,100],stateSave:true,stateDuration:-1})'
    )
    .replace(
      /\$\('#test-list-table'\)\.DataTable\(\{pageLength:100,lengthMenu:\[10,25,50,100\]\}\)/g,
      "$('#test-list-table').DataTable({pageLength:100,lengthMenu:[10,25,50,100],stateSave:true,stateDuration:-1})"
    )
    .replace(
      /\$\("#test-list-table"\)\.DataTable\(\{\}\)/g,
      '$("#test-list-table").DataTable({pageLength:100,lengthMenu:[10,25,50,100],stateSave:true,stateDuration:-1})'
    )
    .replace(
      /\$\('#test-list-table'\)\.DataTable\(\{\}\)/g,
      "$('#test-list-table').DataTable({pageLength:100,lengthMenu:[10,25,50,100],stateSave:true,stateDuration:-1})"
    );
}

function enhanceDashboardHtml(html, featureStats, testMetadata = []) {
  const htmlWithDefaultTestRows = defaultTestListRowsPerPage(html);
  const normalizedStats = normalizeFeatureStats(featureStats);
  if (!normalizedStats.length) return htmlWithDefaultTestRows;

  const root = parse(htmlWithDefaultTestRows);
  injectEnhancerStyles(root);

  if (normalizedStats.length) {
    replaceDashboardBlock(root, 'Files Summary', buildFeatureOverviewBlock(normalizedStats));
    removeDuplicateFeatureStatusBlock(root);
    stripLegacyFileChartArtifacts(root);
  }

  const testTable = root.querySelector('#test-list-table');
  if (testTable && testMetadata.length) {
    testTable.querySelectorAll('[data-report-metadata]').forEach((node) => node.remove());
    const byTarget = new Map(testMetadata.map((entry) => [entry.target, entry]));
    testTable.querySelectorAll('thead tr, tfoot tr').forEach((row) => {
      row.insertAdjacentHTML('beforeend', '<th data-report-metadata>Feature</th><th data-report-metadata>Tags</th><th data-report-metadata>Attempt</th>');
    });
    testTable.querySelectorAll('tbody tr').forEach((row) => {
      const entry = byTarget.get(row.getAttribute('data-bs-target'));
      row.setAttribute('data-duration-ms', String(entry?.durationMs ?? 0));
      row.insertAdjacentHTML('beforeend', `<td data-report-metadata>${escapeHtml(entry?.feature ?? 'Uncategorised')}</td><td data-report-metadata>${escapeHtml((entry?.tags ?? []).join(', '))}</td><td data-report-metadata>${escapeHtml((entry?.retry ?? 0) + 1)}</td>`);
    });
    testMetadata.filter((entry) => entry.logFileName).forEach((entry) => {
      const modal = root.querySelectorAll('[id]').find((node) => node.getAttribute('id') === entry.target.slice(1));
      modal?.querySelector('.modal-body')?.insertAdjacentHTML('beforeend', `<p><a href="./${escapeAttribute(entry.logFileName)}" download="test-output.log">Download test output</a></p>`);
    });
  }

  root.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1');
  root.querySelector('#core-lib-report-theme')?.remove();
  root.querySelector('#core-lib-report-ui')?.remove();
  root.querySelector('head')?.insertAdjacentHTML('beforeend', '<link id="core-lib-report-theme" rel="stylesheet" href="./presentation/report.css">');
  root.querySelector('body')?.insertAdjacentHTML('beforeend', '<script id="core-lib-report-ui" src="./presentation/report.js"></script>');

  return root.toString();
}

function enhanceGeneratedReport(outputFolder, featureStats, testMetadata = []) {
  if (!outputFolder || !fs.existsSync(outputFolder)) {
    return;
  }

  const normalizedStats = normalizeFeatureStats(featureStats);
  if (!normalizedStats.length) {
    return;
  }

  const reportFiles = fs.readdirSync(outputFolder).filter((fileName) => fileName.toLowerCase().endsWith('.html'));
  const presentationFolder = path.join(outputFolder, 'presentation');
  fs.mkdirSync(presentationFolder, { recursive: true });

  reportFiles.forEach((fileName) => {
    const filePath = path.join(outputFolder, fileName);
    const currentHtml = fs.readFileSync(filePath, 'utf8');
    let nextHtml = enhanceDashboardHtml(currentHtml, normalizedStats, testMetadata);
    const enhancerStyle = nextHtml.match(/<style id="odhin-enhancer-styles">([\s\S]*?)<\/style>/);
    if (enhancerStyle) {
      fs.writeFileSync(path.join(presentationFolder, 'feature.css'), enhancerStyle[1]);
      nextHtml = nextHtml.replace(enhancerStyle[0], '<link rel="stylesheet" href="./presentation/feature.css">');
    }
    nextHtml = nextHtml.replace(/data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)/g, (_source, type, encoded) => {
      const image = Buffer.from(encoded, 'base64');
      const name = `${createHash('sha256').update(image).digest('hex')}.${type === 'jpeg' ? 'jpg' : type}`;
      fs.mkdirSync(path.join(outputFolder, 'images'), { recursive: true });
      fs.writeFileSync(path.join(outputFolder, 'images', name), image);
      return `./images/${name}`;
    });
    fs.writeFileSync(filePath, nextHtml, 'utf8');
  });

  for (const name of ['report.css', 'report.js']) {
    fs.copyFileSync(path.join(__dirname, 'presentation', name), path.join(presentationFolder, name));
  }

  if (normalizedStats.length) {
    const chartAssetPath = path.join(outputFolder, 'js', 'chartjs.js');
    if (fs.existsSync(chartAssetPath)) {
      const currentScript = fs.readFileSync(chartAssetPath, 'utf8');
      const nextScript = removeLegacyFileChartInitializer(currentScript);
      if (nextScript !== currentScript) {
        fs.writeFileSync(chartAssetPath, nextScript, 'utf8');
      }
    }
  }
}

module.exports = { createEmptyFeatureStat, deriveFeatureName, enhanceDashboardHtml, enhanceGeneratedReport, normalizeFeatureStats };
