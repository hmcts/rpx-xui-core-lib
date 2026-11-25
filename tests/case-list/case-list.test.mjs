import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CaseListComponent, DateTimeFormatUtils, TableColumnConfig, TableConfig } from '@hmcts/rpx-xui-core-lib/ui/case-list';

const browser = (flags = {}) => ({
  isFirefox: () => Boolean(flags.firefox),
  isSafari: () => Boolean(flags.safari),
  isIEOrEdge: () => Boolean(flags.legacyEdge),
});

const keyup = key => {
  const event = new Event('keyup');
  Object.defineProperty(event, 'key', { value: key });
  return /** @type {KeyboardEvent} */ (/** @type {unknown} */ (event));
};

test('case list retains its public table configuration and date formatting contract', () => {
  const component = new CaseListComponent(browser());
  const column = new TableColumnConfig();
  const config = new TableConfig();

  assert.equal(column.type, 'text');
  assert.equal(config.idField, '');
  assert.deepEqual(config.columnConfigs, []);
  assert.equal(DateTimeFormatUtils.formatDateAtTime(new Date('2019-12-14T16:19:29.379Z'), false), '14 Dec 2019 at 4:19 pm');
  assert.equal(component.formatDate(null), '-');
});

test('case selection changes once for the supported legacy Space key event', () => {
  const component = new CaseListComponent(browser({ firefox: true }));
  const item = { case_id: 'case-1' };
  const selected = [];
  component.cases = [item];
  component.selection.subscribe(value => selected.push(value));

  component.onKeyUp(keyup('Space'), item);

  assert.deepEqual(component.selectedCases, [item]);
  assert.deepEqual(selected, [[item]]);
});

test('case list does not synthesize a Space-key selection in browsers using native checkbox change', () => {
  const component = new CaseListComponent(browser());
  const item = { case_id: 'case-1' };
  component.cases = [item];
  component.onKeyUp(keyup('Space'), item);
  assert.deepEqual(component.selectedCases, []);
});

test('an empty case list is not reported as fully selected', () => {
  const component = new CaseListComponent(browser());
  component.cases = [];
  assert.equal(component.allOnPageSelected(), false);
});

test('an undefined cases input is normalized before selection and rendering', () => {
  const component = new CaseListComponent(browser());
  const selections = [];
  component.cases = undefined;
  component.selection.subscribe(value => selections.push(value));

  assert.deepEqual(component.cases, []);
  assert.equal(component.canAnyBeShared(), false);
  assert.equal(component.allOnPageSelected(), false);
  component.selectAll();
  assert.deepEqual(selections, [[]]);
});

test('case list emits the requested current page', () => {
  const component = new CaseListComponent(browser());
  const pages = [];
  component.pageChange.subscribe(value => pages.push(value));
  component.goToPage(3);
  assert.equal(component.currentPageNo, 3);
  assert.deepEqual(pages, [3]);
});
