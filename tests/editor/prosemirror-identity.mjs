import { createRequire } from 'node:module';

export function modelResolutions(rootRequire, dependencies) {
  const expected = rootRequire.resolve('prosemirror-model');
  return dependencies.map(dependency => ({
    dependency,
    expected,
    actual: createRequire(rootRequire.resolve(dependency)).resolve('prosemirror-model')
  }));
}
