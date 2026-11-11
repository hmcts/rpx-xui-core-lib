/* global clearTimeout, process, require, module, setTimeout */

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const odhinModule = require('odhin-reports-playwright');
const { createEmptyFeatureStat, deriveFeatureName, enhanceGeneratedReport } = require('./odhin-report-enhancer.cjs');

const OdhinReporter = odhinModule.default;
const terminalStatusesNoRetry = ['passed', 'flaky', 'skipped', 'interrupted'];

class OdhinAdaptiveReporter {
  /** @param {Partial<import('odhin-reports-playwright/lib/types/execOptions.types').ExecOptions> & { lightweight?: boolean, profile?: boolean, runtimeHookTimeoutMs?: number, finalizationTimeoutMs?: number, trimFailedArtifacts?: boolean, createInnerReporter?: (options: object) => import('@playwright/test/reporter').Reporter }} [options] */
  constructor(options = {}) {
    for (const option of ['startServer', 'embedAssets', 'embedAttachments']) {
      if (options[option] !== undefined && options[option] !== false) {
        throw new Error(`Core Odhín does not support ${option}; serve external report assets explicitly`);
      }
    }
    const reporterOptions = {
      ...options,
      embedAssets: false,
      embedAttachments: false,
      startServer: false,
      testListColumns: [
        ...new Set([
          ...String(options.testListColumns ?? '').toUpperCase().split(',').map((column) => column.trim()).filter(Boolean),
          'PROJECT',
          'FILE',
        ]),
      ],
    };
    this.testMetadata = [];
    this.outputFolder = reporterOptions.outputFolder ?? 'odhin-reports';
    this.indexFilename = reporterOptions.indexFilename ?? 'index.html';
    const configuredLightweight = reporterOptions.lightweight;
    const envLightweight = process.env.PW_ODHIN_LIGHTWEIGHT;
    this.lightweight =
      typeof configuredLightweight === 'boolean'
        ? configuredLightweight
        : envLightweight
          ? envLightweight.toLowerCase() === 'true'
          : !process.env.CI;

    const normalizeTestOutputMode = (raw) => {
      if (raw === true || raw === false) {
        return raw;
      }
      const normalized = String(raw ?? 'only-on-failure')
        .trim()
        .toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
      return 'only-on-failure';
    };

    // Keep failure output as a separate file rather than embedding it in report HTML.
    this.testOutputMode = normalizeTestOutputMode(reporterOptions.testOutput);
    this.profileEnabled =
      typeof reporterOptions.profile === 'boolean'
        ? reporterOptions.profile
        : process.env.PW_ODHIN_PROFILE
          ? process.env.PW_ODHIN_PROFILE.toLowerCase() === 'true'
          : true;
    const configuredRuntimeHookTimeoutMs = reporterOptions.runtimeHookTimeoutMs ?? process.env.PW_ODHIN_RUNTIME_HOOK_TIMEOUT_MS;
    this.runtimeHookTimeoutMs = normalizeRuntimeHookTimeoutMs(configuredRuntimeHookTimeoutMs, 15000);
    const configuredFinalizationTimeoutMs = reporterOptions.finalizationTimeoutMs ?? process.env.PW_ODHIN_FINALIZATION_TIMEOUT_MS;
    this.finalizationTimeoutMs = normalizeRuntimeHookTimeoutMs(configuredFinalizationTimeoutMs, 30000);
    this.trimFailedArtifacts = normalizeBoolean(
      reporterOptions.trimFailedArtifacts ?? process.env.PW_ODHIN_TRIM_FAILED_ARTIFACTS,
      false
    );
    this.statusCounts = {
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      other: 0,
    };
    this.trimmedCounts = {
      output: 0,
      heavyArtifacts: 0,
    };
    this.runtimeHookStats = {
      queued: 0,
      completed: 0,
      timedOut: 0,
      failed: 0,
    };
    this.featureStats = new Map();
    this.finalizationStartedAt = 0;
    this.pendingInnerCallbacks = Promise.resolve();
    /** @type {import('@playwright/test/reporter').Reporter} */
    this.inner =
      typeof reporterOptions.createInnerReporter === 'function'
        ? reporterOptions.createInnerReporter(reporterOptions)
        : new OdhinReporter(/** @type {import('odhin-reports-playwright/lib/types/execOptions.types').ExecOptions} */ (reporterOptions));
  }

  async onBegin(config, suite) {
    if (typeof this.inner.onBegin === 'function') {
      await this.inner.onBegin(config, suite);
    }
  }

  async onTestEnd(test, result) {
    if (typeof this.inner.onTestEnd !== 'function') {
      return;
    }

    let nextResult = result;
    const passedOrSkipped = result?.status === 'passed' || result?.status === 'skipped';
    const shouldTrimHeavyArtifacts = this.lightweight && (passedOrSkipped || (this.trimFailedArtifacts && !passedOrSkipped));

    const shouldDropTestOutput = this.testOutputMode === false || (this.testOutputMode === 'only-on-failure' && passedOrSkipped);

    let logFileName;
    const stdout = Array.isArray(result?.stdout) ? result.stdout : [];
    const stderr = Array.isArray(result?.stderr) ? result.stderr : [];
    if (!shouldDropTestOutput && (stdout.length || stderr.length)) {
      const name = createHash('sha256').update(`${test.id}:${result.retry}`).digest('hex');
      logFileName = `logs/${name}.log`;
      fs.mkdirSync(path.join(this.outputFolder, 'logs'), { recursive: true });
      fs.writeFileSync(
        path.join(this.outputFolder, logFileName),
        [stdout.length ? `=== stdout ===\n${stdout.map(String).join('')}` : '', stderr.length ? `=== stderr ===\n${stderr.map(String).join('')}` : ''].filter(Boolean).join('\n\n') + '\n'
      );
    }

    nextResult = { ...nextResult, stdout: [], stderr: [] };
    if (shouldDropTestOutput) {
      this.trimmedCounts.output += 1;
    }

    if (shouldTrimHeavyArtifacts) {
      nextResult.steps = [];
      nextResult.attachments = [];
      this.trimmedCounts.heavyArtifacts += 1;
    }

    const titlePath = typeof test?.titlePath === 'function' ? test.titlePath() : [];
    this.testMetadata.push({
      target: `#${test.id}-${result.retry}`,
      feature: deriveFeatureName(test?.location?.file, titlePath),
      tags: test.tags ?? [],
      durationMs: result.duration || 0,
      retry: result.retry,
      logFileName,
    });
    this.recordStatus(result?.status);
    this.recordFeatureStat(test, result, titlePath);
    void this.enqueueInnerCallback('onTestEnd', () => this.inner.onTestEnd(test, nextResult), { test });
  }

  async onEnd(result) {
    this.finalizationStartedAt = Date.now();
    if (this.profileEnabled) {
      process.stdout.write(
        `[odhin-profile] Starting Odhin finalization statusCounts=${JSON.stringify(this.statusCounts)} trimmed=${JSON.stringify(this.trimmedCounts)} runtimeHooks=${JSON.stringify(this.runtimeHookStats)} lightweight=${this.lightweight} testOutput=${this.testOutputMode}\n`
      );
    }
    await this.flushInnerCallbacks();
    let reportingFailed = this.runtimeHookStats.failed > 0 || this.runtimeHookStats.timedOut > 0;
    if (typeof this.inner.onEnd === 'function') {
      try {
        const outcome = await withTimeout(this.inner.onEnd(result), this.finalizationTimeoutMs);
        reportingFailed ||= outcome?.status === 'failed';
      } catch (error) {
        reportingFailed = true;
        if (isTimeoutError(error)) {
          process.stderr.write(
            `[odhin-profile] onEnd timed out after ${this.finalizationTimeoutMs}ms; failing the run with partial evidence.\n`
          );
        } else {
          process.stderr.write(`[odhin-profile] onEnd failed: ${formatErrorMessage(error)}\n`);
        }
      }
    }
    try {
      const primaryReport = path.join(this.outputFolder, this.indexFilename);
      const primaryStat = fs.statSync(primaryReport);
      if (!primaryStat.isFile() || primaryStat.size === 0) {
        throw new Error(`Missing or empty primary Odhín report: ${primaryReport}`);
      }
      enhanceGeneratedReport(this.outputFolder, this.featureStats, this.testMetadata);
    } catch (error) {
      reportingFailed = true;
      process.stderr.write(`[odhin-profile] report enhancement failed: ${formatErrorMessage(error)}\n`);
    }
    if (this.profileEnabled) {
      const elapsedMs = Math.max(0, Date.now() - this.finalizationStartedAt);
      process.stdout.write(`[odhin-profile] Completed Odhin finalization in ${elapsedMs}ms.\n`);
    }
    if (reportingFailed) return { status: 'failed' };
  }

  async onStdOut(chunk, test, result) {
    if (typeof this.inner.onStdOut === 'function') {
      void this.enqueueInnerCallback('onStdOut', () => this.inner.onStdOut(chunk, test, result), { test });
    }
  }

  async onStdErr(chunk, test, result) {
    if (typeof this.inner.onStdErr === 'function') {
      void this.enqueueInnerCallback('onStdErr', () => this.inner.onStdErr(chunk, test, result), { test });
    }
  }

  recordStatus(status) {
    switch (status) {
      case 'passed':
        this.statusCounts.passed += 1;
        break;
      case 'failed':
        this.statusCounts.failed += 1;
        break;
      case 'skipped':
        this.statusCounts.skipped += 1;
        break;
      case 'timedOut':
        this.statusCounts.timedOut += 1;
        break;
      case 'interrupted':
        this.statusCounts.interrupted += 1;
        break;
      default:
        this.statusCounts.other += 1;
    }
  }

  recordFeatureStat(test, result, titlePath = []) {
    const finalStatus = normalizeFinalStatus(result?.status, result?.retry);
    if (!isFinalResult(finalStatus, result?.retry, test?.retries)) {
      return;
    }

    const featureName = deriveFeatureName(test?.location?.file, titlePath);
    const current = this.featureStats.get(featureName) ?? createEmptyFeatureStat(featureName);
    current.totalTests += 1;
    current.durationMs += Number(result?.duration ?? 0);

    switch (finalStatus) {
      case 'passed':
        current.passed += 1;
        break;
      case 'failed':
        current.failed += 1;
        break;
      case 'timedOut':
        current.timedOut += 1;
        break;
      case 'skipped':
        current.skipped += 1;
        break;
      case 'interrupted':
        current.interrupted += 1;
        break;
      case 'flaky':
        current.flaky += 1;
        break;
      default:
        current.interrupted += 1;
        break;
    }

    this.featureStats.set(featureName, current);
  }

  enqueueInnerCallback(hookName, invoke, context = {}) {
    this.runtimeHookStats.queued += 1;
    const run = async () => {
      try {
        await withTimeout(Promise.resolve().then(invoke), this.runtimeHookTimeoutMs);
        this.runtimeHookStats.completed += 1;
      } catch (error) {
        if (isTimeoutError(error)) {
          this.runtimeHookStats.timedOut += 1;
          process.stderr.write(
            `[odhin-profile] ${hookName} timed out after ${this.runtimeHookTimeoutMs}ms${formatHookContext(context)}\n`
          );
          return;
        }
        this.runtimeHookStats.failed += 1;
        process.stderr.write(`[odhin-profile] ${hookName} failed${formatHookContext(context)}: ${formatErrorMessage(error)}\n`);
      }
    };
    this.pendingInnerCallbacks = this.pendingInnerCallbacks.then(run, run);
    return this.pendingInnerCallbacks;
  }

  async flushInnerCallbacks() {
    await this.pendingInnerCallbacks;
  }
}

const normalizeRuntimeHookTimeoutMs = (raw, fallbackMs) => {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallbackMs;
};

const normalizeBoolean = (raw, fallback) => {
  if (typeof raw === 'boolean') {
    return raw;
  }
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return fallback;
};

const normalizeFinalStatus = (status, retry) => {
  if (status === 'passed' && Number(retry ?? 0) > 0) {
    return 'flaky';
  }
  return status;
};

const isFinalResult = (status, retry, retries) =>
  terminalStatusesNoRetry.includes(status) || Number(retry ?? 0) === Number(retries ?? 0);

const withTimeout = async (promise, timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(Object.assign(new Error(`Timed out after ${timeoutMs}ms`), { code: 'ODHIN_TIMEOUT' })),
          timeoutMs
        );
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const isTimeoutError = (error) => error?.code === 'ODHIN_TIMEOUT';

const formatErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/** @param {{ test?: import('@playwright/test/reporter').TestCase }} [context] */
const formatHookContext = ({ test } = {}) => {
  const title =
    typeof test?.titlePath === 'function' ? test.titlePath().join(' > ') : typeof test?.title === 'string' ? test.title : '';
  return title ? ` test="${title}"` : '';
};

module.exports = OdhinAdaptiveReporter;
