import { builtinModules } from 'node:module';

export function findForbiddenExternalImports(externalImports, nodeOnlyPackages, unrelatedPackages) {
  const forbiddenPackages = [...nodeOnlyPackages, ...unrelatedPackages];
  const isNodeBuiltin = specifier => {
    const normalized = specifier.startsWith('node:') ? specifier.slice(5) : specifier;
    return builtinModules.some(moduleName => normalized === moduleName || normalized.startsWith(`${moduleName}/`));
  };
  return externalImports.filter(specifier => isNodeBuiltin(specifier) ||
    forbiddenPackages.some(packageName => specifier === packageName || specifier.startsWith(`${packageName}/`)),
  );
}
