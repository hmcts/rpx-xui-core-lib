const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderFeatureReport(report) {
  const suites = new Map(report.events.filter(event => event.type === 'suiteDone').map(event => [event.result.id, event.result.fullName]));
  const groups = new Map();
  for (const event of report.events.filter(event => event.type === 'specDone')) {
    const spec = event.result;
    const feature = suites.get(spec.parentSuiteId) ?? 'Unattributed';
    const list = groups.get(feature) ?? [];
    list.push(spec);
    groups.set(feature, list);
  }
  const specs = [...groups.values()].flat();
  const passed = specs.filter(spec => spec.status === 'passed').length;
  const failed = specs.filter(spec => spec.status === 'failed').length;
  const skipped = specs.filter(spec => ['pending', 'disabled', 'excluded'].includes(spec.status)).length;
  const other = specs.length - passed - failed - skipped;
  const suiteFailures = report.events.filter(event => event.type === 'suiteDone' && (event.result.status === 'failed' || event.result.failedExpectations?.length)).length;
  const browserErrors = report.browserErrors?.length ?? 0;
  const driverErrors = report.driverError ? 1 : 0;
  const started = report.events.filter(event => event.type === 'jasmineStarted');
  const finished = report.events.filter(event => event.type === 'jasmineDone');
  const ids = specs.map(spec => spec.id);
  const complete = report.complete === true && started.length === 1 && finished.length === 1 &&
    report.events[0] === started[0] && report.events.at(-1) === finished[0] &&
    Number.isSafeInteger(started[0]?.result?.totalSpecsDefined) && started[0].result.totalSpecsDefined === specs.length &&
    specs.length > 0 && ids.every(id => typeof id === 'string' && id.length > 0) && new Set(ids).size === ids.length &&
    finished[0]?.result?.overallStatus === 'passed' && !finished[0]?.result?.failedExpectations?.length &&
    passed === specs.length && suiteFailures === 0 && report.events.filter(event => event.type === 'suiteDone').every(event => event.result.status === 'passed') && suites.size > 0 && !groups.has('Unattributed') && browserErrors === 0 && driverErrors === 0;

  const rows = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, items]) => {
    const ok = items.filter(item => item.status === 'passed').length;
    const bad = items.filter(item => item.status === 'failed').length;
    const skippedItems = items.filter(item => ['pending', 'disabled', 'excluded'].includes(item.status)).length;
    const cases = items.map(item => `<li><strong>${escape(item.status)}</strong> ${escape(item.description)}</li>`).join('');
    return `<tr><th scope="row"><details><summary>${escape(name)}</summary><ul>${cases}</ul></details></th><td>${items.length}</td><td>${ok}</td><td>${bad}</td><td>${skippedItems}</td><td>${items.length - ok - bad - skippedItems}</td></tr>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Core editor test evidence</title><style>body{font:16px system-ui;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#1d263b;background:#f4f5fa}h1{color:#241c60}.cards{display:flex;gap:1rem;flex-wrap:wrap}.card{background:white;border:1px solid #dce1ee;border-radius:8px;padding:1rem;flex:1;min-width:10rem}table{width:100%;border-collapse:collapse;background:white;margin-top:1rem}th,td{padding:.7rem;border-bottom:1px solid #dce1ee;text-align:left}td{white-space:nowrap}summary{cursor:pointer}li{margin:.35rem 0}.warning{border-left:4px solid #a86600;padding:.8rem;background:#fff8df}</style></head><body><h1>Core editor test evidence</h1><p class="warning">${complete ? 'Completed Jasmine contract run.' : 'Incomplete or failed run — results are partial.'} This shows executed tests, not code coverage or consumer acceptance. Separate Playwright driver results are in JUnit.</p><div class="cards"><div class="card"><strong>Tests</strong><h2>${specs.length}</h2></div><div class="card"><strong>Passed</strong><h2>${passed}</h2></div><div class="card"><strong>Failed</strong><h2>${failed}</h2></div><div class="card"><strong>Skipped</strong><h2>${skipped}</h2></div><div class="card"><strong>Other outcomes</strong><h2>${other}</h2></div><div class="card"><strong>Suite errors</strong><h2>${suiteFailures}</h2></div><div class="card"><strong>Browser errors</strong><h2>${browserErrors}</h2></div><div class="card"><strong>Driver errors</strong><h2>${driverErrors}</h2></div><div class="card"><strong>Features</strong><h2>${groups.size}</h2></div></div><table><thead><tr><th>Feature</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Other</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}
