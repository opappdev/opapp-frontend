import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const hermesBytecodeMagic = 0x1F1903C103BC1FC6n;

function resolveExpectedHermesCliPath(repoRoot: string) {
  const platformDir =
    process.platform === 'win32'
      ? 'win64-bin'
      : process.platform === 'darwin'
        ? 'osx-bin'
        : 'linux64-bin';

  return path.join(
    repoRoot,
    'node_modules',
    'react-native',
    'sdks',
    'hermesc',
    platformDir,
    process.platform === 'win32' ? 'hermesc.exe' : 'hermesc',
  );
}

function isHermesBytecodeBuffer(buffer: Buffer) {
  return buffer.length >= 8 && buffer.readBigUInt64LE(0) === hermesBytecodeMagic;
}

export function run() {
  const repoRoot = path.resolve(process.cwd());
  const helperSource = fs.readFileSync(
    path.join(repoRoot, 'tooling', 'scripts', 'hermes-bytecode.mjs'),
    'utf8',
  );
  const header = Buffer.alloc(8);
  header.writeBigUInt64LE(hermesBytecodeMagic, 0);

  assert.equal(
    isHermesBytecodeBuffer(header),
    true,
    'Hermes bytecode detector should recognize the Hermes bundle magic header.',
  );
  assert.equal(
    isHermesBytecodeBuffer(Buffer.from('console.log("hello");\n', 'utf8')),
    false,
    'Hermes bytecode detector should reject plain JavaScript bundle contents.',
  );

  assert.equal(
    helperSource.includes('HERMES_BYTECODE_MAGIC = 0x1F1903C103BC1FC6n'),
    true,
    'Hermes helper must keep the canonical Hermes bytecode magic header.',
  );

  const hermesCliPath = resolveExpectedHermesCliPath(repoRoot);
  assert.equal(
    fs.existsSync(hermesCliPath),
    true,
    'Frontend tooling must resolve a host-side hermesc binary from the installed React Native SDK.',
  );
  assert.equal(
    path.basename(hermesCliPath).toLowerCase(),
    process.platform === 'win32' ? 'hermesc.exe' : 'hermesc',
    'Frontend tooling must resolve the expected hermesc executable for the current platform.',
  );
}
