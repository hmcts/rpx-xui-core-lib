const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderFeatureReport(report) {
  const tests = Array.isArray(report?.tests) ? report.tests : [];
  const counts = { pass: 0, fail: 0, skip: 0, other: 0 };
  const features = new Map();
  for (const test of tests) {
    const status = test.status === 'pass' ? 'pass' : test.status === 'fail' ? 'fail' : test.status === 'skip' ? 'skip' : 'other';
    counts[status] += 1;
    const feature = String(test.fullName ?? '').split(' ')[0] || 'Unattributed';
    const items = features.get(feature) ?? [];
    items.push(test);
    features.set(feature, items);
  }
  const complete = report?.runner === 'vitest' && report.schemaVersion === 1 && report.complete === true &&
    Array.isArray(report.errors) && report.errors.length === 0 && tests.length > 0 && counts.pass === tests.length &&
    tests.every(test => typeof test.fullName === 'string' && test.fullName.trim()) &&
    new Set(tests.map(test => test.fullName)).size === tests.length;
  const rows = [...features.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([feature, items]) =>
    `<tr><th scope="row"><details><summary>${escape(feature)}</summary><ul>${items.map(item => `<li><strong>${escape(item.status)}</strong> ${escape(item.fullName)}</li>`).join('')}</ul></details></th><td>${items.length}</td><td>${items.filter(item => item.status === 'pass').length}</td><td>${items.filter(item => item.status === 'fail').length}</td><td>${items.filter(item => item.status === 'skip').length}</td><td>${items.filter(item => !['pass', 'fail', 'skip'].includes(item.status)).length}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Core editor test evidence</title><style>body{font:16px system-ui;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#1d263b;background:#f4f5fa}h1{color:#241c60}.cards{display:flex;gap:1rem;flex-wrap:wrap}.card{background:white;border:1px solid #dce1ee;border-radius:8px;padding:1rem;flex:1;min-width:10rem}table{width:100%;border-collapse:collapse;background:white;margin-top:1rem}th,td{padding:.7rem;border-bottom:1px solid #dce1ee;text-align:left}td{white-space:nowrap}summary{cursor:pointer}li{margin:.35rem 0}.warning{border-left:4px solid #a86600;padding:.8rem;background:#fff8df}</style></head><body><h1>Core editor test evidence</h1><p class="warning">${complete ? 'Completed Vitest browser contract run.' : 'Incomplete or failed run — results are partial.'} This shows executed tests, not code coverage or consumer acceptance. Separate Playwright driver results are in JUnit.</p><div class="cards"><div class="card"><strong>Tests</strong><h2>${tests.length}</h2></div><div class="card"><strong>Passed</strong><h2>${counts.pass}</h2></div><div class="card"><strong>Failed</strong><h2>${counts.fail}</h2></div><div class="card"><strong>Skipped</strong><h2>${counts.skip}</h2></div><div class="card"><strong>Other outcomes</strong><h2>${counts.other}</h2></div><div class="card"><strong>Global errors</strong><h2>${report?.errors?.length ?? 0}</h2></div><div class="card"><strong>Features</strong><h2>${features.size}</h2></div></div><table><thead><tr><th>Feature</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Other</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}
