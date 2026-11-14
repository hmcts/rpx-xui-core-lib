import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkContracts } from '../scripts/check-contracts.mjs';
import { makeLaneReceipt } from '../scripts/evidence-lane-receipts.mjs';

const contractInventory = JSON.parse(readFileSync(new URL('./contracts.json', import.meta.url), 'utf8'));

const identity = { sourceSha: 'a'.repeat(40), runId: 'fixture', attempt: '1', invocationId: '12345678-1234-4123-8123-123456789abc', sourceSnapshot: 'b'.repeat(64) };
const candidate = Buffer.from('candidate bytes');
const counterpart = Buffer.from('counterpart archive bytes');
const counterpartProfile = JSON.parse(readFileSync(new URL('./fixtures/compatibility/translation-counterpart.json', import.meta.url), 'utf8'));
const counterpartArchive = 'test-results/package-evidence/translation-counterpart/rpx-xui-translation-0.0.0-core-preview.0.tgz';
const counterpartEvidence = 'test-results/package-evidence/translation-counterpart.json';
const jasmineVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).devDependencies['jasmine-core'];

function counterpartProof() {
  const packedFiles = Object.fromEntries(['LICENCE', 'index.d.ts', 'index.mjs', 'package.json'].map(name =>
    [`package/${name}`, counterpartProfile.files[`projects/rpx-xui-translation-core-facade/${name}`]]));
  return { schemaVersion: 1, repository: counterpartProfile.repository, sourceSha: counterpartProfile.commit,
    profileSha256: createHash('sha256').update(JSON.stringify(counterpartProfile)).digest('hex'),
    sourceFiles: { ...counterpartProfile.files }, packedFiles, sha256: createHash('sha256').update(counterpart).digest('hex') };
}

const unitNames = [
  'rejects an empty group with the default minimum',
  'rejects unchecked controls',
  'accepts one actual true by default',
  'rejects truthy non-boolean values',
  'rejects fewer than the configured minimum',
  'accepts the exact configured minimum',
  'accepts zero when zero is explicitly required',
  'rejects use on a non-group control with a clear error',
  "case sharing initializes and copies selected cases while preserving nested references",
  "case sharing emits deduplicated pending shares and host must synchronize emitted state",
  "case sharing unshares and cancels only the selected case",
  "case sharing removes a case only when more than one exists",
  "case sharing DI supports one instance with a synthetic alias",
  "case sharing removal mutates the same array and distinct state does not emit again",
  "case sharing pending additions and access use email while unshare uses user id",
  "case sharing removes a pending share by user id only for the requested case",
  "case sharing cancels pending unshare by email and emits the updated state",
  "storage forwards set, get, remove and clear with exact values",
  "storage propagates read failures without removing data",
  "storage supports one DI instance with a synthetic token alias",
  "task names cache is scoped by service and cache hits do not call HTTP",
  "task name malformed cache throws and storage errors propagate",
  "task HTTP failure does not write cache and work types use exact request",
  "task service DI uses the explicit shared storage instance",
  "task names accept an empty cached array without requesting HTTP",
  "task names propagate cache write errors from HTTP response",
  "task name cancellation tears down the HTTP subscription without writing",
  "task service sends and caches through the Angular HTTP testing backend",
];
unitNames.push('selected case stops listening to shared state when destroyed',
  'SelectedCaseListComponent stops listening to shared state when destroyed',
  'SelectedCaseConfirmComponent stops listening to shared state when destroyed',
  'selected case actions use the same state and forward emitted changes',
  'list forwards selection and confirmation displays pending changes only',
  'ShareCaseComponent releases the host state subscription',
  'ShareCaseConfirmComponent releases the host state subscription',
  'continue validation reads current state without keeping subscriptions',
  'user selection stops emitting when the component is destroyed',
  'sharing supplies a label when the consumer does not provide one');
const addedLaneNames = {
  "refDataUnit": [
    "reference data HTTP endpoints and encoded service-code parameter match the source",
    "reference data shares duplicate codes, retains input order and reuses successful cache",
    "reference data service-code errors cache the empty fallback without retry",
    "reference data direct region stream propagates errors and retries on a later subscription",
    "reference data empty service codes complete without emitting or making a request",
    "reference data shared request survives one consumer cancellation and populates the cache",
    "both reference data token alias directions share one service across injector boundaries",
    "reference data shares one in-flight HTTP request across concurrent consumers"
  ],
  "locationUnit": [
    "locations POST retains caller URL, request body and response ordering",
    "locations GET preserves source query interpolation and response",
    "locations HTTP errors reach the subscriber without a fallback",
    "locations request cancellation aborts the Angular test request",
    "location booking enum retains source values",
    "locations GET retains raw query metacharacters from the caller",
    "locations GET errors propagate and POST cancellation aborts the request"
  ],
  "windowUnit": [
    "window provider retains the source ReferenceError when no browser window exists",
    "window provider returns the exact browser global rather than a copy",
    "both alias directions share one supplied window across root and child injectors",
    "a child injector override intentionally shadows the parent window token"
  ],
  "cookieUnit": [
    "cookie setter preserves legacy expiry and SameSite formatting",
    "cookie reads preserve exact-name, missing-key and equals-sign behavior",
    "cookie deletion preserves provided path and domain and the legacy prefix match",
    "cookie service injects the provided document and supports explicit token aliasing"
  ],
  "featureToggleUnit": [
    "unconfigured feature service fails explicitly for all operations",
    "both alias directions use one provided feature service across parent and unshadowed child",
    "child provider shadowing creates a distinct feature service",
    "directive releases the previous and final feature subscriptions",
    "directive releases the previous feature and clears its view if the next provider throws",
    "directive does not retain previous content when the new observable errors",
    "directive clears enabled content if the active feature stream later errors",
    "directive retains only the reentrant replacement subscription",
    "directive stops a synchronous source when destroyed during rendering",
    "directive ignores assignments after destruction and a reentrant provider switch",
    "directive does not overwrite a replacement created by previous-source teardown",
    "directive does not resubscribe when teardown reenters during destruction"
  ],
  "roleUnit": [
    "role state suppresses its initial null and emits each assigned array without copying",
    "both bridge directions reuse the chosen state in root and unshadowed child injectors",
    "a child role provider intentionally shadows root state and must be accounted for during cutover",
    "role matching preserves source ALL, ANY and default regex behavior",
    "role matching preserves invalid regex and short-circuit behavior"
  ]
};
unitNames.push("date input reports mandatory and partial values through the legacy validator", "date input write and callback preserve the legacy padded value", "date input retains legacy touched callback and destruction behavior");
unitNames.push('date revalidates on month and year changes and stops after destruction');
unitNames.push('date preserves legacy required and optional empty-value validation');

const nodeNames = [
  'Node authentication and session constants retain the legacy values',
  'Node security policy retains the legacy directives',
  "getUserSessionTimeout matches configuration order and sorts roles in place",
  "getUserSessionTimeout returns the same mutable fallback for unmatched and empty roles",
  "getUserSessionTimeout throws for an invalid pattern only when there are roles to examine",
  "getUserSessionTimeout throws on missing roles or configuration",
  "hasKey includes inherited keys and rejects absent keys",
  "sortArray returns the same array sorted in place",

  'arrayPatternMatch() matches ["pui-organisation-manager", "pui-user-manager", "pui-finance-manager"] to user-manager expecting true',
  'arrayPatternMatch() matches ["pui-organisation-manager", "pui-user-manager", "pui-finance-manager"] to . expecting true',
  'arrayPatternMatch() matches ["pui-organisation-manager", "pui-user-manager", "pui-finance-manager"] to dwp expecting false',
  'isRoleMatch() matches pui-case-manager to case-',
  'isRoleMatch() matches pui-case-manager to pui',
  'isRoleMatch() matches pui-case-manager to dwp-',
  'isRoleMatch() matches pui to .',
  'empty roles do not match, including an invalid unused pattern',
  'invalid patterns throw SyntaxError for a string or nonempty roles',
];
const i18nNames = [
  "replacePlaceholders handles literal metacharacter keys, repeated values and empty literals",
  "RpxTranslatePipe transform passes explicit literal replacements to the service",
  "translation real cache recovery keeps literal values out of requests and real IndexedDB across language changes",
  "RpxTranslationService public API composition keeps explicit literal replacements out of translation requests",
  "matchCase should return the second string with the same case as the first string if the first character is uppercase",
  "matchCase should return the second string in lowercase if the first character is lowercase",
  "matchCase should return the second string as is if either string is empty",
  "replacePlaceholders should replace placeholders with the correct values - example 1",
  "replacePlaceholders should replace placeholders with the correct values - example 2",
  "replacePlaceholders should replace placeholders with the correct values - example 3",
  "RpxTranslatePipe create an instance",
  "RpxTranslatePipe transform should return null when called with null or undefined",
  "RpxTranslatePipe transform should return the same string when called with a string",
  "RpxTranslatePipe transform should call getTranslation with the string argument when no replacements or yesOrNo are provided",
  "RpxTranslatePipe transform should call getTranslationWithReplacements with the string and replacements arguments when replacements are provided",
  "RpxTranslatePipe transform should call getYesTranslationReplacement with the string and yesOrNo argument when yesOrNo is \"yes\"",
  "RpxTranslatePipe transform should call getNoTranslationReplacement with the string and yesOrNo argument when yesOrNo is \"no\"",
  "RpxTranslationService should be created",
  "RpxTranslationService should return the default language en as a string",
  "RpxTranslationService should normalise repeated spacing before translating a phrase",
  "RpxTranslationService should normalise multiple spacing runs before translating a phrase",
  "RpxTranslationService should preserve markdown line breaks while normalising horizontal spacing",
  "RpxTranslationService should request the normalised phrase when loading a phrase with multiple spaces",
  "RpxTranslationService returns English without loading a translation",
  "RpxTranslationService shouldTranslate should return false for phrases without alphabetic characters",
  "RpxTranslationService shouldTranslate should return true for phrases with alphabetic characters",
  "RpxTranslationService shouldTranslate should return false for phrases containing [Translation in progress]",
  "RpxTranslationService shouldTranslate should return true for phrases not containing [Translation in progress]",
  "RpxTranslationService shouldTranslate should return false for placeholder-only phrases",
  "RpxTranslationService shouldTranslate should return true for phrases containing placeholders with other text",
  "RpxTranslationService shouldTranslate should return false for null or undefined phrases",
  "RpxTranslationService Null/Undefined handling should handle null phrase in normalisePhraseSpacing",
  "RpxTranslationService Null/Undefined handling should handle undefined phrase in normalisePhraseSpacing",
  "RpxTranslationService Null/Undefined handling should handle empty string in normalisePhraseSpacing",
  "RpxTranslationService Null/Undefined handling should handle null phrase in getTranslation$",
  "RpxTranslationService Null/Undefined handling should handle undefined phrase in getTranslation$",
  "RpxTranslationService Null/Undefined handling should safely get persisted language when cookie not set",
  "RpxTranslationService Null/Undefined handling should safely get persisted language when cookie is set",
  "RpxTranslationService Null/Undefined handling should handle normalisePhraseSpacing with multiple spaces and null/undefined",
  "RpxTranslationService Null/Undefined handling should handle shouldTranslate with various null/undefined edge cases",
  "RpxTranslationService Null/Undefined handling should handle getTranslationWithYesOrNo$ with null yesOrNoValue",
  "RpxTranslationService Null/Undefined handling should handle getTranslationWithReplacements$ with empty replacements",
  "canonical translation provider scope forChild inherits the root service and configuration identities",
  "canonical translation provider scope a child injector can override configuration without replacing the root service",
  "canonical translation provider scope renders the real public pipe through the root module",
  "RpxTranslationService language changes retires a pending cache lookup on English selection and can reuse Welsh cache later",
  "RpxTranslationService language changes caches a late Welsh response without overwriting English",
  "RpxTranslationService language changes does not replace English with a stale failed-request fallback",
  "RpxTranslationService language changes returns English for phrases matching inherited Object property names",
  "RpxTranslationService public API composition translates only static fragments and preserves repeated numeric replacements and spacing",
  "RpxTranslationService public API composition selects Yes/No metadata and matches each input’s initial letter case from one request",
  "RpxTranslationService public API composition restores original Yes/No inputs after a successful response without answer metadata",
  "RpxTranslationService request lifecycle batches distinct phrases and deduplicates repeated subscriptions and normalized aliases",
  "RpxTranslationService request lifecycle uses source fallback in production mode and allows a subsequent phrase to translate",
  "RpxTranslationService overlapping batches keeps a queued second batch after an in-flight success",
  "RpxTranslationService overlapping batches keeps a queued second batch after an in-flight failure",
  "RpxTranslationService overlapping batches keeps dispatched batches independent when the second finishes before the first success",
  "RpxTranslationService overlapping batches keeps dispatched batches independent when the second finishes before the first failure",
  "RpxTranslationService phrase dictionary keys keeps hasOwnProperty and subsequent phrases working across a language change and HTTP success",
  "RpxTranslationService phrase dictionary keys keeps hasOwnProperty and subsequent phrases working across a language change and HTTP failure",
  "RpxTranslationService phrase dictionary keys keeps __proto__ and subsequent phrases working across a language change and HTTP success",
  "RpxTranslationService phrase dictionary keys keeps __proto__ and subsequent phrases working across a language change and HTTP failure",
  "translation provider lifecycle does not dispatch a pending batch after its owner is destroyed",
  "translation provider lifecycle cancels an in-flight request when its owner is destroyed",
  "translation provider lifecycle cancels all overlapping requests when their owner is destroyed",
  "translation provider lifecycle ignores a cache lookup that finishes after its owner is destroyed",
  "translation provider lifecycle keeps the root service active when a forChild injector is destroyed",
  "translation provider lifecycle handles a synchronously completed HTTP success",
  "translation provider lifecycle handles a synchronously completed HTTP failure",
  "translation provider lifecycle stops response processing if a subscriber destroys the owner",
  "translation provider lifecycle stops cache-miss processing if a subscriber destroys the owner",
  "translation provider lifecycle stops a language change when its subscriber destroys the owner",
  "translation provider lifecycle stops observing cached translations when its owner is destroyed",
  "translation boundary validation accepts only supported persisted and assigned languages",
  "translation boundary validation falls back for malformed response values without caching them and retains valid siblings",
  "translation boundary validation treats rejected cache reads as misses and preserves output when writes reject",
  "translation boundary validation rejects malformed cached values and tolerates deletion failure",
  "translation boundary validation falls back for malformed payloads and metadata, and accepts an empty translation",
  "translation boundary validation uses valid cached empty strings and metadata without HTTP",
  "translation boundary validation tolerates an expired cache deletion failure",
  "translation boundary validation uses own response keys for normalized phrases with inherited property names",
  "translation boundary validation uses the configured test-mode fallback without caching a malformed response",
  "RpxTranslationService Null/Undefined handling returns an empty string for undefined yesOrNoValue without a request",
  "translation real cache recovery recovers from a rejected invalid deletion with real IndexedDB and a fresh service",
  "translation real cache recovery recovers from a rejected expired deletion with real IndexedDB and a fresh service",
  "translation real cache recovery keeps a malformed response fallback stable then recovers after a language cycle",
];
const i18nJourneys = ['contact links are keyboard reachable and remain accessible through data changes', 'case reference formatting preserves links and handles drafts', 'contact details show optional fields and translate labels', 'spinner displays default, updated and translated text', 'a late Welsh response preserves English and is reused after switching back', 'locale switches reuse persisted translations across English and page reloads', 'a translation HTTP failure returns and caches the original phrase', 'local gallery translates through its own synthetic service', 'local gallery demonstrates a synthetic service failure', 'local translation endpoint validates requests'];
const dueDateJourneys = [
  'due-date displays urgency, date and accessible labels at cutoff boundaries',
  'due-date updates urgency when thresholds change and high urgency wins',
  'due-date translates visible and accessible labels',
];
const accessibilityJourneys = [
  'accessibility statement selects the application context and exposes service links',
  'accessibility statement translates its visible heading',
];
const sessionDialogJourneys = [
  'session dialog remains visible when a long page is scrolled',
  'session dialog keeps tall content reachable',
  'session dialog with a large top offset remains usable in a short viewport',
  'session dialog displays projected content and preserves close output',
  'session dialog translates the sign-out message',
  'session dialog passes serious accessibility checks',
  'session dialog is modal and keeps keyboard focus away from background',
  'session dialog preserves the legacy viewport layout while using native modality',
  'destroying the dialog after its opener is removed does not restore focus to a detached node',
  'nested modal restoration returns focus to its own opener',

];
const primitiveJourneys = [
  "banner renders and removes the configured success message and icon",
  "form label associates the field and retains optional heading variants",
  "heading label and banner use translated messages",
  "primitives pass scoped serious accessibility checks",
  "non-heading label preserves supplied text when language changes",
];
const addedBrowserJourneys = [
  "cookie service writes a strict cookie with the current default path and expiry",
  "cookie deletion requires the matching real browser path and domain",
  "cookie reads and prefix deletion preserve the legacy boundaries in a browser",
  "window provider injects the real browser global without copying it",
  "session storage isolates independent tabs and supports remove-after-read",
  "feature directive shows at most one view and removes it when disabled",
  "feature directive switches subscriptions and clears stale content while waiting",
  "feature directive unsubscribes on removal and subscribes again on remount"
];
const cacheJourneys = [
  "baseline: legacy to core preserves valid cached translation",
  "baseline: core to legacy preserves valid cached translation",
  "baseline: core replaces an expired cache row written by published legacy",
  "aligned: legacy to core preserves valid cached translation",
  "aligned: core to legacy preserves valid cached translation",
  "aligned: core replaces an expired cache row written by published legacy",
  "direct: baseline core to aligned core preserves valid cached translation",
  "direct: aligned core to baseline core preserves valid cached translation",
  "installed core keeps literal values out of requests and IndexedDB after reload"
];
const journey = 'keyboard checkbox toggles update real FormGroup validity and submitted errors';
const validationJourneys = [
  'validation keyboard traversal toggles roles and submits with Enter and Space',
  'validation initial exposes accessible roles and passes axe',
  'validation invalid-submit exposes accessible roles and passes axe',
  'validation valid exposes accessible roles and passes axe',
  'validation axe detects the label rule when a checkbox label is removed',
];
const packageIds = [
  'package.physical-secondary-declaration', 'package.strict-node', 'package.strict-bundler',
  'package.installed-runtime', 'package.missing-declaration-fault', 'package.restored-node',
  'package.physical-node', 'package.installed-node-runtime', 'package.installed-node-http', 'package.node-loading-fault', 'package.browser-denied',
  'package.missing-marker-fault', 'package.restored-node-runtime',
  'package.physical-i18n',
  "package.root-runtime-empty",
  "package.validation-graph",
  "package.sharing-graph",
      "package.loading-state-graph",
      "package.loading-state-behavior",
  "package.due-date-graph",
  "package.accessibility-graph",
  "package.session-dialog-graph",
  "package.primitives-entry-graphs",
  "package.root-export-fault",
  "package.validation-i18n-fault",
  "package.restored-runtime-graph",

];

packageIds.push("package.session-storage-behavior", "package.session-storage-graph", "package.task-data-behavior", "package.task-data-graph", "package.case-sharing-state-graph", "package.case-sharing-state-behavior", "package.cookie-behavior", "package.cookie-graph", "package.terms-type", "package.terms-graph", "package.window-behavior", "package.window-graph", "package.locations-behavior", "package.locations-graph", "package.ref-data-behavior", "package.ref-data-graph");

packageIds.push("package.feature-toggle-graph", "package.feature-directive-graph", "package.role-state-graph", "package.feature-toggle-behavior", "package.role-state-behavior");

packageIds.push('package.editor-date-graph');
addedBrowserJourneys.push('date input preserves validation and values across translations', 'date input has accessible keyboard reachable date fields');

packageIds.push('package.session-error-graph', 'package.terms-display-graph');
addedBrowserJourneys.push("session error page shows default content and supports custom messages", "session error page has an accessible main landmark and heading", "terms display renders sanitized HTML and excludes unsafe attributes", "terms display treats plain text as text and handles unsupported MIME types", "terms display uses the shared translation service for language changes", "translated HTML is rendered through Angular sanitization");

unitNames.push('search requires three characters and cancels previous in-flight request', 'lookup failure emits null and selection retains object identity', 'keyboard validation preserves supported navigation and rejects numeric input', 'service-code filtering excludes selected and duplicate locations', 'reset and booking session inputs retain source behavior');
unitNames.push('constructor uses the supplied location and session instances without copying');
unitNames.push('input change emits both source events with the entered term', 'lookup uses configured arguments and excludes previously selected locations', 'service lookup handles empty search and filters by configured property', 'keyboard input preserves legacy accepted keys and legacy keyCode fallback');
addedBrowserJourneys.push('keyboard search presents and selects a location', 'a caller supplied label gives the location search an accessible name');
addedBrowserJourneys.push('unlabelled booking-style host exposes the existing accessible-name gap');
addedBrowserJourneys.push('explicit labels preserve caller context and distinct input identifiers', 'changing, clearing and removing a supplied label updates the input name', 'synthetic Welsh responses update explicit names without replacing an external label');
addedBrowserJourneys.push('blank opt-in preserves the external name and explicit text takes precedence');
packageIds.push('package.search-location-graph');

packageIds.push('package.loading-angular-build', 'package.loading-eager-fault');


packageIds.push("package.gov-input-graph", "package.gov-input-behavior");
packageIds.push('package.gov-date-graph', 'package.gov-select-graph', 'package.gov-date-behavior');
addedBrowserJourneys.push("GOV.UK input connects its label and hint and updates the reactive form", "GOV.UK input associates an error and restores hint-only state", "non-heading label follows Welsh language", "two errors have one unique described-by target", "both validation messages contribute to the accessible description", "invalid input without messages does not reference a missing error", "invalid input with no hint or messages has no description target");
addedBrowserJourneys.push('date updates validation as month and year change', 'select changes the reactive form value', 'fieldset exposes its legend, hint and projected content', 'optional date accepts all empty parts but rejects an incomplete date', 'rejects an impossible day and recovers when the month changes');

addedBrowserJourneys.push('date errors describe the correct fieldset without duplicate or missing targets', 'empty date and select messages never reference absent error elements');
unitNames.push('checkbox list maps preselection to actual options and removes unavailable selections', 'checkbox list emits user selection and select-all transitions', 'checkbox list keeps an active user selection when preselection later changes');
addedBrowserJourneys.push('checkbox list instances keep labels and selections independent', 'checkbox list supports keyboard selection and select-all transitions');
packageIds.push('package.checkbox-list-graph');

unitNames.push("judicial search excludes already selected people and forwards search options", "all-domain search joins both people lists in legacy order", "Admin domain returns caseworkers", "CTSC domain returns caseworkers", "Legal Ops domain returns caseworkers", "unknown domain and short term return empty results", "display names and field-change event preserve the component contract", "new input \"bob\" immediately cancels stale lookup", "new input \"\" immediately cancels stale lookup", "new input \"bo\" immediately cancels stale lookup", "destroy cancels a pending lookup", "latest lookup displays the new options and emits the cleared selection after debounce", "a failed lookup clears results and a later input still works", "selection emits a person and sets display text without starting another search", "selection during pending debounce cancels search and emits only the selected person", "selection during an active lookup closes options and cancels its response", "find-person overlapping caseworker requests retain their own assigned-user filters", "find-person preserves public mapping state and role precedence", "find-person preserves empty results and forwards request failures", "find-person explicit injection alias shares a service and child override stays distinct", "find-person snapshots an assigned-user array before a judicial response", "find-person snapshots role, search term, current user and assigned array for each delayed response", "find-person retains prior user ID if session details are absent", "find-person asynchronous mapping dispatches through public overrides", "find-person nested response restores outer context and retains public mutations", "find-person exception unwinds request context before a direct mapping call", "find-person synchronous responses leave public mapping state intact", "find-person repeated cold subscriptions retain their request snapshot", "judicial search forwards its request and response");
addedBrowserJourneys.push("new input suppresses stale response and keyboard selection keeps latest person", "multiple default lookup instances keep input and description ids unique");
packageIds.push("package.find-person-behavior", "package.find-person-graph");

unitNames.push("find-person shared parent group uses one control with duplicate subscriptions");

addedBrowserJourneys.push("one default and two explicitly identified instances expose only their own live descriptions", "visible group error marks the input invalid even when not submitted", "a submitted child-only invalid state marks input invalid without fabricating an error", "one default and two distinct idValue instances have no automated WCAG violations in error state", "changing idValue updates input and live description targets together");

addedBrowserJourneys.push("accessible name remains meaningful across delayed translation and language switches", "failed translation retains original accessible phrase", "missing phrase falls back to original accessible phrase", "late Welsh translation cannot overwrite the selected English name", "completed Welsh response replaces the English accessible name", "whitespace-only translation falls back to a non-blank accessible name");

unitNames.push("uses a parent-owned existing control and preserves its value and validators after destruction", "retains an existing disabled control and does not replace parent state", "creates a control with selectedPerson when absent and keeps it in parent after destroy", "preserves legacy initialization when the existing entry is not a FormControl", "initialization retains the legacy parent group update and validation emissions", "a retained control drives lookup events until component destruction", "recreating a component retains parent-owned state and leaves only the new subscription active");
addedBrowserJourneys.push("retained parent control drives lookup before and after component recreation");

unitNames.push(...["task-name cancels earlier response when input changes", "work-type cancels earlier response when input changes", "disabling work-type clears all selected values", "task-name reports request failure and can search again", "task-name reuses an existing parent control on recreation", "task-name handles synchronous malformed cache and recovers on next input", "task-name handles synchronous storage exception and recovers on next input", "work-type default lookup reports error and recovers", "work-type cached-service lookup reports error and recovers", "task-name reports malformed task payload and accepts a later valid response"]);
addedBrowserJourneys.push(...["task-name lookup rejects an old response after input changes", "work-type lookup rejects an old response after input changes", "task-name shows no-results only after an empty successful response", "task-name reports a service failure and recovers on later input", "work-type parent initializes disabled without an Angular error", "task-name retained parent control emits after recreation", "default task-name instances receive unique ids while work-type retains legacy IDs", "task-name exposes its hint as an accessible description", "task-name descriptions follow rendered group errors and hints", "task-name exposes the existing submitted control invalid state", "task-name accessible name follows the selected language", "task-name reports a malformed response and accepts a later valid result", "work-type default lookup reports error and recovers", "work-type cached-service lookup reports error and recovers"]);
packageIds.push(...["package.task-lookups-behavior", "package.find-task-name-graph", "package.search-work-type-graph", "package.find-work-type-graph"]);

unitNames.push("task-name retries incompatible cached results without modifying shared cache");

unitNames.push("task-name cancels an active request when its service changes");

unitNames.push("task-name retries corrupt cache without writing on a failed uncached request");

addedBrowserJourneys.push('standalone work-type search has an accessible name', 'standalone work-type search preserves an external label', 'standalone work-type fallback follows the selected language', 'parent work-type search uses its configured and translated title');
addedBrowserJourneys.push(...["task-name ignores stale success after the service changes", "task-name ignores stale error after the service changes"]);

unitNames.push(...["task-name preserves null event and selected task object contract", "work-type multi-selection excludes selected keys but single mode preserves results", "work-type parent maps services and adds or removes unique selections", "work-type parent single selection and submit respect subscription lifecycle"]);

unitNames.push(...["task-name uses the cached result for an unaffected service after incompatible data", "task-name setting the same service preserves an active lookup", "uncached task-name request uses the same endpoint and leaves storage untouched"]);

packageIds.push('package.node-only-peer-install', 'package.angular-20_3_31-cohort-build', 'package.strict-node-node-types', 'package.strict-node-server-types', 'package.strict-node-auth-types', 'package.strict-node-session-types');
addedBrowserJourneys.push(
  'CSP enforcement runs nonce scripts and styles while blocking unapproved inline code',
  'CSP report-only emits its header and allows the identical unapproved script to execute',
  'CSP reload receives a new nonce matching the served script',
);
packageIds.push('package.node-security-optional-peer', 'package.strict-node-security-types',
  'package.node-security-consumer-contracts', 'package.node-security-nonce-fault', 'package.node-security-header-fault',
  'package.node-security-merge-fault', 'package.node-security-restored', 'package.node-security-browser-denied');
packageIds.push('package.strict-node-logging-types', 'package.node-logging-isolation', 'package.node-logging-loading-fault', 'package.helmet-8_1_0-cohort', 'package.helmet-8_2_0-cohort');
packageIds.push('package.translation-counterpart-artifact', 'package.translation-counterpart-browser', 'package.translation-counterpart-types', 'package.translation-counterpart-identity', 'package.translation-counterpart-identity-fault');
packageIds.push('package.selected-case-behavior', 'package.share-case-behavior', 'package.selected-case-graph', 'package.share-case-graph');
addedBrowserJourneys.push('selected case removal can be cancelled and reflected in confirmation',
  'selected case accordion references its own content', 'selected case accordion can be operated with the keyboard',
  'selected case controls have no automated accessibility violations', 'sharing requires a change and adds a selected user',
  'sharing can remove a selected existing user from all cases', 'sharing user lookup has its visible label and accessible description',
  'sharing cannot add a person before an autocomplete selection', 'selected cases keep user identifiers unique across multiple cases');
const expectedContracts = addedBrowserJourneys.length + Object.values(addedLaneNames).reduce((sum, names) => sum + names.length, 0) + unitNames.length + nodeNames.length + i18nNames.length + i18nJourneys.length + dueDateJourneys.length + accessibilityJourneys.length + sessionDialogJourneys.length + primitiveJourneys.length + cacheJourneys.length + validationJourneys.length + packageIds.length + 1 + contractInventory.nodeServerUnit.required.length;

function nativeTap(names) {
  return `TAP version 13\n${names.map((name, index) => `ok ${index + 1} - ${name}`).join('\n')}\n1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n`;
}

function nativeJasmine() {
  return {
    schemaVersion: 1, jasmineVersion, complete: true, browserErrors: [],
    events: [
      { type: 'jasmineStarted', result: { totalSpecsDefined: i18nNames.length } },
      ...i18nNames.map((fullName, index) => ({ type: 'specDone', result: {
        id: `spec${index}`, fullName, status: 'passed', failedExpectations: [], deprecationWarnings: []
      } })),
      { type: 'suiteDone', result: { id: 'suite0', fullName: 'fixture suite', status: 'passed', failedExpectations: [], deprecationWarnings: [] } },
      { type: 'jasmineDone', result: { overallStatus: 'passed', failedExpectations: [], deprecationWarnings: [] } }
    ]
  };
}

function nativeJest() {
  const suites = new Map();
  for (const id of contractInventory.nodeServerUnit.required) {
    const split = id.indexOf(' ');
    const file = id.slice(0, split), fullName = id.slice(split + 1);
    if (!suites.has(file)) suites.set(file, []);
    suites.get(file).push({ ancestorTitles: [], duration: 1, failing: false, failureDetails: [], failureMessages: [], fullName,
      invocations: 1, location: null, numPassingAsserts: 1, retryMessages: [], retryReasons: [], status: 'passed', title: fullName, startAt: 1 });
  }
  const count = contractInventory.nodeServerUnit.required.length;
  return {
    numFailedTestSuites: 0, numFailedTests: 0, numPassedTestSuites: suites.size, numPassedTests: count,
    numPendingTestSuites: 0, numPendingTests: 0, numRuntimeErrorTestSuites: 0, numTodoTests: 0,
    numTotalTestSuites: suites.size, numTotalTests: count, openHandles: [], startTime: 1, success: true, wasInterrupted: false,
    snapshot: { added: 0, didUpdate: false, failure: false, filesAdded: 0, filesRemoved: 0, filesRemovedList: [], filesUnmatched: 0,
      filesUpdated: 0, matched: 0, total: 0, unchecked: 0, uncheckedKeysByFile: [], unmatched: 0, updated: 0 },
    testResults: [...suites].map(([file, assertionResults]) => ({ assertionResults, endTime: 2, message: '',
      name: `/ci/source/${file}`, startTime: 1, status: 'passed', summary: '' })),
  };
}

/** @returns {Record<string, any>} */
function reports() {
  return {
    'validation.tap': nativeTap(unitNames),
    'ref-data.tap': nativeTap(addedLaneNames.refDataUnit),
    'locations.tap': nativeTap(addedLaneNames.locationUnit),
    'window.tap': nativeTap(addedLaneNames.windowUnit),
    'cookie.tap': nativeTap(addedLaneNames.cookieUnit),
    'feature-toggle.tap': nativeTap(addedLaneNames.featureToggleUnit),
    'roles.tap': nativeTap(addedLaneNames.roleUnit),
    'node.tap': nativeTap(nodeNames),
    'node-server.json': nativeJest(),
    'i18n/jasmine.json': nativeJasmine(),
    'browser.json': { errors: [], suites: [{ specs: [journey, ...validationJourneys, ...i18nJourneys, ...dueDateJourneys, ...accessibilityJourneys, ...sessionDialogJourneys, ...primitiveJourneys, ...addedBrowserJourneys].map((title) => ({ title, tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] })) }] },
    'cache-upgrade-report.json': { errors: [], suites: [{ specs: cacheJourneys.map((title) => ({ title, tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] })) }] },
    'package.json': { schemaVersion: 1, package: { sha256: createHash('sha256').update(candidate).digest('hex'), ...identity, dirty: false, translationCounterpart: counterpartProof() }, tests: packageIds.map((id) => ({ id, status: 'passed' })) },
  };
}

function checkFixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'core-contract-gate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'test-results'));
  for (const [file, report] of Object.entries(files)) {
    mkdirSync(dirname(join(root, 'test-results', file)), { recursive: true });
    writeFileSync(join(root, 'test-results', file), typeof report === 'string' ? report : JSON.stringify(report));
  }
  mkdirSync(join(root, 'test-results/package-evidence'), { recursive: true });
  writeFileSync(join(root, 'test-results/package-evidence/candidate.tgz'), candidate);
  mkdirSync(dirname(join(root, counterpartArchive)), { recursive: true });
  writeFileSync(join(root, counterpartArchive), counterpart);
  const proof = files['package.json']?.package?.translationCounterpart;
  if (proof) writeFileSync(join(root, counterpartEvidence), JSON.stringify(proof));
  mkdirSync(join(root, 'test-results/lane-provenance'));
  writeFileSync(join(root, 'test-results/lane-provenance/run.json'), JSON.stringify(identity));
  for (const [lane, config] of Object.entries(contractInventory)) {
    const name = config.report.replace(/^test-results\//, '');
    if (Object.hasOwn(files, name)) {
      const raw = readFileSync(join(root, config.report));
      writeFileSync(join(root, 'test-results/lane-provenance', `${lane}.json`), JSON.stringify(makeLaneReceipt(lane, identity, raw, true)));
    }
  }
  const check = (expected = identity) => checkContracts(root, expected);
  check.root = root;
  return check;
}

test('accepts all independently required successful contracts', (t) => {
  assert.equal(checkFixture(t, reports())(), expectedContracts);
});

for (const file of ['validation.tap', 'browser.json', 'cache-upgrade-report.json', 'package.json', 'node.tap', 'i18n/jasmine.json']) {
  test(`rejects missing ${file} even when other reports pass`, (t) => {
    const files = reports();
    delete files[file];
    assert.throws(checkFixture(t, files), /ENOENT|report/i);
  });
  test(`rejects empty ${file}`, (t) => {
    const files = reports();
    files[file] = '';
    assert.throws(checkFixture(t, files));
  });
}

for (const name of unitNames) {
  test(`rejects a filtered-out unit contract: ${name}`, (t) => {
    const files = reports();
    files['validation.tap'] = nativeTap(unitNames.filter((value) => value !== name));
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const outcome of ['not ok 1', 'ok 1 # SKIP', 'ok 1 # TODO']) {
  test(`rejects unsuccessful native TAP outcome ${outcome}`, (t) => {
    const files = reports();
    files['validation.tap'] = files['validation.tap'].replace(`ok 1 - ${unitNames[0]}`, outcome.startsWith('not') ? `not ok 1 - ${unitNames[0]}` : `ok 1 - ${unitNames[0]} ${outcome.slice(5)}`);
    assert.throws(checkFixture(t, files), /pass|skip|todo|contract/i);
  });
}

test('rejects truncated TAP without a complete plan', (t) => {
  const files = reports();
  files['validation.tap'] = files['validation.tap'].replace(`1..${unitNames.length}\n`, '');
  assert.throws(checkFixture(t, files), /plan|TAP/i);
});

test('rejects duplicate native outcomes', (t) => {
  const files = reports();
  files['validation.tap'] = nativeTap([...unitNames, unitNames[0]]);
  assert.throws(checkFixture(t, files), /duplicate|once/i);
});

for (const status of ['failed', 'skipped', 'timedOut', 'interrupted']) {
  test(`rejects browser result ${status}`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs[0].tests[0].results[0].status = status;
    assert.throws(checkFixture(t, files), /pass|contract/i);
  });
}

for (const replacement of [[], [{ title: 'a different passing journey', tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] }]]) {
  test('rejects an excluded browser journey despite an otherwise green report', (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs = replacement;
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const title of i18nJourneys.slice(-3)) {
  test(`rejects a missing ${title} result`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs = files['browser.json'].suites[0].specs.filter((spec) => spec.title !== title);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const title of accessibilityJourneys) {
  test(`rejects a missing accessibility browser contract: ${title}`, (t) => {
    const data = reports();
    data['browser.json'].suites[0].specs = data['browser.json'].suites[0].specs.filter((spec) => spec.title !== title);
    assert.throws(checkFixture(t, data), /missing|required/i);
  });
}

for (const title of sessionDialogJourneys) {
  test(`rejects a missing session dialog browser contract: ${title}`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs = files['browser.json'].suites[0].specs.filter((spec) => spec.title !== title);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const title of dueDateJourneys) {
  test(`rejects a missing due-date browser contract: ${title}`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs = files['browser.json'].suites[0].specs.filter((spec) => spec.title !== title);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const title of validationJourneys) {
  test(`rejects a missing validation browser contract: ${title}`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs = files['browser.json'].suites[0].specs.filter((spec) => spec.title !== title);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
  test(`rejects a skipped validation browser contract: ${title}`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs.find((spec) => spec.title === title).tests[0].results[0].status = 'skipped';
    assert.throws(checkFixture(t, files), /pass|contract/i);
  });
}

test('rejects missing contact keyboard and accessibility evidence', (t) => {
  const files = reports();
  files['browser.json'].suites[0].specs = files['browser.json'].suites[0].specs.filter((spec) => spec.title !== 'contact links are keyboard reachable and remain accessible through data changes');
  assert.throws(checkFixture(t, files), /contact links are keyboard reachable/);
});

test('rejects expected browser failure and empty attempts', (t) => {
  for (const change of [{ expectedStatus: 'failed' }, { results: [] }]) {
    const files = reports();
    Object.assign(files['browser.json'].suites[0].specs[0].tests[0], change);
    assert.throws(checkFixture(t, files), /pass|contract/i);
  }
});

test('rejects browser global errors', (t) => {
  const files = reports();
  files['browser.json'].errors.push({ message: 'worker crashed' });
  assert.throws(checkFixture(t, files), /error/i);
});

for (const id of packageIds) {
  test(`rejects missing package contract ${id}`, (t) => {
    const files = reports();
    files['package.json'].tests = files['package.json'].tests.filter((entry) => entry.id !== id);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

test('rejects unsuccessful package checks, empty checks, and invalid artifact hashes', (t) => {
  for (const change of [
    { tests: [{ id: packageIds[0], status: 'failed' }] },
    { tests: [] },
    { package: { sha256: '' } },
    { schemaVersion: 2 },
  ]) {
    const files = reports();
    Object.assign(files['package.json'], change);
    assert.throws(checkFixture(t, files));
  }
});

for (const file of ['browser.json', 'package.json']) {
  test(`rejects malformed ${file}`, (t) => {
    const files = reports();
    files[file] = '{broken';
    assert.throws(checkFixture(t, files));
  });
}

test('accepts a real native node:test TAP stream', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'core-native-tap-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'native.test.mjs');
  writeFileSync(file, `import { test } from 'node:test';\nfor (const name of ${JSON.stringify(unitNames)}) test(name, () => {});`);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  const files = reports();
  files['validation.tap'] = result.stdout;
  assert.equal(checkFixture(t, files)(), expectedContracts);
});

for (const file of ['browser.json', 'package.json']) {
  test(`rejects duplicate required outcomes in ${file}`, (t) => {
    const files = reports();
    if (file === 'browser.json') files[file].suites[0].specs.push(files[file].suites[0].specs[0]);
    else files[file].tests.push(files[file].tests[0]);
    assert.throws(checkFixture(t, files), /duplicate|once/i);
  });
}

test('rejects contradictory nonzero native TAP failure summaries', (t) => {
  for (const summary of ['fail', 'cancelled', 'skipped', 'todo']) {
    const files = reports();
    files['validation.tap'] += `# ${summary} 1\n`;
    assert.throws(checkFixture(t, files), /pass|TAP|report/i);
  }
});

test('rejects a passing same-title journey from the wrong project', (t) => {
  const files = reports();
  files['browser.json'].suites[0].specs[0].tests[0].projectName = 'firefox';
  assert.throws(checkFixture(t, files), /missing|required/i);
});

test('rejects an absent or empty browser project name', (t) => {
  for (const projectName of [undefined, '']) {
    const files = reports();
    files['browser.json'].suites[0].specs[0].tests[0].projectName = projectName;
    assert.throws(checkFixture(t, files), /contract|missing|required/i);
  }
});

for (const name of nodeNames) {
  test(`rejects a filtered-out Node contract: ${name}`, (t) => {
    const files = reports();
    files['node.tap'] = nativeTap(nodeNames.filter((value) => value !== name));
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const outcome of ['not ok', 'SKIP', 'TODO']) {
  test(`rejects a ${outcome} native Node outcome`, (t) => {
    const files = reports();
    files['node.tap'] = files['node.tap'].replace(`ok 1 - ${nodeNames[0]}`,
      outcome === 'not ok' ? `not ok 1 - ${nodeNames[0]}` : `ok 1 - ${nodeNames[0]} # ${outcome}`);
    assert.throws(checkFixture(t, files), /pass|TAP|contract/i);
  });
}

test('rejects inconsistent or interrupted native Node reports', (t) => {
  for (const change of [
    (tap) => tap.replace(`1..${nodeNames.length}\n`, ''),
    (tap) => tap.replace(`1..${nodeNames.length}`, `1..${nodeNames.length + 1}`),
    (tap) => tap.replace(`# tests ${nodeNames.length}`, `# tests ${nodeNames.length + 1}`),
    (tap) => tap.replace(`# pass ${nodeNames.length}`, `# pass ${nodeNames.length - 1}`),
    (tap) => tap.replace('# fail 0', '# fail 1'),
    (tap) => tap.replace('# cancelled 0', '# cancelled 1'),
    (tap) => tap.replace('# skipped 0', '# skipped 1'),
    (tap) => tap.replace('# todo 0', '# todo 1'),
    (tap) => tap.replace('# suites 0', '# suites 1'),
    (tap) => tap.replace('# fail 0\n', ''),
    (tap) => `${tap}# pass ${nodeNames.length}\n`,
    (tap) => `${tap}Bail out! interrupted\n`,
    (tap) => tap.replace('ok 2 - ', 'ok 1 - '),
    (tap) => tap.replace('ok 2 - ', '    ok 2 - '),
  ]) {
    const files = reports();
    files['node.tap'] = change(files['node.tap']);
    assert.throws(checkFixture(t, files), /TAP|pass|report|missing|required/i);
  }
});

test('rejects duplicate native Node contracts even with consistent totals', (t) => {
  const files = reports();
  files['node.tap'] = nativeTap([...nodeNames, nodeNames[0]]);
  assert.throws(checkFixture(t, files), /duplicate|once/i);
});

test('accepts the real native Node report without transforming it', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'core-native-node-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'native.test.mjs');
  writeFileSync(file, `import { test } from 'node:test';\nfor (const name of ${JSON.stringify(nodeNames)}) test(name, () => {});`);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  const files = reports();
  files['node.tap'] = result.stdout;
  assert.equal(checkFixture(t, files)(), expectedContracts);
});

for (const status of ['failed', 'pending', 'excluded', 'disabled', 'unknown']) {
  test(`rejects a ${status} native Jasmine outcome`, (t) => {
    const files = reports();
    files['i18n/jasmine.json'].events[1].result.status = status;
    assert.throws(checkFixture(t, files), /pass|Jasmine|report/i);
  });
}

test('rejects incomplete, contradictory, browser, global and suite failures', (t) => {
  for (const mutate of [
    report => report.complete = false,
    report => report.browserErrors.push('page error'),
    report => report.driverError = 'driver failed',
    report => report.events.shift(),
    report => report.events.pop(),
    report => report.events[0].result.totalSpecsDefined += 1,
    report => report.events.at(-1).result.overallStatus = 'failed',
    report => report.events.at(-1).result.failedExpectations.push({ message: 'global afterAll failed' }),
    report => report.events.at(-2).result.failedExpectations.push({ message: 'suite afterAll failed' }),
    report => report.events.at(-2).result.status = 'failed',
    report => report.events[1].result.failedExpectations.push({ message: 'spec failed despite passed status' }),
    report => report.events[1].result.deprecationWarnings.push({ message: 'deprecated API' })
  ]) {
    const files = reports(); mutate(files['i18n/jasmine.json']);
    assert.throws(checkFixture(t, files), /Jasmine|report/i);
  }
});

test('rejects each omitted i18n contract even when native totals agree', (t) => {
  for (const name of i18nNames) {
    const files = reports(); const report = files['i18n/jasmine.json'];
    report.events = report.events.filter(event => event.type !== 'specDone' || event.result.fullName !== name);
    report.events[0].result.totalSpecsDefined -= 1;
    assert.throws(checkFixture(t, files), /missing|required|Jasmine|report/i);
  }
});

for (const name of cacheJourneys) {
  test(`rejects a filtered-out cache upgrade contract: ${name}`, (t) => {
    const files = reports();
    files['cache-upgrade-report.json'].suites[0].specs = files['cache-upgrade-report.json'].suites[0].specs.filter((spec) => spec.title !== name);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}


test('rejects malformed JSON, unknown events, duplicate outcomes and wrong runner identity', (t) => {
  for (const mutate of [
    report => report.events[1].type = 'unknown',
    report => report.jasmineVersion = 'wrong-version',
    report => { report.events.splice(2, 0, structuredClone(report.events[1])); report.events[0].result.totalSpecsDefined += 1; },
    report => report.events.push(structuredClone(report.events.at(-1))),
    report => report.events.unshift(structuredClone(report.events[0]))
  ]) {
    const files = reports(); mutate(files['i18n/jasmine.json']); assert.throws(checkFixture(t, files));
  }
  for (const malformed of ['<!-- specDone passed -->', '{"schemaVersion":1,', '{}', 'null', '[]']) {
    const files = reports(); files['i18n/jasmine.json'] = malformed; assert.throws(checkFixture(t, files));
  }
});

test('rejects missing or altered candidate and missing identity', (t) => {
  for (const mutate of [
    files => delete files['package.json'].package.sourceSha,
    files => files['package.json'].package.sha256 = 'b'.repeat(64),
    files => files['package.json'].package.dirty = 'false',
  ]) {
    const files = reports(); mutate(files);
    assert.throws(checkFixture(t, files));
  }
});

test('rejects a replay with absent or different expected identity', (t) => {
  const check = checkFixture(t, reports());
  assert.throws(() => checkContracts(check.root));
  for (const expected of [null, {...identity, sourceSha: 'b'.repeat(40)}, {...identity, runId: 'other'}, {...identity, attempt: '2'}]) {
    assert.throws(() => check(expected));
  }
});


test('rejects missing and altered candidate bytes', (t) => {
  for (const bytes of [null, 'altered']) {
    const check = checkFixture(t, reports());
    const path = join(check.root, 'test-results/package-evidence/candidate.tgz');
    if (bytes === null) rmSync(path); else writeFileSync(path, bytes);
    assert.throws(check);
  }
});

test('rejects missing or altered counterpart archive after its package receipt is created', t => {
  for (const bytes of [null, 'changed counterpart']) {
    const check = checkFixture(t, reports());
    assert.equal(check(), expectedContracts);
    const file = join(check.root, counterpartArchive);
    if (bytes === null) rmSync(file); else writeFileSync(file, bytes);
    assert.throws(check, /counterpart|ENOENT/i);
  }
});

test('rejects missing or changed counterpart helper evidence after its package receipt is created', t => {
  for (const changed of [null, { ...counterpartProof(), sourceSha: '0'.repeat(40) }]) {
    const check = checkFixture(t, reports());
    assert.equal(check(), expectedContracts);
    const file = join(check.root, counterpartEvidence);
    if (changed === null) rmSync(file); else writeFileSync(file, JSON.stringify(changed));
    assert.throws(check, /counterpart|ENOENT/i);
  }
});

const counterpartMutations = {
  'missing proof': pkg => { delete pkg.translationCounterpart; },
  'wrong schema': pkg => { pkg.translationCounterpart.schemaVersion = 2; },
  'wrong repository': pkg => { pkg.translationCounterpart.repository = 'https://example.invalid/other.git'; },
  'wrong source': pkg => { pkg.translationCounterpart.sourceSha = '0'.repeat(40); },
  'wrong profile hash': pkg => { pkg.translationCounterpart.profileSha256 = '0'.repeat(64); },
  'missing source input': pkg => { delete pkg.translationCounterpart.sourceFiles['scripts/pack-core-facade.mjs']; },
  'wrong source input hash': pkg => { pkg.translationCounterpart.sourceFiles['projects/rpx-xui-translation-core-facade/index.mjs'] = '0'.repeat(64); },
  'wrong packed input hash': pkg => { pkg.translationCounterpart.packedFiles['package/index.mjs'] = '0'.repeat(64); },
  'extra packed input': pkg => { pkg.translationCounterpart.packedFiles['package/extra.mjs'] = '0'.repeat(64); },
  'malformed archive hash': pkg => { pkg.translationCounterpart.sha256 = 'not-a-hash'; },
};
for (const [name, mutate] of Object.entries(counterpartMutations)) {
  test(`rejects counterpart ${name} even with matching native report receipts`, t => {
    const files = reports();
    mutate(files['package.json'].package);
    assert.throws(checkFixture(t, files), /counterpart/i);
  });
}

test('replay CLI requires a complete unique argument set', (t) => {
  const check = checkFixture(t, reports());
  const cli = new URL('../scripts/check-contracts.mjs', import.meta.url).pathname;
  const args = ['--report-root', check.root, '--source-sha', identity.sourceSha, '--run-id', identity.runId, '--attempt', identity.attempt];
  assert.equal(spawnSync(process.execPath, [cli, ...args]).status, 0);
  for (const invalid of [args.slice(0, -2), [...args, '--attempt', '1'], [...args, '--unknown', 'x'], [...args.slice(0, -1), '2']]) {
    assert.notEqual(spawnSync(process.execPath, [cli, ...invalid]).status, 0);
  }
});

test('extra passing Jasmine cases are allowed while required coverage remains mandatory', (t) => {
  const files = reports(); const report = files['i18n/jasmine.json'];
  report.events.splice(-2, 0, { type: 'specDone', result: { id: 'extra', fullName: 'additional real test', status: 'passed', failedExpectations: [], deprecationWarnings: [] } });
  report.events[0].result.totalSpecsDefined += 1;
  assert.equal(checkFixture(t, files)(), expectedContracts);
  report.events.find(event => event.result.id === 'extra').result.status = 'failed';
  assert.throws(checkFixture(t, files), /Jasmine|report/i);
});

test('native Jasmine metadata cannot inject fake outcome names', (t) => {
  const files = reports();
  files['i18n/jasmine.json'].events[1].result.description = '<testcase name="fake"/><script>specDone</script>';
  assert.equal(checkFixture(t, files)(), expectedContracts);
});

test('identity uses complete CI context and rejects a partial context', () => {
  const module = new URL('../scripts/evidence-identity.mjs', import.meta.url).href;
  const script = `import { currentIdentity } from ${JSON.stringify(module)}; console.log(JSON.stringify(currentIdentity(process.cwd())));`;
  const env = { ...process.env, GITHUB_SHA: identity.sourceSha, GITHUB_RUN_ID: identity.runId, GITHUB_RUN_ATTEMPT: identity.attempt };
  const complete = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env, encoding: 'utf8' });
  assert.equal(complete.status, 0, complete.stderr);
  const value = JSON.parse(complete.stdout);
  assert.deepEqual({ sourceSha: value.sourceSha, runId: value.runId, attempt: value.attempt }, { sourceSha: identity.sourceSha, runId: identity.runId, attempt: identity.attempt });
  assert.equal(typeof value.dirty, 'boolean');
  delete env.GITHUB_RUN_ATTEMPT;
  assert.notEqual(spawnSync(process.execPath, ['--input-type=module', '-e', script], { env }).status, 0);
});

test('the contract gate rejects report bytes rebound from another run', (t) => {
  const check = checkFixture(t, reports());
  assert.equal(check(), expectedContracts);
  const report = join(check.root, 'test-results/node.tap');
  const original = readFileSync(report, 'utf8');
  writeFileSync(report, original + '# another run\n');
  assert.throws(check, /Unbound nodeUnit/);
  writeFileSync(report, original);
  assert.equal(check(), expectedContracts);
  const runPath = join(check.root, 'test-results/lane-provenance/run.json');
  writeFileSync(runPath, JSON.stringify({ ...identity, invocationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }));
  assert.throws(check, /Unbound/);
});

for (const [lane, names] of Object.entries(addedLaneNames)) {
  test(`missing ${lane} case fails the required evidence gate`, t => {
    const files = reports();
    const report = contractInventory[lane].report.replace(/^test-results\//, '');
    files[report] = nativeTap(names.slice(1));
    assert.throws(() => checkFixture(t, files)(), /Missing|required|contract/i);
  });
}

for (const title of addedBrowserJourneys) {
  test(`missing browser contract ${title} fails the required evidence gate`, t => {
    const files = reports();
    files['browser.json'].suites[0].specs = files['browser.json'].suites[0].specs.filter(spec => spec.title !== title);
    assert.throws(() => checkFixture(t, files)(), /Missing|required|contract/i);
  });
}

test('missing migrated Jest case cannot satisfy the required feature gate', t => {
  const files = reports(), report = files['node-server.json'];
  report.testResults[0].assertionResults.pop();
  report.numPassedTests -= 1;
  report.numTotalTests -= 1;
  assert.throws(checkFixture(t, files), /nodeServerUnit required contract/);
});

test('Jest receipt is required and changed report bytes cannot reuse it', t => {
  const check = checkFixture(t, reports());
  assert.equal(check(), expectedContracts);
  const file = join(check.root, 'test-results/node-server.json');
  writeFileSync(file, readFileSync(file, 'utf8') + '\n');
  assert.throws(check, /Unbound nodeServerUnit/);
  rmSync(join(check.root, 'test-results/lane-provenance/nodeServerUnit.json'));
  assert.throws(check, /nodeServerUnit\.json/);
});

for (const status of ['pending', 'todo', 'failed', 'disabled']) {
  test(`a ${status} migrated Jest assertion cannot leave a verified feature report`, t => {
    const files = reports();
    files['node-server.json'].testResults[0].assertionResults[0].status = status;
    assert.throws(checkFixture(t, files), /Jest/);
  });
}

test('new server cases require inventory and feature review before the gate can pass', t => {
  const files = reports(), report = files['node-server.json'];
  const extra = structuredClone(report.testResults[0].assertionResults[0]);
  extra.ancestorTitles = [];
  extra.title = extra.fullName = 'new unreviewed server case';
  report.testResults[0].assertionResults.push(extra);
  report.numPassedTests += 1;
  report.numTotalTests += 1;
  assert.throws(checkFixture(t, files), /nodeServerUnit unregistered contract/);
});

test('new package cases require inventory and feature review before the gate can pass', t => {
  const files = reports();
  files['package.json'].tests.push({ id: 'package.new-unreviewed-case', status: 'passed' });
  assert.throws(checkFixture(t, files), /package unregistered contract/);
});
