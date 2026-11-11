import ts from 'typescript';

/** @param {string} entry @param {string[]} files */
export function missingSpecImports(entry, files) {
  const source = ts.createSourceFile('main.ts', entry, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports = new Set(source.statements.flatMap(statement =>
    ts.isImportDeclaration(statement) && !statement.importClause && ts.isStringLiteral(statement.moduleSpecifier)
      ? [statement.moduleSpecifier.text] : []));
  return files.filter(file => file.endsWith('.spec.ts')).filter(file =>
    !imports.has(`./${file.replaceAll('\\', '/').slice(0, -3)}`));
}
