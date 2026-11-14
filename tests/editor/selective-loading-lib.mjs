import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

export async function probeLoading(root, file, symbol) {
  const directory = resolve(root);
  const metadata = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  const prefix = '@hmcts/rpx-xui-core-lib/';
  const result = await build({
    stdin: { contents: `import { ${symbol} } from ${JSON.stringify(resolve(directory, file))}; globalThis.probe = ${symbol};`, resolveDir: directory, sourcefile: 'probe.js' },
    bundle: true, write: false, metafile: true, minify: true, format: 'esm', platform: 'browser', packages: 'external', logLevel: 'silent',
    plugins: [{ name: 'core-entries', setup(builder) {
      builder.onResolve({ filter: /^@hmcts\/rpx-xui-core-lib(?:\/|$)/ }, args => {
        const key = args.path === prefix.slice(0, -1) ? '.' : `./${args.path.slice(prefix.length)}`;
        const entry = metadata.exports?.[key]?.default;
        if (typeof entry !== 'string') throw new Error(`Unknown Core entry: ${args.path}`);
        const target = resolve(directory, entry);
        const path = relative(directory, target);
        if (path.startsWith('..') || isAbsolute(path)) throw new Error(`Invalid Core entry: ${args.path}`);
        return { path: target };
      });
    } }]
  });
  const imports = Object.values(result.metafile.outputs).flatMap(output => output.imports.map(item => item.path));
  const output = result.outputFiles[0].contents;
  return { bytes: output.length, gzipBytes: gzipSync(output).length, externalImports: imports, payment: imports.some(item => item === '@hmcts/ccpay-web-component' || item.startsWith('@hmcts/ccpay-web-component/')), mediaViewer: imports.some(item => item === '@hmcts/media-viewer' || item.startsWith('@hmcts/media-viewer/')) };
}
