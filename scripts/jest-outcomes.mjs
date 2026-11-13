function invalidReport() {
  throw new Error('Malformed or unsuccessful native Jest report');
}

function specPath(name) {
  if (typeof name !== 'string' || /[\u0000-\u001f]/.test(name)) invalidReport();
  const normalized = name.replaceAll('\\', '/');
  const marker = 'projects/core-lib/node/server/';
  const offset = normalized.lastIndexOf(marker);
  if (offset < 0 || (offset > 0 && normalized[offset - 1] !== '/')) invalidReport();
  const relative = normalized.slice(offset);
  if (!relative.endsWith('.spec.ts') || relative.split('/').some(part => !part || part === '.' || part === '..')) invalidReport();
  return relative;
}

function passedAssertion(assertion) {
  return assertion?.status === 'passed' && assertion.failing === false && assertion.invocations === 1 &&
    Number.isSafeInteger(assertion.numPassingAsserts) && assertion.numPassingAsserts > 0 &&
    ['failureDetails', 'failureMessages', 'retryMessages', 'retryReasons'].every(key => Array.isArray(assertion[key]) && assertion[key].length === 0) &&
    typeof assertion.title === 'string' && assertion.title.trim().length > 0 &&
    Array.isArray(assertion.ancestorTitles) && assertion.ancestorTitles.every(title => typeof title === 'string') &&
    assertion.fullName === [...assertion.ancestorTitles, assertion.title].join(' ');
}

export function jestOutcomes(text) {
  const report = JSON.parse(text);
  if (report?.success !== true || report.wasInterrupted !== false ||
    !Array.isArray(report.testResults) || !report.testResults.length ||
    !Number.isSafeInteger(report.numTotalTests) || report.numTotalTests < 1 ||
    report.numPassedTests !== report.numTotalTests || report.numTotalTestSuites !== report.testResults.length ||
    report.numPassedTestSuites !== report.numTotalTestSuites ||
    ['numFailedTestSuites', 'numFailedTests', 'numPendingTestSuites', 'numPendingTests', 'numRuntimeErrorTestSuites', 'numTodoTests'].some(key => report[key] !== 0) ||
    !Array.isArray(report.openHandles) || report.openHandles.length || report.snapshot?.failure !== false) invalidReport();
  const paths = new Set(), ids = new Set(), outcomes = [];
  for (const suite of report.testResults) {
    if (suite?.status !== 'passed' || suite.message !== '' || suite.testExecError ||
      !Array.isArray(suite.assertionResults) || !suite.assertionResults.length ||
      !Number.isFinite(suite.startTime) || !Number.isFinite(suite.endTime) || suite.endTime < suite.startTime) invalidReport();
    const path = specPath(suite.name);
    if (paths.has(path)) invalidReport();
    paths.add(path);
    for (const assertion of suite.assertionResults) {
      if (!passedAssertion(assertion)) invalidReport();
      const id = `${path} ${assertion.fullName}`;
      if (ids.has(id)) invalidReport();
      ids.add(id);
      outcomes.push({ id, passed: true });
    }
  }
  if (outcomes.length !== report.numTotalTests) invalidReport();
  return outcomes;
}
