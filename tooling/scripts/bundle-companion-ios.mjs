import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const resetCache = process.argv.includes('--reset-cache');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const appRoot = path.join(repoRoot, 'apps', 'companion-app');
const outputRoot = path.join(repoRoot, '.dist', 'bundles', 'companion-app', 'ios');
const bundleOutput = path.join(outputRoot, 'index.ios.bundle');
const runtimeBundlesPath = path.join(
  repoRoot,
  'apps',
  'companion-app',
  'src',
  'runtime-bundles.json',
);
const windowPolicyRegistrySource = path.join(
  repoRoot,
  'contracts',
  'windowing',
  'src',
  'window-policy-registry.json',
);
const windowPolicyRegistryOutput = path.join(outputRoot, 'window-policy-registry.json');
const npmCache = path.join(path.resolve(repoRoot, '..'), '.npm-cache');
const tempDir = path.join(path.resolve(repoRoot, '..'), '.tmp');
const metroCacheDir = path.join(tempDir, 'metro-cache');
const reactNativeBin = path.join(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'react-native.cmd' : 'react-native',
);
const maxWorkers = process.env.OPAPP_BUNDLE_MAX_WORKERS?.trim() ||
  (process.platform === 'win32' ? '1' : '');
const bundleArgs = [
  'bundle',
  '--platform',
  'ios',
  '--dev',
  'false',
  '--entry-file',
  'index.js',
  '--config',
  'metro.config.js',
  '--bundle-output',
  bundleOutput,
  '--assets-dest',
  outputRoot,
  ...(maxWorkers ? ['--max-workers', maxWorkers] : []),
  ...(resetCache ? ['--reset-cache'] : []),
];

async function main() {
  await rm(outputRoot, {recursive: true, force: true});

  if (resetCache) {
    await rm(metroCacheDir, {recursive: true, force: true});
  }

  await mkdir(outputRoot, {recursive: true});
  await mkdir(tempDir, {recursive: true});

  const env = {
    ...process.env,
    TEMP: process.env.TEMP || tempDir,
    TMP: process.env.TMP || tempDir,
    npm_config_cache: process.env.npm_config_cache || npmCache,
  };

  const command = process.platform === 'win32' ? 'cmd.exe' : reactNativeBin;
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', reactNativeBin, ...bundleArgs]
      : bundleArgs;

  const result = spawnSync(command, args, {
    cwd: appRoot,
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  await cp(windowPolicyRegistrySource, windowPolicyRegistryOutput, {force: true});

  const bundleBytes = await readFile(bundleOutput);
  const bundleChecksum = createHash('sha256').update(bundleBytes).digest('hex');

  const runtimeBundles = JSON.parse(await readFile(runtimeBundlesPath, 'utf8'));
  const mainBundleSurfaces =
    runtimeBundles.bundles.find(bundle => bundle.bundleId === runtimeBundles.mainBundleId)
      ?.surfaces ?? [];
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const manifest = {
    bundleId: 'opapp.companion.main',
    version: packageJson.version,
    buildTimestamp: new Date().toISOString(),
    platform: 'ios',
    // iOS AppDelegate.bundleURL splits entryFile into baseName + ext to query Bundle.main.
    // Full filename is preserved here — no extension stripping (unlike Windows JavaScriptBundleFile).
    entryFile: 'index.ios.bundle',
    surfaces: mainBundleSurfaces,
    checksum: {algorithm: 'sha256', value: bundleChecksum},
    sourceKind: 'local-build',
  };
  const manifestOutput = path.join(outputRoot, 'bundle-manifest.json');
  await writeFile(manifestOutput, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(
    `Bundled companion app for iOS: ${bundleOutput}${resetCache ? ' (with reset-cache)' : ''}`,
  );
  console.log(`Manifest written: ${manifestOutput}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
