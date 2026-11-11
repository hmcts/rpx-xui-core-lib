import '@angular/compiler';
import assert from 'node:assert/strict';
import { FormControl, FormGroup } from '@angular/forms';
import { Draft, DRAFT_PREFIX } from '@hmcts/rpx-xui-core-lib/case/models';
import { CaseReferencePipe, CaseReferenceModule } from '@hmcts/rpx-xui-core-lib/case/reference';
import { BadgeColour, ContactDetailsComponent, ContactDetailsModule } from '@hmcts/rpx-xui-core-lib/ui/contact-details';
import { LoadingSpinnerComponent, LoadingSpinnerModule } from '@hmcts/rpx-xui-core-lib/ui/loading-spinner';
import { DueDateComponent, DueDateModule, DateBadgeColour, SECONDS_IN_A_DAY } from '@hmcts/rpx-xui-core-lib/ui/due-date';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

assert.equal(DueDateComponent.name, 'DueDateComponent');
assert.ok(DueDateModule.ɵmod);
assert.equal(DateBadgeColour.RED, 'hmcts-badge--red');
assert.equal(SECONDS_IN_A_DAY, 86400);
assert.equal(BadgeColour.BADGE_BLUE, 'hmcts-badge--blue');
assert.equal(ContactDetailsComponent.name, 'ContactDetailsComponent');
assert.ok(ContactDetailsModule.ɵmod);
assert.equal(LoadingSpinnerComponent.name, 'LoadingSpinnerComponent');
assert.ok(LoadingSpinnerModule.ɵmod);

assert.equal(DRAFT_PREFIX, 'DRAFT');
assert.equal(Draft.isDraft('DRAFT123'), true);
assert.equal(Draft.isDraft('draft123'), false);
assert.equal(Draft.stripDraftId('DRAFT123'), '123');
const reference = new CaseReferencePipe();
assert.equal(reference.transform(null), '');
// @ts-expect-error Legacy runtime accepts non-string input.
assert.equal(reference.transform(0), '');
// @ts-expect-error Legacy runtime accepts non-string input.
assert.equal(reference.transform(1234), '1234');
assert.equal(reference.transform('1111222233334444 5555666677778888'), '1111-2222-3333-4444 5555-6666-7777-8888');
assert.equal(reference.transform('1234567890123456'), '1234-5678-9012-3456');
assert.equal(reference.transform('DRAFT123'), 'DRAFT');
assert.equal(reference.transform('Label [1234567890123456](/cases/1234567890123456)'), 'Label [1234-5678-9012-3456](/cases/1234567890123456)');
assert.ok(CaseReferenceModule.ɵmod);

const required = { requireOneCheckboxToBeChecked: true };
for (const { values, minimum, errors } of [
  { values: {}, errors: required },
  { values: { first: false, second: false }, errors: required },
  { values: { first: true, second: false }, errors: null },
  { values: { first: 'true', second: 1, third: {} }, errors: required },
  { values: { first: true, second: false }, minimum: 2, errors: required },
  { values: { first: true, second: true }, minimum: 2, errors: null },
  { values: {}, minimum: 0, errors: null },
]) {
  const controls = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, new FormControl(value)]));
  const form = new FormGroup(controls, checkboxesBeCheckedValidator(minimum));
  assert.deepEqual(form.errors, errors);
}
console.log('Installed validator: all seven contracts passed');

const { SharedCaseErrorMessages } = await import('@hmcts/rpx-xui-core-lib/case/sharing');
assert.deepEqual(Object.values(SharedCaseErrorMessages), [
  'At least one case must be selected',
  'You have not requested any changes to case sharing',
  'At least one person must be assigned to each case'
]);

const accessibility = await import('@hmcts/rpx-xui-core-lib/ui/accessibility');
assert.equal(typeof accessibility.AccessibilityComponent, 'function');
assert.equal(typeof accessibility.AccessibilityModule, 'function');

const sessionDialog = await import('@hmcts/rpx-xui-core-lib/ui/session-dialog');
assert.equal(sessionDialog.HmctsSessionDialogComponent.name, 'HmctsSessionDialogComponent');
assert.equal(sessionDialog.SessionDialogModule.name, 'SessionDialogModule');
