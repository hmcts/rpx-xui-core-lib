import assert from 'node:assert/strict';
import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import { buildSync } from 'esbuild';

export async function verifyCommonShellPackage({ root, consumer, compiler, check, run }) {
  await cp(join(root, 'tests/common-shell/shell.test.mjs'), join(consumer, 'common-shell.test.mjs'));
  await cp(join(root, 'tests/common-shell/table-let.test.mjs'), join(consumer, 'table-let.test.mjs'));
  await check('package.common-shell-behavior', () => run('common-shell-behavior', ['--test', 'common-shell.test.mjs', 'table-let.test.mjs'], consumer));
  await check('package.common-shell-browser', () => run('common-shell-browser', [join(root, 'tests/common-shell/packed-browser.mjs')], root));
  await cp(join(root, 'tests/package/common-shell-types.ts'), join(consumer, 'common-shell-types.ts'));
  await check('package.common-shell-types', async () => {
    for (const resolution of ['node', 'bundler']) {
      await run(`common-shell-types-${resolution}`, [compiler, '--strict', '--skipLibCheck', 'false', '--noEmit', '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', resolution, 'common-shell-types.ts'], consumer);
    }
  });
  await check('package.common-shell-graphs', () => {
    const entries = [
      { entry: 'hmcts-main-wrapper', symbol: 'HmctsMainWrapperModule', allowed: ['ui-hmcts-main-wrapper', 'ui-banner', 'ui-hmcts-error-summary', 'i18n'] },
      { entry: 'hmcts-primary-navigation', symbol: 'HmctsPrimaryNavigationModule', allowed: ['ui-hmcts-primary-navigation', 'i18n'] },
      { entry: 'hmcts-identity-bar', symbol: 'HmctsIdentityBarModule', allowed: ['ui-hmcts-identity-bar', 'i18n'] },
      { entry: 'gov-table', symbol: 'GovTableModule', allowed: ['ui-gov-table', 'i18n'] },
      { entry: 'let', symbol: 'LetModule', allowed: ['ui-let'] },
    ];
    const graph = contents => buildSync({ stdin: { contents, resolveDir: consumer }, absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const verify = (result, entry) => {
      const used = Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([path]) => path.replaceAll('\\', '/')));
      const core = new Set(used.filter(path => path.includes('/@hmcts/rpx-xui-core-lib/')).map(path => path.split('/').at(-1)));
      const expected = new Set(entry.allowed.map(suffix => `hmcts-rpx-xui-core-lib-${suffix}.mjs`));
      assert.deepEqual(core, expected, `Unrelated or missing Core code in ${entry.entry}`);
      assert.ok(!used.some(path => /(?:media-viewer|ccpay|ngx-editor|@angular\/material|^node:)/.test(path)), 'Shell import must avoid heavyweight optional capabilities');
    };
    for (const entry of entries) {
      const source = `import '@angular/compiler'; import { ${entry.symbol} } from '@hmcts/rpx-xui-core-lib/ui/${entry.entry}'; console.log(${entry.symbol});`;
      verify(graph(source), entry);
      assert.throws(() => verify(graph(`${source} import { InvitationModule } from '@hmcts/rpx-xui-core-lib/ui/invitation'; console.log(InvitationModule);`), entry), /Unrelated or missing Core code/);
    }
  });
}
