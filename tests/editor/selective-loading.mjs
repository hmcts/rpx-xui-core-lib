import { resolve } from 'node:path';
import { probeLoading } from './selective-loading-lib.mjs';

const directory = resolve('dist/core-lib');
const probes = [
  ['session', 'fesm2022/hmcts-rpx-xui-core-lib-browser-session-storage.mjs', 'SessionStorageService'],
  ['notifier', 'fesm2022/hmcts-rpx-xui-core-lib-case-notifier.mjs', 'CaseNotifier'],
  ['editor', 'fesm2022/hmcts-rpx-xui-core-lib-case-editor-source.mjs', 'CaseEditorModule'],
  ['viewer', 'fesm2022/hmcts-rpx-xui-core-lib-case-editor-source.mjs', 'CaseViewerModule']
];
const results = [];
for (const [name, file, symbol] of probes) results.push({ name, ...await probeLoading(directory, file, symbol) });
console.log(JSON.stringify(results, null, 2));
if (results.some(result => ['session', 'notifier'].includes(result.name) && (result.payment || result.mediaViewer))) {
  console.error('Selective loading failed: a non-editor capability pulls in payment or media-viewer imports.');
  process.exitCode = 1;
}
const viewer = results.find(result => result.name === 'viewer');
if (viewer?.payment || viewer?.mediaViewer) {
  console.info('Case viewer dependency evidence: the viewer feature retains the editor palette closure, including Media Viewer and payment imports.');
}
