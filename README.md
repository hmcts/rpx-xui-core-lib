# RPX XUI Core Library

Repository foundation for consolidating four EXUI libraries into one npm package, with focused browser entry points and a separate Node entry.

**Status:** bootstrap only. No library implementation or consumable exports have been migrated. Package publication is disabled with `private: true`.

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
node .yarn/releases/yarn-4.5.3.cjs lint
node .yarn/releases/yarn-4.5.3.cjs test
```

If Yarn is already available, `yarn install --immutable`, `yarn lint` and `yarn test` use the same checked-in release. Use any Node version manager that honours `.nvmrc`.

`lint` checks the validation script's JavaScript syntax. `test` checks publication remains disabled and the package, Node and Yarn configuration agree. CI runs these commands in its `build` job. There is no library build or browser test suite yet; green bootstrap checks do not establish consumer compatibility or performance.

## Architecture contract

One installed package must not become one eagerly loaded application bundle. The planned package uses real capability entry points, with no root aggregate module. Small startup/UI/validation consumers must not retain the case renderer or Node implementation. Applications own route-level dynamic loading; entry points alone do not make imports lazy. Installing one package still installs its declared dependency set.

Candidate boundaries include session support, case configuration, validation, focused UI capabilities, case lists, the coupled case renderer, translation and Node services. Names and granularity remain subject to real dependency graphs and packed-output evidence. Do not add placeholder public APIs to reserve them.

Before bulk migration:

1. Confirm supported consumers, framework versions and the complete dependency contract.
2. Prove browser/server isolation and declaration resolution using the actual packed artifact, including the Node CommonJS marker.
3. Prove canonical translation ownership and the legacy facade with compatible external Media Viewer/payment releases and a representative case path.
4. Measure small-consumer, startup-versus-renderer and list-only loading with the consumers' real builders.

The supported Angular cohort is still a design decision. Angular dependencies, publishing credentials and release automation will be added through reviewed feasibility work. Package release must eventually publish the exact tested tarball without rebuilding it.

## Design and contribution

- [EXUI-5327](https://hmcts.atlassian.net/browse/EXUI-5327)
- [Architecture proposal](https://hmcts.atlassian.net/wiki/spaces/EXUI/pages/377880620/RPX+XUI+Core+Library+One+shared+core+selective+loading+EXUI-5327)
- [Contributing](.github/CONTRIBUTING.md)
- [Security policy](SECURITY.md)

EXUI owns this repository. Changes go through a pull request to `master`, the required `build` check and human review. Licensed under the [MIT licence](LICENCE).
