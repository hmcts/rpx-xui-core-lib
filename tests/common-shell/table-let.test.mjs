import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GovukTableColumnConfig, GovukTableComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-table';
import { LetContext, LetDirective } from '@hmcts/rpx-xui-core-lib/ui/let';

test('GOV.UK table retains caption, column and row-header defaults independently per instance', () => {
  const first = new GovukTableComponent();
  const second = new GovukTableComponent();
  assert.equal(first.caption, 'Dates and amounts');
  assert.equal(first.classes, '');
  assert.equal(first.firstCellIsHeader, true);
  assert.equal(first.rows, undefined);
  assert.deepEqual(first.columnConfig, [
    { header: 'Date', key: 'date', type: 'text' },
    { header: 'Amount', key: 'amount' },
  ]);
  first.columnConfig[0].header = 'Changed';
  assert.equal(second.columnConfig[0].header, 'Date');
});

test('GOV.UK table preserves the public column model and caller-owned row/configuration identities', () => {
  const config = new GovukTableColumnConfig();
  assert.equal(config.header, '');
  assert.equal(config.key, '');
  assert.equal(config.type, 'text');
  const table = new GovukTableComponent();
  const rows = [{ name: 'Synthetic row', amount: 12, routerLink: ['/result', 'one'] }];
  const columns = [{ header: 'Name', key: 'name', type: 'link' }];
  table.rows = rows;
  table.columnConfig = columns;
  assert.equal(table.rows, rows);
  assert.equal(table.columnConfig, columns);
});

test('GOV.UK table formats dates using its existing day/month/year contract and rejects invalid dates', () => {
  const table = new GovukTableComponent();
  assert.equal(table.formatDate(new Date(2026, 10, 27, 12)), '27/11/2026');
  assert.equal(table.formatDate(new Date(2024, 1, 29, 12)), '29/02/2024');
  assert.throws(() => table.formatDate(new Date('invalid')), /Unable to convert|Invalid/i);
});

function letFixture() {
  const views = [];
  const template = /** @type {import('@angular/core').TemplateRef<LetContext>} */ (/** @type {unknown} */ ({}));
  const container = /** @type {import('@angular/core').ViewContainerRef} */ (/** @type {unknown} */ ({
    createEmbeddedView(ref, context) { views.push({ template: ref, context }); }
  }));
  const directive = new LetDirective(container, template);
  return { directive, template, views };
}

test('Let renders one embedded view and updates both aliases in its original context including falsy values', () => {
  const context = new LetContext();
  assert.equal(context.$implicit, null);
  assert.equal(context.xuilibLet, null);
  const { directive, template, views } = letFixture();
  assert.equal(views.length, 1);
  assert.equal(views[0].template, template);
  const originalContext = views[0].context;
  for (const value of [{ id: 'synthetic' }, false, 0, '', null, undefined]) {
    directive.xuilibLet = value;
    assert.equal(views.length, 1);
    assert.equal(views[0].context, originalContext);
    assert.equal(originalContext.$implicit, value);
    assert.equal(originalContext.xuilibLet, value);
  }
});

test('Let instances retain independent contexts and caller object identity', () => {
  const first = letFixture();
  const second = letFixture();
  const value = { id: 'first' };
  first.directive.xuilibLet = value;
  assert.notEqual(first.views[0].context, second.views[0].context);
  assert.equal(first.views[0].context.$implicit, value);
  assert.equal(second.views[0].context.$implicit, null);
  second.directive.xuilibLet = 'second';
  assert.equal(first.views[0].context.$implicit, value);
  assert.equal(second.views[0].context.xuilibLet, 'second');
});
