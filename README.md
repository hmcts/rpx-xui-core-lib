# RPX XUI Core Library

Repository foundation for consolidating four EXUI libraries into one npm package, with focused browser entry points and a separate Node entry.

**Status:** private Angular 20 package foundation. The first migrated capability is the real checkbox validator behind `@hmcts/rpx-xui-core-lib/forms/validation`; a private form gallery exercises that built output. This is not application adoption, a supported consolidation release, or complete package-feasibility evidence. Library package publication remains disabled with `private: true` in both workspace and staged package.

## Scope

| Source repository | Intended responsibility |
| --- | --- |
| [rpx-xui-common-lib](https://github.com/hmcts/rpx-xui-common-lib) | Shared UI and browser support |
| [ccd-case-ui-toolkit](https://github.com/hmcts/ccd-case-ui-toolkit) | Case lists, forms and rendering |
| [rpx-xui-translation](https://github.com/hmcts/rpx-xui-translation) | Translation |
| [rpx-xui-node-lib](https://github.com/hmcts/rpx-xui-node-lib) | Server support |

Media Viewer and payment integrations remain external. The repository configuration follows common-lib; its aggregate runtime module is not the target architecture.

## Develop locally

For agent-assisted local startup, checks and failure diagnosis, ask your repository-aware agent to read [the core local test skill](.agents/skills/core-local-test/SKILL.md). It uses the same repository commands and reports; it does not replace human review or remote CI.

Use Node **24.22.2** and Yarn **4.18.1** for the core integration cohort. Yarn is checked in so setup does not require a global Yarn installation or Corepack.

```sh
nvm use
node .yarn/releases/yarn-4.18.1.cjs install --immutable
yarn playwright install chromium
yarn test:all
yarn start
```

`test:all` resets generated reports, builds the package, runs lint and type checks, runs the report-gate regression tests, validator and native Node contracts, verifies the installed tarball, builds the gallery, runs the complete local browser suite, then compares executed outcomes with the independent inventory in `tests/contracts.json` and opens both generated Odhín report lanes in Chromium at mobile and desktop widths. The required CI `build` job runs this same fail-fast command. Missing reports, filtered-out required tests, skipped scenarios and failures cannot satisfy the contract gate. Reports are `test-results/validation.tap`, `test-results/node.tap`, `test-results/package.json`, `test-results/browser.json`, `test-results/browser-junit.xml` and `playwright-report/index.html`; browser artifacts stay below `test-results/browser/` so browser cleanup cannot remove earlier unit/package reports.

`start` lets the official library watcher complete its initial build before serving the private gallery at [localhost:4307](http://127.0.0.1:4307). Source/template/style edits rebuild, compilation errors appear in the terminal, and corrected source resumes compilation. Stop with Ctrl+C. The gallery and direct tests use the built package's public `@hmcts/rpx-xui-core-lib/forms/validation` import through an explicit local development link, without source aliases. The gallery excludes that linked package from prebundling so library edits reach the browser. Avoid placing this checkout below an unrelated Yarn Plug'n'Play workspace, whose ancestor manifest can override esbuild resolution.

Open the [translation gallery](http://127.0.0.1:4307/translation) to try Welsh translation and the service-failure scenario. Its development server returns fictional local responses; it does not contact a translation service. The standalone browser checks use those responses without intercepting requests. This local endpoint is not included in the library package or production gallery build.

For individual checks, run `yarn build` before `yarn lint`, `yarn test`, `yarn test:package` or `yarn build:host`. Local checks require macOS or Linux with `/usr/bin/git` and Python 3. Lint covers ESLint, library TypeScript, strict validation-source and gallery/template checking and JavaScript scripts/config/tests. Pure validator cases use native `node:test` against real Angular FormGroups; no custom Angular runner bridge is involved. Browser coverage uses native Chromium keyboard interactions and real form values, validity and submitted errors, with retries disabled.

`test:package` packs the actual built output, hashes the tarball, installs it into a fresh external consumer and checks the public import under strict legacy `moduleResolution: node` and modern `bundler` with library checks enabled. It executes the real validator on installed bytes, proves an omitted secondary declaration fails legacy resolution and verifies restoration. This narrow package proof does not establish the complete future dependency manifest or actual application adoption.

## Replaying contract evidence

`check:contracts` validates native Node TAP and complete Jasmine event receipts, rejecting browser, suite and global failures, verifies the actual `test-results/package-evidence/candidate.tgz` digest, and compares the package report with independently supplied source/run identity. The package report records `sourceSha`, `runId`, `attempt` and whether the source tree was dirty. CI uses `GITHUB_SHA`, `GITHUB_RUN_ID` and `GITHUB_RUN_ATTEMPT`; a local run uses the current commit and `local`/`1`. Keep the local diff with any dirty-tree evidence.

For downloaded evidence, use the complete replay argument set, taking the expected values from the trusted workflow run rather than its report:

```sh
yarn check:contracts --report-root /path/to/extracted-evidence --source-sha <tested-commit> --run-id <workflow-run-id> --attempt <run-attempt>
```

Missing, partial or mismatched identity and missing or altered candidate bytes fail the gate. Preserve `test-results/` intact, including the candidate and native reports; `test:all` deletes prior reports. Historical receipts without identity fields need the matching historical gate. Digest consistency does not authenticate the source or prove independently copied reports belong to one run; verify the workflow/artifact identity separately.

## Package layout and initial build cohort

Official ng-packagr emits a structural metadata-only primary entry point plus the implemented `forms/validation`, `i18n`, `ui/contact-details`, `ui/loading-spinner`, `case/models` and `case/reference` secondary entries. The root primary exists because Angular Package Format requires it; its source exports no runtime capability and imports no secondary implementation. It must never become an aggregate root module. Native packaging emits physical `forms/validation/index.d.ts` declarations for legacy consumers and an independent validation FESM. No primary-to-secondary export rewriting or old `/validation` alias is used.

The APF build contract is Angular/compiler-cli **20.3.35**, ng-packagr **20.3.2**, TypeScript **5.9.3**, and Node **24.22.2**, with the gallery using Angular CLI/build **20.3.42** and framework **20.3.35**. Exact Angular peers describe this exercised cohort, not a promise of broad version support. Further supported cohorts need their own installed fixtures. The gallery keeps strict TypeScript/template checks. The library build retains `strict: false`, `noImplicitAny: true`, `skipLibCheck: false` for the remaining translation migration. Lint separately checks validation source under full strictness using `projects/core-lib/forms/tsconfig.strict.json`; Node source, consumer fixtures and gallery templates are also strict. Translation class-initialisation diagnostics remain an explicit migration item.

The validator is derived from [rpx-xui-common-lib published revision f23288743831ef13a55b4348f757db74c1a189c8](https://github.com/hmcts/rpx-xui-common-lib/blob/f23288743831ef13a55b4348f757db74c1a189c8/projects/exui-common-lib/src/lib/gov-ui/validators/checkboxes-be-checked.validator.ts). The original source SHA-256 is `095a8cb877b637406efcb175b2d73775a199104c26e2142b307d18f7d94673c3`; core now narrows the generic Angular control at runtime and rejects a non-FormGroup with a clear error so its callback satisfies strict function variance. Its original MIT licence and 2019 Crown Copyright notice are retained at `forms/validation/LICENCE` in the distribution, alongside the core licence. The preserved behavior counts boolean `true` only, defaults to minimum one and returns `requireOneCheckboxToBeChecked`. Existing AO/common/MO source packages and production authority are unchanged.


The focused UI entries preserve the common library contact-details and loading-spinner selectors, models and translation labels. The spinner exposes changing text through a status region and respects reduced motion. The gallery routes `/contact` and `/spinner` exercise full, partial, translated and hidden states. Their original 2019 Crown Copyright licences are included in both the built and installed package.

`case/models` owns the shared Draft and CaseDetails classes; `case/reference` imports that same Draft class and preserves the toolkit case-reference pipe's formatting, draft detection and link handling. The `/case-reference` gallery and installed-package checks cover these contracts. Both case entries retain the original toolkit 2017 HMCTS licence. These slices do not establish application adoption or the complete case renderer.

## Node entry point

`@hmcts/rpx-xui-core-lib/node` exports `arrayPatternMatch`, `isStringPatternMatch`, `getUserSessionTimeout`, `hasKey` and `sortArray`, preserved from Node-lib 2.30.35 at `133bfdf4c82f0fb1885932845dba24174edd45d0`. They retain the existing regular-expression, ordering, mutation and object-identity contracts. Auth/session options and metadata are type-only exports; auth/session services and their constructed instances remain in Node-lib. `AUTH`, `OAUTH2`, `OIDC`, `SESSION` and `SECURITY_POLICY` preserve the legacy constant values without importing those services. `SECURITY_POLICY` is compatibility data; applications still own CSP application, origin restrictions and supported Helmet integration.

`yarn build` compiles the Node tree as CommonJS alongside the Angular output. The tarball includes its own `node/package.json` marker and declarations. `yarn test:node` runs the built-in Node test runner contracts for matching, timeout selection and utility behavior; the aggregate gate also requires their native TAP report. Package checks prove raw installed `require`, strict types, browser import rejection, and failure/restoration when the packed marker is removed or an authentication/session dependency is deliberately loaded. Browser/gallery watch does not watch Node source; run `yarn build` after Node edits.

## Translation preparation

`@hmcts/rpx-xui-core-lib/i18n` owns the published Translation 1.2.18 implementation (`c64cbe88f3f84a2d32ca9006f75c48a71a6dfc3b`), including its service/config classes, pipe, module and IndexedDB cache, with the later language-switch fix from source master `ca94b533c796a6f75c56c27dbf13a50b6feed0ed` and core fixes for overlapping request batches, arbitrary phrase dictionary keys, provider-owned work teardown, validated response/locale boundaries and cache-failure recovery. The MIT licence is preserved. Core runtime dependencies are Dexie 4.4.7 and Luxon 2.5.2. Dexie is aligned with the resolved published legacy cohort; the historical 4.4.4 alias is used only for cache migration tests. Luxon retains the published dependency contract rather than adopting the source workspace's Luxon 3 build dependency.

`yarn test:i18n` runs all 86 unchanged translation contracts with standalone Jasmine 5.13, Angular 20's stable application builder and real Playwright Chromium. The Angular 20 / Zone 0.15.1 cohort retains `zone.js/testing`; Jasmine 6/7 remove APIs that its Jasmine integration requires, so a future cohort upgrade is separate work. `yarn test:browser` also exercises the lazily loaded [translation gallery](http://127.0.0.1:4307/translation): locale persistence, real HTTP, IndexedDB cache reuse after reload, HTTP-error fallback, and a delayed response after switching language. The gallery uses built `/i18n` output; validation startup does not import it eagerly. Native Jasmine events (`jasmineStarted`, `specDone`, `suiteDone`, `jasmineDone`) are saved without status or name conversion at `test-results/i18n/jasmine.json`; they include suite/global failures and deprecation warnings. Playwright JUnit at `test-results/i18n/driver-junit.xml` reports the one browser driver, not the 86 Jasmine cases.

New `tests/i18n/**/*.spec.ts` files need explicit side-effect imports in `tests/i18n/main.ts`; the runner checks actual TypeScript import declarations, so comments and type-only imports cannot hide an unexecuted file. Extra passing cases are allowed, while the independent inventory keeps existing contracts mandatory.

For values that must remain literal, pass a separate literal map as the third argument to `getTranslationWithReplacements$`, for example `service.getTranslationWithReplacements$('Hello %NAME%', {}, { NAME: name })`. In templates use `phrase | rpxTranslate: null: undefined: { NAME: name }`. Literal values are inserted without translation or translation-cache storage and retain their exact whitespace. Existing string replacements retain their translation behaviour. A key cannot appear in both maps. Callers must still avoid passing personal data as the phrase itself or as a translatable replacement; changing this API does not automatically migrate existing consumers.

`yarn test:cache-upgrade` first rejects a controlled baseline source mismatch, then checks sequential cache reuse between published legacy translation, a historical Dexie 4.4.4 core baseline and the installed Dexie 4.4.7 candidate. It covers both directions, expired-row refresh and literal-value privacy after reload. The historical baseline must have the same core source as the candidate; receipts verify source and bundled versions. Run `yarn build` and `yarn test:package` first: the lane verifies and uses the tarball produced by that package check. It uses separate browser documents at the same origin and path; no-refetch observation is bounded to 75 ms after cached rendering. Reports and the package/source-map receipt are under `test-results/cache-upgrade-*`. This does not establish simultaneous provider identity, deployed application behaviour or release compatibility.

Translation input is a data boundary: send only approved static UI text to the configured service. Existing string replacements are themselves translated; do not assume they stay local. User and case values passed directly as phrases can also reach HTTP and persistent IndexedDB. Consumer owners must classify these values, choose an approved endpoint and decide cache lifetime before adoption. Browser storage is an optional cache, not confidential storage. Validated malformed responses fall back without caching; storage failures preserve usable output and log only fixed failure categories.

### Odhín browser reports

The browser and installed-package/cache lanes use common-lib’s patched Odhín 1.1.8 reporter and responsive presentation. Their reports are `test-results/odhin/browser/index.html` and `test-results/odhin/cache-upgrade/index.html`. These describe browser tests; native JSON, JUnit, unit-test and package evidence under `test-results/`, plus the Actions result, establish the full validation result. Reporter provenance is recorded in [tests/reporters/PROVENANCE.md](tests/reporters/PROVENANCE.md).

The existing native HTML, JSON and JUnit reports remain enabled by default. `PLAYWRIGHT_DEFAULT_REPORTER` changes the terminal reporter (`list` locally, `dot` in CI); `PLAYWRIGHT_REPORTERS=list,odhin` selects an explicit set for a standalone run. Use `PW_ODHIN_OUTPUT` to change the common output directory (each lane gets its own subdirectory), and `PW_ODHIN_RELEASE` to override the release label, which otherwise follows `package.json`. CI keeps complete passing and failing detail. Local runs default to lightweight passing-test detail; use `PW_ODHIN_LIGHTWEIGHT=false` for full detail or `true` for lightweight output. This does not change the responsive layout. Automatic serving and embedded assets/attachments are explicitly unsupported in the pruned reporter; use the HTTP preview command below.

After a normal build, `yarn test:browser` and `yarn test:cache-upgrade` generate the reports. Preview them with `python3 -m http.server 8091 --directory test-results/odhin`, then open [the browser report](http://127.0.0.1:8091/browser/index.html) or [the installed-package report](http://127.0.0.1:8091/cache-upgrade/index.html). `yarn test:reporters` exercises the actual patched reporter with passing and deliberately failing fixtures, verifies desktop/mobile rendering, and checks publication navigation and input validation; the deliberately failing fixture must be detected for this check to pass.

CI uploads native evidence and generated Odhín artifacts even when a test fails. The separate publishing workflow accepts only completed push/manual CI runs from this repository’s default branch. PRs, including forks, receive downloadable artifacts and cannot publish. Pages provides report-index, branch-history and exact-run links back to Actions evidence; an identical publisher retry can finish a failed deployment without overwriting an archived run.

Before enabling publication, repository owners must configure GitHub Pages to use **GitHub Actions**, allow the `github-pages` environment to deploy the default branch, and permit the workflow token to write the `odhin-reports` archive branch. Keep any required environment approval in place. These settings and remote publication are not changed by the local implementation. Report archives can contain screenshots, traces and failure logs; retain only approved synthetic data in these browser lanes and apply the repository’s access and retention policy to published evidence.

The packed fixture includes a local, private old-name package that only reexports `/i18n`, proving class/provider identity for that staged shape. It is not a released legacy facade or acceptance of existing Media Viewer/payment dependencies. Prefer coordinated direct external cutover where owners can supply compatible releases; retain a pure reexport facade for supported old-name callers. Real external graphs, cancellation/teardown and concurrency behavior, supported consumer adoption, releases and cache/provider continuity across those upgrades remain acceptance gates. No application should initialize an old implementation alongside core translation.

## Full package compatibility preparation

`tests/fixtures/compatibility/prospective-package.json` is the concrete eventual dependency/peer/type proposal for all four libraries. Its ownership ledger also includes emitted imports missing from published metadata. It does not widen the current distribution or add unimplemented public entries. Exact source versions, host heads, checked-in manager hashes and locked host toolchains are frozen alongside the proposal.

Run `yarn test:compatibility:contracts` for the deterministic acceptance checks. `yarn test:compatibility` packs the current real output with the prospective full metadata, then runs clean and immutable installations under core Yarn4.18.1, MC4.17.1, MO4.9.2, AO4.10.3 and the standalone MC API's declared4.7.0. Actual host framework/tooling versions are retained; MC's existing checked-in minimum-age setting is reproduced. `test-results/compatibility/` retains the candidate, native logs, peer explanations, locks and a report. The temporary fixture paths are printed and retained for inspection. This is an installation-surface rehearsal, not a full application build or completed source migration.

When changing a historical profile or its source contract, run `node tests/fixtures/compatibility/verify-source-contract.mjs WORKSPACE CORE_CHECKOUT YARN_4_7_BINARY` with local repositories containing the pinned Git objects and the official standalone Yarn binary. The verifier checks its pinned hash and independently derives profile values from the original manifests, locks, configuration and builder data. It does not accept matching edits to the two profile copies as source evidence. The separate `core-current-contract.json` describes the current build cohort and is checked against live source inputs before the matrix packs a candidate; update it deliberately alongside a coherent core upgrade.

MC root/API profiles are frozen to source `67cda3e943a69fd57a692189941863b1c6d5c3f9`, including AppInsights 3.17.0, global-agent 4.1.7 and the production API webpack toolchain. The MC root fixture seeds its exact committed lock, checks installed telemetry versions and replays its existing source-owned resolutions; the source contract rejects extra or altered resolutions, and native peer diagnostics still block acceptance. The standalone API declares AppInsights/Express and uses explicit root-lock selections under its own Yarn 4.7.0; there is no separate API lock or manager configuration. This does not prove real server startup, telemetry or host adoption. Earlier matrix receipts remain historical.

The full graph is currently **blocked**, so this command deliberately exits nonzero. Real viewer4.2.48 retains mutable-div2.0.0, whose Angular16 peers exclude the Angular20 cohort. Current host locks also mix framework/compiler patches, NgRx generations and unsupported Zone versions. Published old translation initializes a separate implementation alongside core even after Dexie version alignment; a compatible immutable facade/external release set or coordinated direct source cutover is required. Passing a file-based facade fixture is insufficient. No peer errors are ignored, required peers made optional, resolutions forced, or security/header support inferred from a successful install.

The published Node declaration baseline separately fails a clean strict consumer without its dev-only public type providers. Explicit provider ownership fixes that observed closure; future canonical `/node`, shared Passport/session identity and Helmet8 CSP behavior still need actual migrated-runtime proof. Open decisions in `decisions.json` prevent a successful-install-only result from becoming a compatibility claim. These gates precede broad migration and adoption.

## Architecture contract

One installed package must not become one eagerly loaded application bundle. The planned package uses real capability entry points, with no root aggregate module. Small startup/UI/validation consumers must not retain the case renderer or Node implementation. Applications own route-level dynamic loading; entry points alone do not make imports lazy. Installing one package still installs its declared dependency set.

Candidate boundaries include session support, case configuration, validation, focused UI capabilities, case lists, the coupled case renderer, translation and Node services. Names and granularity remain subject to real dependency graphs and packed-output evidence. Do not add placeholder public APIs to reserve them.

Before bulk migration:

1. Confirm supported consumers, framework versions and the complete dependency contract.
2. Prove browser/server isolation and declaration resolution using the actual packed artifact, including the Node CommonJS marker.
3. Prove canonical translation ownership and the legacy facade with compatible external Media Viewer/payment releases and a representative case path.
4. Measure small-consumer, startup-versus-renderer and list-only loading with the consumers' real builders.

Broader supported Angular cohorts and the complete future manifest remain design/compatibility gates. This foundation proves only its concrete initial APF dependency graph; publishing credentials and release automation remain absent. Package release must eventually publish the exact tested tarball without rebuilding it.

## Dependency and release assurance

The separate CI `dependency-audit` job uses the checked-in Yarn release to audit the full locked runtime and development graph. CI explicitly enables Yarn hardened mode for both jobs. The audit job installs with dependency build scripts disabled, retains `dependency-audit.jsonl`, and fails on reported findings or scanner errors. Reproduce it with `yarn npm audit --all --recursive --json`. Triage named advisories separately from deprecation notices; an empty GitHub alert list does not replace this check. Unresolved results remain visible until fixed or explicitly assessed by the security owner; do not add blanket ignores or force incompatible transitive majors.

ESLint 10.14.0 and typescript-eslint 8.72.2 support the pinned Node 24 and TypeScript 5.9 cohort. Seven version-specific parent resolutions select real upstream minimatch 11.0.8 and glob 14.0.4 releases for ESLint, its config-array matcher, the TypeScript parser project service, npm package preparation, its content-addressable cache, ignore-file traversal and TUF delegation matching. The parents still request older vulnerable majors; these replacements are limited to their verified matching/traversal APIs, with no consumer peer override. `yarn test:tooling-security` checks actual parent resolution, file discovery and rule detection, typed-project matching, package preparation, bounded pattern expansion and cancellation. See the [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249), [glob changes](https://github.com/isaacs/node-glob/blob/v14.0.4/changelog.md) and [minimatch changes](https://github.com/isaacs/minimatch/blob/v11.0.8/changelog.md). Preserve registry age gates and hardened installation; retire each resolution when its parent natively supports the fixed dependency. These contract checks do not replace the full locked-graph audit. The exact `minimatch@11.0.8` descriptor is preapproved for the security fix; Yarn's default age gate remains active for every other package version.

Repository administrators must verify real clean, failing and fork workflow behaviour before making additional contexts required. Secret scanning, push protection, alert routing and bypass review are repository/organisation settings and need their own read-back evidence; this workflow does not enable them. Preserve existing approvals and required checks.

For every candidate, retain source/run identity, native results, the tested tarball and digest, the dependency report and independent review. The EXUI code owners review engineering changes; name a security champion for weekly alert/update triage and monthly access, exception, toolchain and compatibility reviews. Assign remediation dates under the applicable policy instead of inventing a repository SLA. An escaped defect needs a cause-led regression that fails under the original fault.

Library package publication remains disabled. Before adoption, consumer and release owners must accept real app builds/journeys, supported dependency cohorts, input/privacy and accessibility behaviour, an SBOM/licence review, retained evidence and a rollback rehearsal. A future authorised release must publish the tested bytes and verify the downloaded digest; successful synthetic fixtures alone do not establish those conditions.

## Design and contribution

- [EXUI-5327](https://hmcts.atlassian.net/browse/EXUI-5327)
- [Architecture proposal](https://hmcts.atlassian.net/wiki/spaces/EXUI/pages/377880620/RPX+XUI+Core+Library+One+shared+core+selective+loading+EXUI-5327)
- [Contributing](.github/CONTRIBUTING.md)
- [Security policy](SECURITY.md)

EXUI owns this repository. Changes go through a pull request to `master`, the required `build` check and human review. Licensed under the [MIT licence](LICENCE).

`case/sharing` supplies the case-sharing models and error messages used by webapp and manage organisations. These are copied from CommonLib commit `f8566da8a53bff16177deeef824a0642a631285c`, retain the original 2019 Crown Copyright licence, and remain a selective entry point; application adoption is not implied.
