import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {rename, rm} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

export const HERMES_BYTECODE_MAGIC = 0x1F1903C103BC1FC6n;

function hermesPlatformDir() {
  switch (process.platform) {
    case 'win32':
      return 'win64-bin';
    case 'darwin':
      return 'osx-bin';
    case 'linux':
      return 'linux64-bin';
    default:
      throw new Error(`Hermes bytecode compilation is not configured for platform '${process.platform}'.`);
  }
}

export function resolveHermesCliPath(repoRoot) {
  const hermesCliPath = path.join(
    repoRoot,
    'node_modules',
    'react-native',
    'sdks',
    'hermesc',
    hermesPlatformDir(),
    process.platform === 'win32' ? 'hermesc.exe' : 'hermesc',
  );

  if (!existsSync(hermesCliPath)) {
    throw new Error(`Hermes compiler not found at ${hermesCliPath}.`);
  }

  return hermesCliPath;
}

export function isHermesBytecodeBuffer(buffer) {
  return Buffer.isBuffer(buffer) &&
    buffer.length >= 8 &&
    buffer.readBigUInt64LE(0) === HERMES_BYTECODE_MAGIC;
}

export async function compileHermesBundleInPlace({
  repoRoot,
  bundlePath,
  optimization = 'O',
}) {
  const hermesCliPath = resolveHermesCliPath(repoRoot);
  const bytecodeOutputPath = `${bundlePath}.hbc`;
  await rm(bytecodeOutputPath, {force: true});

  const compilerArgs = [
    '-emit-binary',
    '-max-diagnostic-width=80',
    `-${optimization}`,
    '-out',
    bytecodeOutputPath,
    bundlePath,
  ];
  const result = spawnSync(hermesCliPath, compilerArgs, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    const exitCode = result.status ?? 1;
    const error = new Error(
      `Hermes bytecode compilation failed for ${bundlePath} with exit code ${exitCode}.`,
    );
    error.exitCode = exitCode;
    throw error;
  }

  await rename(bytecodeOutputPath, bundlePath);
}
