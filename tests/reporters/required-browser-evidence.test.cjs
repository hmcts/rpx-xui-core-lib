const assert = require('node:assert/strict');
const { test } = require('node:test');
const { snapshotInventory, summarize, render } = require('./required-browser-evidence.cjs');
const contracts = [
  { projectName: 'chromium', title: 'first', feature: 'validation' },
  { projectName: 'chromium', title: 'second', feature: 'validation' },
  { projectName: 'chromium', title: 'third', feature: 'contact' },
];
const scenario = (title, status, outcome = status === 'passed' ? 'expected' : status === 'skipped' ? 'skipped' : 'unexpected') => ({ title, parent: { project: () => ({ name: 'chromium' }) }, expectedStatus: status === 'skipped' ? 'skipped' : 'passed', results: status ? [{ status }] : [], outcome: () => outcome });
const suite = (...tests) => ({ allTests: () => tests });

test('filtered, skipped, failed and duplicate required tests remain distinct', () => {
  const snapshot = snapshotInventory(contracts);
  const counts = summarize(snapshot, suite(scenario('first', 'passed'), scenario('second', 'skipped')));
  assert.deepEqual(counts.get('validation'), { passed: 1, failed: 0, skipped: 1, missing: 0, duplicate: 0 });
  assert.equal(counts.get('contact').missing, 1);
  const mixed = summarize(snapshot, suite(scenario('first', 'failed'), scenario('first', 'passed'), scenario('second', 'passed'), scenario('third', 'failed')));
  assert.equal(mixed.get('validation').duplicate, 1);
  assert.equal(mixed.get('contact').failed, 1);
});

test('retries and unrun tests cannot appear passed; inventory snapshot is immutable', () => {
  const snapshot = snapshotInventory(contracts);
  const retry = scenario('first', 'passed', 'flaky');
  retry.results = [{ status: 'failed' }, { status: 'passed' }];
  assert.equal(summarize(snapshot, suite(retry, scenario('second', null))).get('validation').failed, 1);
  assert.equal(summarize(snapshot, suite(retry, scenario('second', null))).get('validation').missing, 1);
  contracts[0].feature = 'changed';
  assert.equal(snapshot.inventory[0].feature, 'validation');
  contracts[0].feature = 'validation';
  assert.notEqual(snapshot.runId, snapshotInventory(contracts).runId);
});

test('malformed and duplicate inventory and absent suite do not yield success', () => {
  assert.throws(() => snapshotInventory([contracts[0], contracts[0]]), /Duplicate/);
  assert.throws(() => snapshotInventory([{ ...contracts[0], feature: '' }]), /Invalid/);
  const snapshot = snapshotInventory(contracts);
  assert.throws(() => summarize(snapshot, null), /unavailable/);
  assert.match(render(snapshot, null, true), /Summary unavailable/);
});

const reviewedContracts = `validation|keyboard checkbox toggles update real FormGroup validity and submitted errors
validation|validation keyboard traversal toggles roles and submits with Enter and Space
validation|validation initial exposes accessible roles and passes axe
validation|validation invalid-submit exposes accessible roles and passes axe
validation|validation valid exposes accessible roles and passes axe
validation|validation axe detects the label rule when a checkbox label is removed
i18n|locale switches reuse persisted translations across English and page reloads
i18n|a translation HTTP failure returns and caches the original phrase
i18n|a late Welsh response preserves English and is reused after switching back
i18n|local gallery translates through its own synthetic service
i18n|local gallery demonstrates a synthetic service failure
i18n|local translation endpoint validates requests
spinner|spinner displays default, updated and translated text
contact|contact details show optional fields and translate labels
case-reference|case reference formatting preserves links and handles drafts
contact|contact links are keyboard reachable and remain accessible through data changes
due-date|due-date displays urgency, date and accessible labels at cutoff boundaries
due-date|due-date updates urgency when thresholds change and high urgency wins
due-date|due-date translates visible and accessible labels
accessibility|accessibility statement selects the application context and exposes service links
accessibility|accessibility statement translates its visible heading
session-dialog|session dialog displays projected content and preserves close output
session-dialog|session dialog translates the sign-out message
session-dialog|session dialog passes serious accessibility checks
session-dialog|session dialog is modal and keeps keyboard focus away from background
session-dialog|destroying the dialog after its opener is removed does not restore focus to a detached node
session-dialog|nested modal restoration returns focus to its own opener
ui-primitives|banner renders and removes the configured success message and icon
ui-primitives|form label associates the field and retains optional heading variants
ui-primitives|heading label and banner use translated messages
ui-primitives|primitives pass scoped serious accessibility checks
ui-primitives|non-heading label preserves supplied text when language changes
session-dialog|session dialog remains visible when a long page is scrolled
session-dialog|session dialog keeps tall content reachable
session-dialog|session dialog with a large top offset remains usable in a short viewport
session-dialog|session dialog preserves the legacy viewport layout while using native modality
cookie|cookie service writes a strict cookie with the current default path and expiry
cookie|cookie deletion requires the matching real browser path and domain
cookie|cookie reads and prefix deletion preserve the legacy boundaries in a browser
window|window provider injects the real browser global without copying it
session-storage|session storage isolates independent tabs and supports remove-after-read
feature-toggle-directive|feature directive shows at most one view and removes it when disabled
feature-toggle-directive|feature directive switches subscriptions and clears stale content while waiting
feature-toggle-directive|feature directive unsubscribes on removal and subscribes again on remount
date-input|date input preserves validation and values across translations
date-input|date input has accessible keyboard reachable date fields
session-error|session error page shows default content and supports custom messages
session-error|session error page has an accessible main landmark and heading
search-location|keyboard search presents and selects a location
search-location|a caller supplied label gives the location search an accessible name
search-location-accessibility-gap|unlabelled booking-style host exposes the existing accessible-name gap
search-location|explicit labels preserve caller context and distinct input identifiers
search-location|changing, clearing and removing a supplied label updates the input name
search-location|synthetic Welsh responses update explicit names without replacing an external label
search-location|blank opt-in preserves the external name and explicit text takes precedence
terms-display|terms display renders sanitized HTML and excludes unsafe attributes
terms-display|terms display treats plain text as text and handles unsupported MIME types
terms-display|terms display uses the shared translation service for language changes
terms-display|translated HTML is rendered through Angular sanitization
gov-input|GOV.UK input connects its label and hint and updates the reactive form
gov-input|GOV.UK input associates an error and restores hint-only state
gov-input|non-heading label follows Welsh language
gov-input|two errors have one unique described-by target
gov-input|both validation messages contribute to the accessible description
gov-input|invalid input without messages does not reference a missing error
gov-input|invalid input with no hint or messages has no description target
gov-date-select|date updates validation as month and year change
gov-date-select|select changes the reactive form value
gov-date-select|fieldset exposes its legend, hint and projected content
gov-date-select|optional date accepts all empty parts but rejects an incomplete date
gov-date-select|rejects an impossible day and recovers when the month changes`.split('\n').map(row => {
  const [feature, title] = row.split('|');
  return ['chromium', title, feature];
});

test('all required browser contracts are independently mapped', () => {
  const inventory = require('../contracts.json').browser.required;
  const triples = inventory.map(({projectName, title, feature}) => [projectName, title, feature]);
  assert.deepEqual(triples, reviewedContracts);
  assert.notDeepEqual(triples.slice(1), reviewedContracts);
  assert.equal([...summarize(snapshotInventory(inventory), suite()).values()].reduce((sum, counts) => sum + counts.missing, 0), reviewedContracts.length);
});
