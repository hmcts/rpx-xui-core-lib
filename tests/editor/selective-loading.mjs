import { resolve } from 'node:path';
import { probeLoading } from './selective-loading-lib.mjs';

const directory = resolve('dist/core-lib');
const probes = [
  ['session', 'fesm2022/hmcts-rpx-xui-core-lib-browser-session-storage.mjs', 'SessionStorageService'],
  ['notifier', 'fesm2022/hmcts-rpx-xui-core-lib-case-notifier.mjs', 'CaseNotifier'],
  ['editor', 'fesm2022/hmcts-rpx-xui-core-lib-case-editor-source.mjs', 'CaseEditorModule']
];
const results = [];
for (const [name, file, symbol] of probes) results.push({ name, ...await probeLoading(directory, file, symbol) });
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.name !== 'editor' && (result.payment || result.mediaViewer))) {
  console.error('Selective loading failed: a non-editor capability pulls in payment or media-viewer imports.');
  process.exitCode = 1;
}
