import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import semver from 'semver';

export const prosemirrorPackages = [
  'prosemirror-commands',
  'prosemirror-history',
  'prosemirror-model',
  'prosemirror-schema-list',
  'prosemirror-state'
];

export function modelResolutions(rootRequire, dependencies) {
  const expected = rootRequire.resolve('prosemirror-model');
  return dependencies.map(dependency => ({
    dependency,
    expected,
    actual: createRequire(rootRequire.resolve(dependency)).resolve('prosemirror-model')
  }));
}
export function assertSharedProsemirrorResolution(coreEntryPath, editorEntryPath) {
  const coreResolutions = esmResolutions(coreEntryPath);
  const editorResolutions = esmResolutions(editorEntryPath);
  for (const dependency of prosemirrorPackages) {
    const coreResolution = coreResolutions[dependency];
    const editorResolution = editorResolutions[dependency];
    if (coreResolution !== editorResolution) {
      throw new Error(`${dependency} resolves to different ESM package copies: ${coreResolution} !== ${editorResolution}`);
    }
  }
}

function esmResolutions(entryPath) {
  const source = `console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(prosemirrorPackages)}.map(name => [name, import.meta.resolve(name)]))));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: dirname(resolve(entryPath)),
    encoding: 'utf8'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ESM dependency resolution failed from ${entryPath}: ${result.stderr}`);
  return JSON.parse(result.stdout.trim());
}

export function assertCompatibleProsemirrorPeers(coreManifest, editorManifest) {
  for (const dependency of prosemirrorPackages) {
    const coreRange = coreManifest.peerDependencies?.[dependency];
    const editorRange = editorManifest.dependencies?.[dependency] ?? editorManifest.peerDependencies?.[dependency];
    if (coreManifest.dependencies?.[dependency]) {
      throw new Error(`${dependency} must not be a Core runtime dependency`);
    }
    if (coreManifest.peerDependenciesMeta?.[dependency]?.optional !== true) {
      throw new Error(`${dependency} must be an optional Core peer`);
    }
    if (!coreRange || !editorRange || !semver.validRange(coreRange) || !semver.validRange(editorRange) || !semver.intersects(coreRange, editorRange)) {
      throw new Error(`${dependency} Core peer range ${coreRange ?? '(missing)'} does not intersect ngx-editor range ${editorRange ?? '(missing)'}`);
    }
  }
}
