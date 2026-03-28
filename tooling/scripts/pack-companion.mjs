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
  capabilitySettings: path.join(repoRoot, 'capabilities', 'settings'),
  contractsWindowing: path.join(repoRoot, 'contracts', 'windowing'),
  frameworkI18n: path.join(repoRoot, 'framework', 'i18n'),
  frameworkDiagnostics: path.join(repoRoot, 'framework', 'diagnostics'),
  frameworkFilesystem: path.join(repoRoot, 'framework', 'filesystem'),
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

async function main() {
  const appPkg = await readJson(path.join(packageMap.app, 'package.json'));
  const capabilitySettingsPkg = await readJson(
    path.join(packageMap.capabilitySettings, 'package.json'),
  );
  const contractsWindowingPkg = await readJson(
    path.join(packageMap.contractsWindowing, 'package.json'),
  );
  const frameworkI18nPkg = await readJson(
    path.join(packageMap.frameworkI18n, 'package.json'),
  );
  const frameworkDiagnosticsPkg = await readJson(
    path.join(packageMap.frameworkDiagnostics, 'package.json'),
  );
  const frameworkFilesystemPkg = await readJson(
    path.join(packageMap.frameworkFilesystem, 'package.json'),
  );
  const frameworkSurfacesPkg = await readJson(
    path.join(packageMap.frameworkSurfaces, 'package.json'),
  );
  const frameworkViewShotPkg = await readJson(
    path.join(packageMap.frameworkViewShot, 'package.json'),
  );
  const frameworkWindowCapturePkg = await readJson(
    path.join(packageMap.frameworkWindowCapture, 'package.json'),
  );
  const frameworkWindowingPkg = await readJson(
    path.join(packageMap.frameworkWindowing, 'package.json'),
  );
  const uiPkg = await readJson(path.join(packageMap.ui, 'package.json'));

  await rm(stageRoot, {recursive: true, force: true});
  await mkdir(internalPackagesRoot, {recursive: true});
  await mkdir(distRoot, {recursive: true});

  const normalizedUiPkg = {
    ...uiPkg,
    private: false,
  };

  const normalizedContractsWindowingPkg = {
    ...contractsWindowingPkg,
    private: false,
  };

  const normalizedFrameworkI18nPkg = {
    ...frameworkI18nPkg,
    private: false,
  };

  const normalizedFrameworkDiagnosticsPkg = {
    ...frameworkDiagnosticsPkg,
    private: false,
  };

  const normalizedFrameworkFilesystemPkg = {
    ...frameworkFilesystemPkg,
    private: false,
  };

  const normalizedFrameworkSurfacesPkg = {
    ...frameworkSurfacesPkg,
    private: false,
    dependencies: {
      '@opapp/contracts-windowing': contractsWindowingPkg.version,
    },
  };

  const normalizedFrameworkViewShotPkg = {
    ...frameworkViewShotPkg,
    private: false,
  };

  const normalizedFrameworkWindowCapturePkg = {
    ...frameworkWindowCapturePkg,
    private: false,
  };

  const normalizedFrameworkWindowingPkg = {
    ...frameworkWindowingPkg,
    private: false,
    dependencies: {
      '@opapp/contracts-windowing': contractsWindowingPkg.version,
      '@opapp/framework-surfaces': frameworkSurfacesPkg.version,
    },
  };

  const normalizedCapabilitySettingsPkg = {
    ...capabilitySettingsPkg,
    private: false,
    dependencies: {
      '@opapp/contracts-windowing': contractsWindowingPkg.version,
      '@opapp/framework-i18n': frameworkI18nPkg.version,
      '@opapp/framework-windowing': frameworkWindowingPkg.version,
      '@opapp/ui-native-primitives': uiPkg.version,
    },
  };

  const normalizedAppPkg = {
    ...appPkg,
    private: false,
    dependencies: {
      '@opapp/capability-settings': capabilitySettingsPkg.version,
      '@opapp/contracts-windowing': contractsWindowingPkg.version,
      '@opapp/framework-i18n': frameworkI18nPkg.version,
      '@opapp/framework-filesystem': frameworkFilesystemPkg.version,
      '@opapp/framework-diagnostics': frameworkDiagnosticsPkg.version,
      '@opapp/framework-surfaces': frameworkSurfacesPkg.version,
      '@opapp/framework-view-shot': frameworkViewShotPkg.version,
      '@opapp/framework-window-capture': frameworkWindowCapturePkg.version,
      '@opapp/framework-windowing': frameworkWindowingPkg.version,
      '@opapp/ui-native-primitives': uiPkg.version,
    },
    bundledDependencies: [
      '@opapp/capability-settings',
      '@opapp/contracts-windowing',
      '@opapp/framework-i18n',
      '@opapp/framework-filesystem',
      '@opapp/framework-diagnostics',
      '@opapp/framework-surfaces',
      '@opapp/framework-view-shot',
      '@opapp/framework-window-capture',
      '@opapp/framework-windowing',
      '@opapp/ui-native-primitives',
    ],
  };

  await copyPackage(packageMap.app, packageRoot, normalizedAppPkg, [
    'app.json',
    'index.js',
    'index.main.js',
    '.private-companion',
    'babel.config.js',
    'metro.config.js',
  ]);
  await copyPackage(
    packageMap.capabilitySettings,
    path.join(internalPackagesRoot, 'capability-settings'),
    normalizedCapabilitySettingsPkg,
  );
  await copyPackage(
    packageMap.contractsWindowing,
    path.join(internalPackagesRoot, 'contracts-windowing'),
    normalizedContractsWindowingPkg,
  );
  await copyPackage(
    packageMap.frameworkI18n,
    path.join(internalPackagesRoot, 'framework-i18n'),
    normalizedFrameworkI18nPkg,
  );
  await copyPackage(
    packageMap.frameworkDiagnostics,
    path.join(internalPackagesRoot, 'framework-diagnostics'),
    normalizedFrameworkDiagnosticsPkg,
  );
  await copyPackage(
    packageMap.frameworkFilesystem,
    path.join(internalPackagesRoot, 'framework-filesystem'),
    normalizedFrameworkFilesystemPkg,
  );
  await copyPackage(
    packageMap.frameworkSurfaces,
    path.join(internalPackagesRoot, 'framework-surfaces'),
    normalizedFrameworkSurfacesPkg,
  );
  await copyPackage(
    packageMap.frameworkViewShot,
    path.join(internalPackagesRoot, 'framework-view-shot'),
    normalizedFrameworkViewShotPkg,
  );
  await copyPackage(
    packageMap.frameworkWindowCapture,
    path.join(internalPackagesRoot, 'framework-window-capture'),
    normalizedFrameworkWindowCapturePkg,
  );
  await copyPackage(
    packageMap.frameworkWindowing,
    path.join(internalPackagesRoot, 'framework-windowing'),
    normalizedFrameworkWindowingPkg,
  );
  await copyPackage(
    packageMap.ui,
    path.join(internalPackagesRoot, 'ui-native-primitives'),
    normalizedUiPkg,
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
