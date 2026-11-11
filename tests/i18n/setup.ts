import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const report: { schemaVersion: number; jasmineVersion: string; complete: boolean; browserErrors: string[]; events: { type: string; result: unknown }[] } = { schemaVersion: 1, jasmineVersion: jasmine.version, complete: false, browserErrors: [], events: [] };
Object.assign(globalThis, { __i18nReport: report });
const record = (type: string) => (result: unknown) => { report.events.push({ type, result }); };
jasmine.getEnv().configure({ random: false });
jasmine.getEnv().addReporter({
  jasmineStarted: record('jasmineStarted'),
  specDone: record('specDone'),
  suiteDone: record('suiteDone'),
  jasmineDone: record('jasmineDone')
});
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
  teardown: { destroyAfterEach: true }
});
