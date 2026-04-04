import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const distRoot = path.join(repoRoot, '.dist');
const stageRoot = path.join(distRoot, 'staging', 'companion-app');
const packageRoot = path.join(stageRoot, 'package');
const internalPackagesRoot = path.join(packageRoot, 'node_modules', '@opapp');
const npmCache = path.join(path.resolve(repoRoot, '..'), '.npm-cache');
const tempDir = path.join(path.resolve(repoRoot, '..'), '.tmp');

const packageMap = {
  app: path.join(repoRoot, 'apps', 'companion-app'),
  capabilityLlmChat: path.join(repoRoot, 'capabilities', 'llm-chat'),
  capabilitySettings: path.join(repoRoot, 'capabilities', 'settings'),
  contractsWindowing: path.join(repoRoot, 'contracts', 'windowing'),
  frameworkAgentRuntime: path.join(repoRoot, 'framework', 'agent-runtime'),
  frameworkCompanionRuntime: path.join(repoRoot, 'framework', 'companion-runtime'),
  frameworkI18n: path.join(repoRoot, 'framework', 'i18n'),
  frameworkDiagnostics: path.join(repoRoot, 'framework', 'diagnostics'),
  frameworkFilesystem: path.join(repoRoot, 'framework', 'filesystem'),
  frameworkSse: path.join(repoRoot, 'framework', 'sse'),
  frameworkSurfaces: path.join(repoRoot, 'framework', 'surfaces'),
  frameworkViewShot: path.join(repoRoot, 'framework', 'view-shot'),
  frameworkWindowCapture: path.join(repoRoot, 'framework', 'window-capture'),
  frameworkWindowing: path.join(repoRoot, 'framework', 'windowing'),
  ui: path.join(repoRoot, 'ui', 'native-primitives'),
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function copyPackage(sourceDir, targetDir, packageJson, extraFiles = []) {
  await mkdir(targetDir, {recursive: true});
  await writeFile(
    path.join(targetDir, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    'utf8',
  );
  await cp(path.join(sourceDir, 'src'), path.join(targetDir, 'src'), {
    recursive: true,
    force: true,
  });

  for (const relativeFile of extraFiles) {
    const sourceFile = path.join(sourceDir, relativeFile);
    if (existsSync(sourceFile)) {
      await mkdir(path.dirname(path.join(targetDir, relativeFile)), {recursive: true});
      await cp(sourceFile, path.join(targetDir, relativeFile), {
        recursive: true,
        force: true,
      });
    }
  }
}

async function rewritePackagedCompanionBridgeFiles(targetDir) {
  const packagedBridgeFiles = new Map([
    [
      'src/companion-runtime.ts',
      "export * from '@opapp/framework-companion-runtime';\n",
    ],
    [
      'src/createCompanionApp.tsx',
      "export {createCompanionApp} from '@opapp/framework-companion-runtime';\n",
    ],
    [
      'src/useCompanionStartupTarget.ts',
      "export {useCompanionStartupTarget} from '@opapp/framework-companion-runtime';\n",
    ],
  ]);

  await Promise.all(
    [...packagedBridgeFiles].map(([relativePath, source]) =>
      writeFile(path.join(targetDir, relativePath), source, 'utf8'),
    ),
  );
}

function normalizeWorkspaceDependencyVersions(dependencies, packageVersionByName) {
  if (!dependencies) {
    return dependencies;
  }

  return Object.fromEntries(
    Object.entries(dependencies).map(([dependencyName, version]) => {
      if (typeof version !== 'string' || !version.startsWith('workspace:')) {
        return [dependencyName, version];
      }

      return [dependencyName, packageVersionByName.get(dependencyName) ?? version];
    }),
  );
}

function normalizePackageManifest(packageJson, packageVersionByName) {
  return {
    ...packageJson,
    private: false,
    dependencies: normalizeWorkspaceDependencyVersions(
      packageJson.dependencies,
      packageVersionByName,
    ),
    peerDependencies: normalizeWorkspaceDependencyVersions(
      packageJson.peerDependencies,
      packageVersionByName,
    ),
    optionalDependencies: normalizeWorkspaceDependencyVersions(
      packageJson.optionalDependencies,
      packageVersionByName,
    ),
  };
}

async function main() {
  const packageJsonByKey = Object.fromEntries(
    await Promise.all(
      Object.entries(packageMap).map(async ([key, packageRoot]) => [
        key,
        await readJson(path.join(packageRoot, 'package.json')),
      ]),
    ),
  );
  const appPkg = packageJsonByKey.app;
  const packageVersionByName = new Map(
    Object.values(packageJsonByKey).map(packageJson => [packageJson.name, packageJson.version]),
  );

  await rm(stageRoot, {recursive: true, force: true});
  await mkdir(internalPackagesRoot, {recursive: true});
  await mkdir(distRoot, {recursive: true});

  const normalizedAppPkg = {
    ...normalizePackageManifest(appPkg, packageVersionByName),
    bundledDependencies: Object.values(packageJsonByKey)
      .filter(packageJson => packageJson.name !== appPkg.name)
      .map(packageJson => packageJson.name)
      .sort(),
  };

  await copyPackage(packageMap.app, packageRoot, normalizedAppPkg, [
    'app.json',
    'index.js',
    'index.chat.js',
    'index.main.js',
    '.private-companion',
    'babel.config.js',
    'metro.config.js',
  ]);
  await rewritePackagedCompanionBridgeFiles(packageRoot);
  await copyPackage(
    packageMap.capabilityLlmChat,
    path.join(internalPackagesRoot, 'capability-llm-chat'),
    normalizePackageManifest(packageJsonByKey.capabilityLlmChat, packageVersionByName),
  );
  await copyPackage(
    packageMap.capabilitySettings,
    path.join(internalPackagesRoot, 'capability-settings'),
    normalizePackageManifest(packageJsonByKey.capabilitySettings, packageVersionByName),
  );
  await copyPackage(
    packageMap.contractsWindowing,
    path.join(internalPackagesRoot, 'contracts-windowing'),
    normalizePackageManifest(packageJsonByKey.contractsWindowing, packageVersionByName),
  );
  await copyPackage(
    packageMap.frameworkAgentRuntime,
    path.join(internalPackagesRoot, 'framework-agent-runtime'),
    normalizePackageManifest(packageJsonByKey.frameworkAgentRuntime, packageVersionByName),
  );
  await copyPackage(
    packageMap.frameworkCompanionRuntime,
    path.join(internalPackagesRoot, 'framework-companion-runtime'),
    normalizePackageManifest(
      packageJsonByKey.frameworkCompanionRuntime,
      packageVersionByName,
    ),
  );
  await copyPackage(
    packageMap.frameworkI18n,
    path.join(internalPackagesRoot, 'framework-i18n'),
    normalizePackageManifest(packageJsonByKey.frameworkI18n, packageVersionByName),
  );
  await copyPackage(
    packageMap.frameworkDiagnostics,
    path.join(internalPackagesRoot, 'framework-diagnostics'),
    normalizePackageManifest(
      packageJsonByKey.frameworkDiagnostics,
      packageVersionByName,
    ),
  );
  await copyPackage(
    packageMap.frameworkFilesystem,
    path.join(internalPackagesRoot, 'framework-filesystem'),
    normalizePackageManifest(packageJsonByKey.frameworkFilesystem, packageVersionByName),
  );
  await copyPackage(
    packageMap.frameworkSse,
    path.join(internalPackagesRoot, 'framework-sse'),
    normalizePackageManifest(packageJsonByKey.frameworkSse, packageVersionByName),
  );
  await copyPackage(
    packageMap.frameworkSurfaces,
    path.join(internalPackagesRoot, 'framework-surfaces'),
    normalizePackageManifest(packageJsonByKey.frameworkSurfaces, packageVersionByName),
  );
  await copyPackage(
    packageMap.frameworkViewShot,
    path.join(internalPackagesRoot, 'framework-view-shot'),
    normalizePackageManifest(packageJsonByKey.frameworkViewShot, packageVersionByName),
  );
  await copyPackage(
    packageMap.frameworkWindowCapture,
    path.join(internalPackagesRoot, 'framework-window-capture'),
    normalizePackageManifest(
      packageJsonByKey.frameworkWindowCapture,
      packageVersionByName,
    ),
  );
  await copyPackage(
    packageMap.frameworkWindowing,
    path.join(internalPackagesRoot, 'framework-windowing'),
    normalizePackageManifest(packageJsonByKey.frameworkWindowing, packageVersionByName),
  );
  await copyPackage(
    packageMap.ui,
    path.join(internalPackagesRoot, 'ui-native-primitives'),
    normalizePackageManifest(packageJsonByKey.ui, packageVersionByName),
  );

  const env = {
    ...process.env,
    TEMP: process.env.TEMP || tempDir,
    TMP: process.env.TMP || tempDir,
    npm_config_cache: process.env.npm_config_cache || npmCache,
  };

  const packCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const packArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm', 'pack', '--pack-destination', distRoot]
    : ['pack', '--pack-destination', distRoot];

  const result = spawnSync(packCommand, packArgs, {
    cwd: packageRoot,
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const tarballPath = path.join(
    distRoot,
    `${normalizedAppPkg.name.replace('@', '').replace('/', '-')}-${normalizedAppPkg.version}.tgz`,
  );

  if (!existsSync(tarballPath)) {
    console.error('Expected tarball was not created:', tarballPath);
    process.exit(1);
  }

  console.log(`Packed companion artifact: ${tarballPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
