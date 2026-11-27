export function findForbiddenExternalImports(externalImports, nodeOnlyPackages, unrelatedPackages) {
  const forbiddenPackages = [...nodeOnlyPackages, ...unrelatedPackages];
  return externalImports.filter(specifier =>
    forbiddenPackages.some(packageName => specifier === packageName || specifier.startsWith(`${packageName}/`)),
  );
}
