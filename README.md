# RPX XUI Core Library

Repository foundation for consolidating four EXUI libraries into one npm package, with focused browser entry points and a separate Node entry.

**Status:** private Angular 20 package foundation. The first migrated capability is the real checkbox validator behind `@hmcts/rpx-xui-core-lib/forms/validation`; a private form gallery exercises that built output. This is not application adoption, a supported consolidation release, or complete package-feasibility evidence. Publication remains disabled with `private: true` in both workspace and staged package.

## Scope

| Source repository | Intended responsibility |
| --- | --- |
| [rpx-xui-common-lib](https://github.com/hmcts/rpx-xui-common-lib) | Shared UI and browser support |
| [ccd-case-ui-toolkit](https://github.com/hmcts/ccd-case-ui-toolkit) | Case lists, forms and rendering |
| [rpx-xui-translation](https://github.com/hmcts/rpx-xui-translation) | Translation |
| [rpx-xui-node-lib](https://github.com/hmcts/rpx-xui-node-lib) | Server support |

Media Viewer and payment integrations remain external. The repository configuration follows common-lib; its aggregate runtime module is not the target architecture.

## Develop locally

Use Node **24.22.1** and Yarn **4.5.3**, matching common-lib. Yarn is checked in so setup does not require a global Yarn installation or Corepack.

```sh
nvm use
node .yarn/releases/yarn-4.5.3.cjs install --immutable
yarn playwright install chromium
yarn test:all
yarn start
```

`test:all` resets generated reports, builds the package, runs lint and type checks, runs the report-gate regression tests, seven validator contracts and nine Node Jest contracts, verifies the installed tarball, builds the gallery, runs the complete local browser suite, then compares executed outcomes with the independent inventory in `tests/contracts.json`. The required CI `build` job runs this same fail-fast command. Missing reports, filtered-out required tests, skipped scenarios and failures cannot satisfy the contract gate. Reports are `test-results/validation.tap`, `test-results/node-jest.json`, `test-results/package.json`, `test-results/browser.json`, `test-results/browser-junit.xml` and `playwright-report/index.html`; browser artifacts stay below `test-results/browser/` so browser cleanup cannot remove earlier unit/package reports.

`start` lets the official library watcher complete its initial build before serving the private gallery at [localhost:4307](http://127.0.0.1:4307). Source/template/style edits rebuild, compilation errors appear in the terminal, and corrected source resumes compilation. Stop with Ctrl+C. The gallery and direct tests use the built package's public `@hmcts/rpx-xui-core-lib/forms/validation` import through an explicit local development link, without source aliases. The gallery excludes that linked package from prebundling so library edits reach the browser. Avoid placing this checkout below an unrelated Yarn Plug'n'Play workspace, whose ancestor manifest can override esbuild resolution.

For individual checks, run `yarn build` before `yarn lint`, `yarn test`, `yarn test:package` or `yarn build:host`. Lint covers ESLint, library TypeScript, strict gallery/template checking and JavaScript scripts/config/tests. Pure validator cases use native `node:test` against real Angular FormGroups; no custom Angular runner bridge is involved. Browser coverage uses native Chromium keyboard interactions and real form values, validity and submitted errors, with retries disabled.

`test:package` packs the actual built output, hashes the tarball, installs it into a fresh external consumer and checks the public import under strict legacy `moduleResolution: node` and modern `bundler` with library checks enabled. It executes the real validator on installed bytes, proves an omitted secondary declaration fails legacy resolution and verifies restoration. This narrow package proof does not establish the complete future dependency manifest or actual application adoption.

## Package layout and initial build cohort

Official ng-packagr emits a structural metadata-only primary entry point plus the real `forms/validation` secondary entry. The root primary exists because Angular Package Format requires it; its source exports no runtime capability and imports no secondary implementation. It must never become an aggregate root module. Native packaging emits physical `forms/validation/index.d.ts` declarations for legacy consumers and an independent validation FESM. No primary-to-secondary export rewriting or old `/validation` alias is used.

The initial APF build contract is Angular/compiler-cli **20.3.31**, ng-packagr **20.3.2**, TypeScript **5.9.3**, and Node **24.22.1**, with the gallery using Angular CLI/build **20.3.32** and framework **20.3.31**. Exact Angular peers describe this exercised cohort, not a promise of broad version support. Further supported cohorts need their own installed fixtures. The gallery keeps strict TypeScript/template checks. The migrated library retains source-compatible `strict: false`, `noImplicitAny: true`, `skipLibCheck: false`; imposing function variance would reject the unchanged FormGroup-specific callback.

The validator is byte-for-byte from [rpx-xui-common-lib published revision f23288743831ef13a55b4348f757db74c1a189c8](https://github.com/hmcts/rpx-xui-common-lib/blob/f23288743831ef13a55b4348f757db74c1a189c8/projects/exui-common-lib/src/lib/gov-ui/validators/checkboxes-be-checked.validator.ts). SHA-256: `095a8cb877b637406efcb175b2d73775a199104c26e2142b307d18f7d94673c3`. Its original MIT licence and 2019 Crown Copyright notice are retained at `forms/validation/LICENCE` in the distribution, alongside the core licence. The preserved behavior counts boolean `true` only, defaults to minimum one and returns `requireOneCheckboxToBeChecked`. Existing AO/common/MO source packages and production authority are unchanged.


## Node entry point

`@hmcts/rpx-xui-core-lib/node` exports `arrayPatternMatch` and `isStringPatternMatch`, preserved from Node-lib 2.30.35 at `133bfdf4c82f0fb1885932845dba24174edd45d0`. These stateless utilities keep the existing regular-expression behavior and failures; auth/session services and their constructed instances remain in Node-lib.

`yarn build` compiles the Node tree as CommonJS alongside the Angular output. The tarball includes its own `node/package.json` marker and declarations. `yarn test:node` runs the seven original Jest contracts and two empty/error contracts; the aggregate gate also requires their native Jest report. Package checks prove raw installed `require`, strict types, browser import rejection, and failure/restoration when the packed marker is removed. Browser/gallery watch does not watch Node source; run `yarn build` after Node edits.

## Translation preparation

`@hmcts/rpx-xui-core-lib/i18n` owns the published Translation 1.2.18 implementation (`c64cbe88f3f84a2d32ca9006f75c48a71a6dfc3b`), including its service/config classes, pipe, module and IndexedDB cache, with the later language-switch fix from source master `ca94b533c796a6f75c56c27dbf13a50b6feed0ed`. The MIT licence is preserved. Published runtime dependencies are Dexie 4.4.4 and Luxon 2.5.2; this retains the published dependency contract rather than silently adopting the source workspace's Luxon 3 build dependency.

`yarn test:i18n` runs 50 Jasmine contracts through the official Angular 20 Karma builder in Chrome. `yarn test:browser` also exercises the lazily loaded [translation gallery](http://127.0.0.1:4307/translation): locale persistence, real HTTP, IndexedDB cache reuse after reload, HTTP-error fallback, and a delayed response after switching language. The gallery uses built `/i18n` output; validation startup does not import it eagerly. Native Karma JUnit at `test-results/i18n/junit.xml` is required by the aggregate report gate.

The packed fixture includes a local, private old-name package that only reexports `/i18n`, proving class/provider identity for that staged shape. It is not a released legacy facade or acceptance of existing Media Viewer/payment dependencies. Prefer coordinated direct external cutover where owners can supply compatible releases; retain a pure reexport facade for supported old-name callers. Real external graphs, cancellation/teardown and concurrency behavior, supported consumer adoption, releases and cache/provider continuity across those upgrades remain acceptance gates. No application should initialize an old implementation alongside core translation.

## Full package compatibility preparation

`tests/fixtures/compatibility/prospective-package.json` is the concrete eventual dependency/peer/type proposal for all four libraries. Its ownership ledger also includes emitted imports missing from published metadata. It does not widen the current distribution or add unimplemented public entries. Exact source versions, host heads, checked-in manager hashes and locked host toolchains are frozen alongside the proposal.

Run `yarn test:compatibility:contracts` for the deterministic acceptance checks. `yarn test:compatibility` packs the current real output with the prospective full metadata, then runs clean and immutable installations under core Yarn4.5.3, MC4.17.1, MO4.9.2, AO4.10.3 and the standalone MC API's declared4.7.0. Actual host framework/tooling versions are retained; MC's existing checked-in minimum-age setting is reproduced. `test-results/compatibility/` retains the candidate, native logs, peer explanations, locks and a report. The temporary fixture paths are printed and retained for inspection. This is an installation-surface rehearsal, not a full application build or completed source migration.

The full graph is currently **blocked**, so this command deliberately exits nonzero. Real viewer4.2.48 retains mutable-div2.0.0, whose Angular16 peers exclude the Angular20 cohort. Current host locks also mix framework/compiler patches, NgRx generations and unsupported Zone versions. Published old translation initializes a separate implementation and Dexie version alongside core; a compatible immutable facade/external release set or coordinated direct source cutover is required. Passing a file-based facade fixture is insufficient. No peer errors are ignored, required peers made optional, resolutions forced, or security/header support inferred from a successful install.

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

## Design and contribution

- [EXUI-5327](https://hmcts.atlassian.net/browse/EXUI-5327)
- [Architecture proposal](https://hmcts.atlassian.net/wiki/spaces/EXUI/pages/377880620/RPX+XUI+Core+Library+One+shared+core+selective+loading+EXUI-5327)
- [Contributing](.github/CONTRIBUTING.md)
- [Security policy](SECURITY.md)

EXUI owns this repository. Changes go through a pull request to `master`, the required `build` check and human review. Licensed under the [MIT licence](LICENCE).
