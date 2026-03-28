import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
export const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..');
const rootTsconfigPath = path.join(repoRoot, 'tsconfig.json');
const tscCli = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const tsconfigPath = path.join(repoRoot, 'tooling', 'tsconfig.fast-tests.json');
export const testBuildRoot = path.join(repoRoot, '.tmp', 'test-build');
export const compiledTestsRoot = path.join(testBuildRoot, 'tooling', 'tests');
const testNodeModulesRoot = path.join(testBuildRoot, 'node_modules');

function createWorkspaceAliasShims() {
  const tsconfig = JSON.parse(fs.readFileSync(rootTsconfigPath, 'utf8'));
  const paths = tsconfig.compilerOptions?.paths ?? {};

  for (const [alias, targets] of Object.entries(paths)) {
    const target = Array.isArray(targets) ? targets[0] : null;
    if (typeof alias !== 'string' || typeof target !== 'string') {
      continue;
    }

    const cleanTarget = target.replace(/^\.\//, '').replace(/\.tsx?$/, '.js');
    const shimDir = path.join(testNodeModulesRoot, ...alias.split('/'));
    const shimPath = path.join(shimDir, 'index.js');
    fs.mkdirSync(shimDir, {recursive: true});

    const resolvedTarget = path.join(testBuildRoot, cleanTarget);
    const relativeTarget = path.relative(shimDir, resolvedTarget).replace(/\\/g, '/');
    const requireTarget = relativeTarget.startsWith('.') ? relativeTarget : `./${relativeTarget}`;
    fs.writeFileSync(shimPath, `module.exports = require('${requireTarget}');\n`, 'utf8');
  }
}

export function buildFrontendFastTestBundle() {
  fs.rmSync(testBuildRoot, {recursive: true, force: true});

  const compile = spawnSync(process.execPath, [tscCli, '-p', tsconfigPath], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (compile.status !== 0) {
    throw new Error(`Fast test bundle build failed with status ${compile.status ?? 1}.`);
  }

  createWorkspaceAliasShims();

  return {
    repoRoot,
    testBuildRoot,
    compiledTestsRoot,
  };
}
