import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const TRIPLET_KEYS = ['fontSize', 'lineHeight', 'fontWeight'] as const;

type TypographyGuardConfig = {
  registryName: string;
  targetFilePath: string;
  targetLabel: string;
};

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
    'unable to resolve opapp-frontend repo root for typography guard',
  );
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
  while (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
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

function hasTypographyTriplet(node: ts.ObjectLiteralExpression): boolean {
  const keys = new Set<string>();
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    const propertyName = getPropertyName(property.name);
    if (propertyName) {
      keys.add(propertyName);
    }
  }
  return TRIPLET_KEYS.every((key) => keys.has(key));
}

function findRegistryObject(
  sourceFile: ts.SourceFile,
  registryName: string,
): ts.ObjectLiteralExpression {
  let registryObject: ts.ObjectLiteralExpression | null = null;

  function visit(node: ts.Node) {
    if (registryObject) {
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === registryName
    ) {
      if (node.initializer) {
        const initializer = unwrapExpression(node.initializer);
        if (ts.isObjectLiteralExpression(initializer)) {
          registryObject = initializer;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  assert.ok(
    registryObject,
    `${registryName} registry must exist in ${path.basename(sourceFile.fileName)}.`,
  );
  return registryObject;
}

function isDescendant(node: ts.Node, ancestor: ts.Node): boolean {
  let cursor: ts.Node | undefined = node;
  while (cursor) {
    if (cursor === ancestor) {
      return true;
    }
    cursor = cursor.parent;
  }
  return false;
}

function collectTypographyTriplets(
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression[] {
  const triplets: ts.ObjectLiteralExpression[] = [];

  function visit(node: ts.Node) {
    if (ts.isObjectLiteralExpression(node) && hasTypographyTriplet(node)) {
      triplets.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return triplets;
}

function collectRegistryKeys(
  registryObject: ts.ObjectLiteralExpression,
  registryName: string,
): Set<string> {
  const keys = new Set<string>();
  for (const property of registryObject.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    const name = getPropertyName(property.name);
    if (name) {
      keys.add(name);
    }
    const initializer = unwrapExpression(property.initializer);
    assert.ok(
      ts.isObjectLiteralExpression(initializer) &&
        hasTypographyTriplet(initializer),
      `registry entry '${name ?? 'unknown'}' in ${registryName} must define fontSize/lineHeight/fontWeight triplet`,
    );
  }
  return keys;
}

function collectRegistryUsageKeys(
  sourceFile: ts.SourceFile,
  registryName: string,
): Set<string> {
  const usageKeys = new Set<string>();

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === registryName
    ) {
      usageKeys.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return usageKeys;
}

function toAbsolutePath(repoRoot: string, relativePath: string): string {
  const segments = relativePath.split(/[\\/]+/).filter(Boolean);
  return path.join(repoRoot, ...segments);
}

export function runTypographyGuard(config: TypographyGuardConfig) {
  const repoRoot = resolveRepoRoot();
  const sourcePath = toAbsolutePath(repoRoot, config.targetFilePath);

  const sourceFile = readSourceFile(sourcePath);
  const registryObject = findRegistryObject(sourceFile, config.registryName);
  const registryKeys = collectRegistryKeys(registryObject, config.registryName);
  const usageKeys = collectRegistryUsageKeys(sourceFile, config.registryName);

  assert.ok(
    registryKeys.size > 0,
    `${config.registryName} must include at least one entry.`,
  );

  for (const triplet of collectTypographyTriplets(sourceFile)) {
    assert.ok(
      isDescendant(triplet, registryObject),
      `anonymous typography triplet is not allowed outside ${config.registryName} in ${config.targetLabel}`,
    );
  }

  for (const key of usageKeys) {
    assert.ok(
      registryKeys.has(key),
      `unknown ${config.registryName} entry referenced: ${key}`,
    );
  }

  for (const key of registryKeys) {
    assert.ok(
      usageKeys.has(key),
      `unused ${config.registryName} entry: ${key}`,
    );
  }
}
