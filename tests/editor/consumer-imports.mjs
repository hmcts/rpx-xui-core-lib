import ts from 'typescript';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function toolkitImports(source) {
  const file = ts.createSourceFile('consumer.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = new Set();
  const unsupported = new Set();
  const packageName = '@hmcts/ccd-case-ui-toolkit';
  const isToolkit = text => text === packageName || text.startsWith(`${packageName}/`);
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && isToolkit(node.moduleSpecifier.text)) {
      if (node.moduleSpecifier.text !== packageName) unsupported.add('deep import');
      else if (!node.importClause) unsupported.add('side-effect import');
      else {
        if (node.importClause.name) unsupported.add('default import');
        const bindings = node.importClause.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) unsupported.add('namespace import');
        if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) names.add((element.propertyName ?? element.name).text);
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && isToolkit(node.moduleSpecifier.text)) {
      unsupported.add('re-export');
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal) && isToolkit(node.argument.literal.text)) {
      unsupported.add('type import');
    } else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && isToolkit(node.arguments[0].text)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) unsupported.add('dynamic import');
      else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') unsupported.add('require');
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return { names: [...names].sort(), unsupported: [...unsupported].sort() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const roots = process.argv.slice(2);
  if (!roots.length) throw new Error('Provide one or more consumer repository paths');
  const dist = resolve('dist/core-lib');
  const declarations = (await readdir(dist, { recursive: true })).filter(name => name.endsWith('/index.d.ts')).map(name => join(dist, name));
  if (!declarations.length) throw new Error('Build Core before checking consumer imports');
  const program = ts.createProgram(declarations, { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true });
  const checker = program.getTypeChecker();
  const exported = new Set();
  for (const declaration of declarations) {
    const file = program.getSourceFile(declaration);
    const symbol = file && checker.getSymbolAtLocation(file);
    if (symbol) for (const item of checker.getExportsOfModule(symbol)) exported.add(item.getName());
  }
  for (const root of roots) {
    const src = join(resolve(root), 'src');
    const files = (await readdir(src, { recursive: true })).filter(name => name.endsWith('.ts') && !name.endsWith('.spec.ts'));
    const names = new Set();
    const unanalysed = [];
    for (const file of files) {
      const imports = toolkitImports(await readFile(join(src, file), 'utf8'));
      for (const name of imports.names) names.add(name);
      if (imports.unsupported.length) unanalysed.push({ file, forms: imports.unsupported });
    }
    const missing = [...names].filter(name => !exported.has(name)).sort();
    console.log(JSON.stringify({ repository: root, namedImports: names.size, noMatchingCoreExport: missing, unanalysed }, null, 2));
  }
}
