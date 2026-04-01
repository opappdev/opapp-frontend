import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {compileHermesBundleInPlace} from './hermes-bytecode.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const appRoot = path.join(repoRoot, 'apps', 'companion-app');
const outputRoot = path.join(repoRoot, '.dist', 'bundles', 'companion-app', 'windows');
const optionalPrivateBundleDescriptorPath = path.join(
  appRoot,
  '.private-companion',
  'bundle-descriptors.mjs',
);
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

function isEntryPoint() {
  const argvEntry = process.argv[1];
  if (!argvEntry) {
    return false;
  }

  return pathToFileURL(argvEntry).href === import.meta.url;
}

function createBundleArgs({
  entryFile,
  bundleOutput,
  assetsDest,
  resetCache = false,
}) {
  return [
    'bundle',
    '--platform',
    'windows',
    '--dev',
    'false',
    '--entry-file',
    entryFile,
    '--config',
    'metro.config.js',
    '--bundle-output',
    bundleOutput,
    '--assets-dest',
    assetsDest,
    '--max-workers',
    '1',
    ...(resetCache ? ['--reset-cache'] : []),
  ];
}

function createBundlePlans(runtimeBundles) {
  return runtimeBundles.bundles
    .filter(bundle => {
      const platforms = Array.isArray(bundle.platforms) ? bundle.platforms : [];
      return platforms.includes('windows');
    })
    .map(bundle => ({
      bundleId: bundle.bundleId,
      entryFile: bundle.entryFile,
      outputDir:
        bundle.bundleId === runtimeBundles.mainBundleId
          ? outputRoot
          : path.join(outputRoot, 'bundles', bundle.bundleId),
      bundleFile: bundle.bundleFile,
      surfaces: bundle.surfaces ?? [],
    }));
}

function normalizePrivateBundleDescriptor(descriptor, sourceLabel) {
  if (
    !descriptor ||
    typeof descriptor.bundleId !== 'string' ||
    descriptor.bundleId.length === 0 ||
    typeof descriptor.entryFile !== 'string' ||
    descriptor.entryFile.length === 0 ||
    typeof descriptor.bundleFile !== 'string' ||
    descriptor.bundleFile.length === 0 ||
    !Array.isArray(descriptor.surfaces) ||
    !descriptor.surfaces.every(
      surfaceId => typeof surfaceId === 'string' && surfaceId.length > 0,
    )
  ) {
    throw new Error(
      `Invalid private bundle descriptor at ${sourceLabel}. Expected non-empty bundleId, entryFile, bundleFile, and string surfaces[].`,
    );
  }

  return {
    bundleId: descriptor.bundleId,
    entryFile: descriptor.entryFile,
    bundleFile: descriptor.bundleFile,
    surfaces: descriptor.surfaces,
  };
}

async function loadOptionalPrivateBundleDescriptors() {
  if (!existsSync(optionalPrivateBundleDescriptorPath)) {
    console.log(
      `No optional private bundle descriptors found at ${optionalPrivateBundleDescriptorPath}; bundling public companion surfaces only.`,
    );
    return [];
  }

  const privateBundleModule = await import(
    pathToFileURL(optionalPrivateBundleDescriptorPath).href
  );
  const privateBundleDescriptors = Array.isArray(
    privateBundleModule.privateBundleDescriptors,
  )
    ? privateBundleModule.privateBundleDescriptors
    : [];

  return privateBundleDescriptors.map((descriptor, index) =>
    normalizePrivateBundleDescriptor(
      descriptor,
      `${optionalPrivateBundleDescriptorPath}#${index}`,
    ),
  );
}

function runReactNativeBundle(bundleArgs, env) {
  const command = process.platform === 'win32' ? 'cmd.exe' : reactNativeBin;
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', reactNativeBin, ...bundleArgs]
      : bundleArgs;

  return spawnSync(command, args, {
    cwd: appRoot,
    env,
    stdio: 'inherit',
  });
}

async function writeBundleManifest({
  bundleId,
  outputDir,
  entryFile,
  surfaces,
  version,
}) {
  const bundleOutput = path.join(outputDir, entryFile);
  const bundleBytes = await readFile(bundleOutput);
  const bundleChecksum = createHash('sha256').update(bundleBytes).digest('hex');
  const manifestOutput = path.join(outputDir, 'bundle-manifest.json');
  const manifest = {
    bundleId,
    version,
    buildTimestamp: new Date().toISOString(),
    platform: 'windows',
    entryFile,
    surfaces,
    bundleFormat: 'hermes-bytecode',
    checksum: {algorithm: 'sha256', value: bundleChecksum},
    sourceKind: 'local-build',
  };

  await writeFile(manifestOutput, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifestOutput;
}

export async function bundleCompanionWindows({resetCache = false} = {}) {
  const runtimeBundles = JSON.parse(await readFile(runtimeBundlesPath, 'utf8'));
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const privateBundleDescriptors = await loadOptionalPrivateBundleDescriptors();
  const bundlePlans = [
    ...createBundlePlans(runtimeBundles),
    ...privateBundleDescriptors.map(descriptor => ({
      ...descriptor,
      outputDir: path.join(outputRoot, 'bundles', descriptor.bundleId),
    })),
  ];

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

  for (const [index, bundlePlan] of bundlePlans.entries()) {
    await mkdir(bundlePlan.outputDir, {recursive: true});

    const bundleArgs = createBundleArgs({
      entryFile: bundlePlan.entryFile,
      bundleOutput: path.join(bundlePlan.outputDir, bundlePlan.bundleFile),
      assetsDest: bundlePlan.outputDir,
      resetCache: resetCache && index === 0,
    });
    const result = runReactNativeBundle(bundleArgs, env);

    if (result.status !== 0) {
      const exitCode = result.status ?? 1;
      const error = new Error(
        `Companion windows bundle command failed for ${bundlePlan.bundleId} with exit code ${exitCode}.`,
      );
      error.exitCode = exitCode;
      throw error;
    }

    await compileHermesBundleInPlace({
      repoRoot,
      bundlePath: path.join(bundlePlan.outputDir, bundlePlan.bundleFile),
    });

    const manifestOutput = await writeBundleManifest({
      bundleId: bundlePlan.bundleId,
      outputDir: bundlePlan.outputDir,
      entryFile: bundlePlan.bundleFile,
      surfaces: bundlePlan.surfaces,
      version: packageJson.version,
    });

    console.log(
      `Bundled companion app for Windows: ${path.join(bundlePlan.outputDir, bundlePlan.bundleFile)}`,
    );
    console.log(`Manifest written: ${manifestOutput}`);
  }

  await cp(windowPolicyRegistrySource, windowPolicyRegistryOutput, {force: true});

  console.log(
    `Bundle set ready under ${outputRoot}: ${bundlePlans
      .map(bundlePlan => bundlePlan.bundleId)
      .join(', ')}`,
  );

  return {
    outputRoot,
    bundleIds: bundlePlans.map(bundlePlan => bundlePlan.bundleId),
  };
}

if (isEntryPoint()) {
  bundleCompanionWindows({resetCache: process.argv.includes('--reset-cache')}).catch(error => {
    console.error(error);
    process.exit(error.exitCode ?? 1);
  });
}
