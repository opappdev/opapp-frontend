import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const testFilePath = path.join(
  repoRoot,
  'tooling',
  'tests',
  'private-companion-data-provenance-compliance.test.ts',
);

function walkFiles(root: string, allowedExtensions: Set<string>, files: string[] = []) {
  if (!fs.existsSync(root)) {
    return files;
  }

  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, allowedExtensions, files);
      continue;
    }

    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function assertNoMatches(files: string[], patterns: RegExp[], messagePrefix: string) {
  const violations: string[] = [];

  for (const filePath of files) {
    if (path.resolve(filePath) === path.resolve(testFilePath)) {
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    for (const pattern of patterns) {
      if (pattern.test(raw)) {
        violations.push(`${path.relative(repoRoot, filePath)} matched ${pattern}`);
      }
    }
  }

  assert.equal(violations.length, 0, `${messagePrefix}\n${violations.join('\n')}`);
}

export function run() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};

  assert.equal(
    Object.prototype.hasOwnProperty.call(scripts, 'report:style-catalog-gaps'),
    false,
    'package.json must not expose report:style-catalog-gaps after the external intake cleanup.',
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(scripts, 'assert:style-intake-floor'),
    false,
    'package.json must not expose assert:style-intake-floor after the external intake cleanup.',
  );

  assert.equal(
    fs.existsSync(path.join(repoRoot, 'tooling', 'scripts', 'report-style-catalog-gaps.mjs')),
    false,
    'legacy style intake gap script must stay removed.',
  );
  assert.equal(
    fs.existsSync(path.join(repoRoot, 'tooling', 'tests', 'style-intake-floor.test.ts')),
    false,
    'legacy style intake floor test must stay removed.',
  );

  const reportFiles = walkFiles(path.join(repoRoot, 'tooling', 'reports'), new Set(['.json']));
  assertNoMatches(
    reportFiles,
    [/https?:\/\//i],
    'Tracked private companion report data must not include raw third-party http(s) URLs.',
  );

  const complianceRoots = [
    path.join(repoRoot, 'framework', 'i18n', 'src'),
    path.join(repoRoot, 'tooling', 'reports'),
    path.join(repoRoot, 'tooling', 'scripts'),
    path.join(repoRoot, 'tooling', 'tests'),
  ];
  const complianceFiles = complianceRoots.flatMap(root =>
    walkFiles(root, new Set(['.ts', '.tsx', '.js', '.mjs', '.json'])),
  );
  assertNoMatches(
    complianceFiles,
    [
      /\bpublic-page\b/,
      /\bss-list-row\b/,
      /\blistPageUrl\b/,
      /\bstyleUrl\b/,
      /\bmissing-public-page\b/,
    ],
    'Tracked private companion provenance code and reports must not allow third-party scrape semantics.',
  );

  const styleIntakeLog = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'tooling', 'reports', 'private-companion', 'style-intake-log.v1.json'),
      'utf8',
    ),
  ) as {
    sourcePolicy?: {allowedEvidenceKinds?: string[]};
  };
  assert.deepEqual(
    styleIntakeLog.sourcePolicy?.allowedEvidenceKinds ?? [],
    ['manual-screenshot', 'user-notes'],
    'style-intake log must advertise only local traceable evidence kinds.',
  );
}
