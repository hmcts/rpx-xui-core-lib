# Odhín reporter provenance

Functional responsive presentation extracted from `hmcts/rpx-xui-common-lib` revision `f8566da8a53bff16177deeef824a0642a631285c` (tracked HEAD, not the dirty working files).

- `odhin-adaptive.reporter.cjs`, `odhin-report-enhancer.cjs`, and `presentation/` derive from that implementation; unrelated application failure classification and separate accessibility-report machinery are omitted. Core adaptations retain queued callback ownership and deterministic sorting, use DOM node identity for panel dragging, and remove the unused Perfetto popup handler and styles. The active Playwright trace viewer flow remains.
- `.yarn/patches/odhin-reports-playwright-npm-1.1.8-a445ed88b7.patch` is copied byte for byte from that revision.
- `odhin-site-publisher.cjs` is adapted to browser and installed-package reports.

Responsive presentation follows the pinned common-lib implementation. Future common-lib changes are not inherited automatically.

## Pruned upstream archive

The original npm `odhin-reports-playwright@1.1.8` package contains unused HTTP, server, minifier and image/PDF dependencies with known advisories. The core archive removes those dependencies and disables automatic serving and embedded assets/attachments; it retains the four packages actually imported by supported HTML generation: `ansi-to-html`, `fs-extra`, `lodash`, and `picocolors`. The upstream MIT `LICENSE`, README, runtime declarations and all original browser assets remain in the archive.

The checked-in `.yarn/patches/odhin-reports-playwright-1.1.8-core.tgz` has SHA-256 `39de8a02208f032f5301da74594ab50d9d59235bcb0ab26f996d8cb1212242e6`. Its companion `odhin-reports-playwright-1.1.8-core-security.patch` records the security changes after applying the exact common-lib UI patch. These include HTML escaping of plain report/test/step/annotation/file metadata, JSON serialization of chart labels, and literal insertion of generated template fragments. Errors and source snippets retain the existing ANSI-aware escaping. Attachment writes reject paths outside the report directory. The separate common-lib responsive patch is unchanged and applied during archive generation, preserving the actual pruned dependency graph before Yarn resolution. The recipe normalizes the missing final newline in `dataTables.min.js` to apply the retained Yarn UI patch with the Git patch engine, and restores the original bytes during upstream verification.

`upstream-1.1.8.files.json` pins every original npm file. To rebuild, unpack the pristine npm package and run `python3 tests/reporters/vendor-odhin.py --source /path/to/package --output /tmp/odhin-core.tgz`. To verify the tracked archive, run `python3 tests/reporters/vendor-odhin.py --verify .yarn/patches/odhin-reports-playwright-1.1.8-core.tgz`. Verification reverses both patches, checks every upstream file hash, reapplies both patches, and compares deterministic archive bytes. It runs inside `yarn test:reporters` as well. Python 3 and the Git CLI are required for this check.

The plain file dependency deliberately avoids Yarn 4.18.1’s `npm audit` assertion failure for nested file-plus-patch locators. The native recursive audit executes against the complete locked graph, including the reporter dependencies. Retain its actual findings and exit status with each tested source; archive verification and report rendering do not replace dependency-audit acceptance. No advisory or deprecation records are ignored by this adaptation.
