import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const allowedRelativePaths = new Set([
  'ui/native-primitives/src/components/TextInput.tsx',
]);

function resolveRepoRoot(): string {
  const candidates = [
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..', '..', '..', '..'),
    process.cwd(),
  ];

  for (const candidate of candidates) {
    const packageJsonPath = path.join(candidate, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      name?: string;
    };
    if (pkg.name === 'opapp-frontend') {
      return candidate;
    }
  }

  throw new Error(
    'unable to resolve opapp-frontend repo root for native TextInput guard',
  );
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function walkSourceFiles(rootDir: string): string[] {
  const files: string[] = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    if (!currentDir) {
      continue;
    }

    const entries = fs.readdirSync(currentDir, {withFileTypes: true});
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = normalizeRelativePath(path.relative(rootDir, fullPath));
      if (
        relativePath.startsWith('.tmp/') ||
        relativePath.startsWith('.dist/')
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile() && fullPath.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function readSourceFile(filePath: string): ts.SourceFile {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function getPropertyName(name: ts.PropertyName): string | null {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  return null;
}

function collectReactNativeTextInputAliases(
  sourceFile: ts.SourceFile,
): Set<string> {
  const aliases = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.moduleSpecifier.getText(sourceFile) !== "'react-native'"
    ) {
      continue;
    }

    const clause = statement.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
      continue;
    }

    for (const element of clause.namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === 'TextInput') {
        aliases.add(element.name.text);
      }
    }
  }

  return aliases;
}

function collectAppFontFamilyAliases(sourceFile: ts.SourceFile): Set<string> {
  const aliases = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    const clause = statement.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
      continue;
    }

    for (const element of clause.namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === 'appFontFamily') {
        aliases.add(element.name.text);
      }
    }
  }

  return aliases;
}

function collectStyleRegistries(
  sourceFile: ts.SourceFile,
): Map<string, Map<string, ts.ObjectLiteralExpression>> {
  const registries = new Map<string, Map<string, ts.ObjectLiteralExpression>>();

  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isPropertyAccessExpression(node.initializer.expression) &&
      ts.isIdentifier(node.initializer.expression.expression) &&
      node.initializer.expression.expression.text === 'StyleSheet' &&
      node.initializer.expression.name.text === 'create'
    ) {
      const [styleObject] = node.initializer.arguments;
      if (styleObject && ts.isObjectLiteralExpression(styleObject)) {
        const entries = new Map<string, ts.ObjectLiteralExpression>();
        for (const property of styleObject.properties) {
          if (!ts.isPropertyAssignment(property)) {
            continue;
          }

          const propertyName = getPropertyName(property.name);
          const initializer = unwrapExpression(property.initializer);
          if (
            propertyName &&
            ts.isObjectLiteralExpression(initializer)
          ) {
            entries.set(propertyName, initializer);
          }
        }

        registries.set(node.name.text, entries);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return registries;
}

function objectUsesAppFontFamily(
  objectLiteral: ts.ObjectLiteralExpression,
  appFontFamilyAliases: ReadonlySet<string>,
): boolean {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const propertyName = getPropertyName(property.name);
    if (propertyName !== 'fontFamily') {
      continue;
    }

    const initializer = unwrapExpression(property.initializer);
    if (
      ts.isIdentifier(initializer) &&
      appFontFamilyAliases.has(initializer.text)
    ) {
      return true;
    }
  }

  return false;
}

function expressionUsesAppFontFamily({
  expression,
  styleRegistries,
  appFontFamilyAliases,
}: {
  expression: ts.Expression;
  styleRegistries: Map<string, Map<string, ts.ObjectLiteralExpression>>;
  appFontFamilyAliases: ReadonlySet<string>;
}): boolean {
  const current = unwrapExpression(expression);

  if (ts.isArrayLiteralExpression(current)) {
    return current.elements.some(element => {
      if (!ts.isExpression(element)) {
        return false;
      }
      return expressionUsesAppFontFamily({
        expression: element,
        styleRegistries,
        appFontFamilyAliases,
      });
    });
  }

  if (ts.isConditionalExpression(current)) {
    return (
      expressionUsesAppFontFamily({
        expression: current.whenTrue,
        styleRegistries,
        appFontFamilyAliases,
      }) ||
      expressionUsesAppFontFamily({
        expression: current.whenFalse,
        styleRegistries,
        appFontFamilyAliases,
      })
    );
  }

  if (ts.isBinaryExpression(current)) {
    return (
      expressionUsesAppFontFamily({
        expression: current.left,
        styleRegistries,
        appFontFamilyAliases,
      }) ||
      expressionUsesAppFontFamily({
        expression: current.right,
        styleRegistries,
        appFontFamilyAliases,
      })
    );
  }

  if (ts.isObjectLiteralExpression(current)) {
    return objectUsesAppFontFamily(current, appFontFamilyAliases);
  }

  if (
    ts.isPropertyAccessExpression(current) &&
    ts.isIdentifier(current.expression)
  ) {
    const registry = styleRegistries.get(current.expression.text);
    const styleObject = registry?.get(current.name.text);
    return styleObject
      ? objectUsesAppFontFamily(styleObject, appFontFamilyAliases)
      : false;
  }

  return false;
}

function collectViolations({
  sourceFile,
  repoRoot,
}: {
  sourceFile: ts.SourceFile;
  repoRoot: string;
}): string[] {
  const relativePath = normalizeRelativePath(
    path.relative(repoRoot, sourceFile.fileName),
  );
  if (allowedRelativePaths.has(relativePath)) {
    return [];
  }

  const reactNativeTextInputAliases = collectReactNativeTextInputAliases(sourceFile);
  if (reactNativeTextInputAliases.size === 0) {
    return [];
  }

  const appFontFamilyAliases = collectAppFontFamilyAliases(sourceFile);
  if (appFontFamilyAliases.size === 0) {
    return [];
  }

  const styleRegistries = collectStyleRegistries(sourceFile);
  const violations: string[] = [];

  function visit(node: ts.Node) {
    if (!ts.isJsxSelfClosingElement(node) && !ts.isJsxOpeningElement(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    if (
      !ts.isIdentifier(node.tagName) ||
      !reactNativeTextInputAliases.has(node.tagName.text)
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    for (const attribute of node.attributes.properties) {
      if (
        !ts.isJsxAttribute(attribute) ||
        !ts.isIdentifier(attribute.name) ||
        attribute.name.text !== 'style' ||
        !attribute.initializer ||
        !ts.isJsxExpression(attribute.initializer) ||
        !attribute.initializer.expression
      ) {
        continue;
      }

      if (
        expressionUsesAppFontFamily({
          expression: attribute.initializer.expression,
          styleRegistries,
          appFontFamilyAliases,
        })
      ) {
        violations.push(
          `${relativePath}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`,
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function run() {
  const repoRoot = resolveRepoRoot();
  const violations = walkSourceFiles(repoRoot).flatMap(filePath =>
    collectViolations({
      sourceFile: readSourceFile(filePath),
      repoRoot,
    }),
  );

  assert.deepEqual(
    violations,
    [],
    [
      'Raw react-native TextInput style props must not reuse appFontFamily outside the shared primitive.',
      'Use @opapp/ui-native-primitives TextInput for shared typography, or keep raw RNW TextInput fontFamily unset.',
      violations.length > 0 ? `Violations:\n- ${violations.join('\n- ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}
