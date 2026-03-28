import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  buildFrontendFastTestBundle,
  compiledTestsRoot,
  repoRoot,
} from './frontend-fast-test-build.mjs';

function walk(dir) {
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}
buildFrontendFastTestBundle();

const testFiles = walk(compiledTestsRoot);
if (testFiles.length === 0) {
  console.error('No compiled frontend test files were found.');
  process.exit(1);
}

let failures = 0;
for (const testFile of testFiles) {
  try {
    const testModule = await import(pathToFileURL(testFile).href);
    if (typeof testModule.run !== 'function') {
      throw new Error('Compiled test module does not export run().');
    }

    await testModule.run();
    console.log(`[frontend-test] PASS ${path.relative(repoRoot, testFile)}`);
  } catch (error) {
    failures += 1;
    console.error(`[frontend-test] FAIL ${path.relative(repoRoot, testFile)}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exit(1);
}
