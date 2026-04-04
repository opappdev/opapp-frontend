import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export function run() {
  const repoRoot = path.resolve(process.cwd());
  const legacyCapabilityDirName = ['challenge', 'advisor'].join('-');
  const legacyCapabilityPackageName = ['@opapp/capability', legacyCapabilityDirName].join('-');
  const legacyCapabilityWorkspaceImporter = `capabilities/${legacyCapabilityDirName}:`;
  const legacyCapabilityPackageMapKey = ['capability', 'Challenge', 'Advisor'].join('');
  const legacyPrivateDomainDirName = ['lineup', 'advisor'].join('-');
  const legacyPrivateDomainPackageName = ['@opapp/domain', legacyPrivateDomainDirName].join('-');
  const legacyPrivateDomainWorkspaceImporter = `domains/${legacyPrivateDomainDirName}:`;
  const legacyPrivateDomainImportPath = ['..', '..', '..', '..', 'domains', legacyPrivateDomainDirName, 'src'].join(
    '/',
  );
  const legacyPublicEntryFile = `index.${legacyCapabilityDirName}.js`;
  const legacyPrivateSuffix = ['h', 'br'].join('');
  const legacyPrivateDirName = `.private-${legacyPrivateSuffix}`;
  const legacyPrivateEntryFile = `index.${legacyPrivateSuffix}.js`;
  const legacyRuntimeBundleKey = ['challenge', 'Advisor', 'BundleId'].join('');
  const legacySurfaceIdKey = ['companion', 'Challenge', 'Advisor'].join('');
  const legacyCapabilitySchemaPrefix = `opapp.${legacyCapabilityDirName}.`;
  const publicPrivateCompanionReportDirName = ['private', 'companion'].join('-');
  const rootPackage = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  ) as {
    scripts?: Record<string, string>;
  };
  const appPackage = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'apps', 'companion-app', 'package.json'),
      'utf8',
    ),
  ) as {
    dependencies?: Record<string, string>;
    files?: string[];
  };
  const challengeAdvisorPackageRoot = path.join(
    repoRoot,
    'capabilities',
    legacyCapabilityDirName,
  );
  const legacyPrivateDomainRoot = path.join(
    repoRoot,
    'domains',
    legacyPrivateDomainDirName,
  );
  const privateBundleEntryPath = path.join(
    repoRoot,
    'apps',
    'companion-app',
    '.private-companion',
    'src',
    'index.tsx',
  );
  const privateScreenPath = path.join(
    repoRoot,
    'apps',
    'companion-app',
    '.private-companion',
    'src',
    'ChallengeAdvisorScreen.tsx',
  );
  const privateDatasetHookPath = path.join(
    repoRoot,
    'apps',
    'companion-app',
    '.private-companion',
    'src',
    'useChallengeAdvisorDataset.ts',
  );
  const legacyLineupReportScriptPath = path.join(
    repoRoot,
    'tooling',
    'scripts',
    'report-lineup-placeholder-gaps.mjs',
  );
  const legacyLineupTestPath = path.join(
    repoRoot,
    'tooling',
    'tests',
    'lineup-advisor.test.ts',
  );
  const legacyChallengeAdvisorReportRoot = path.join(
    repoRoot,
    'tooling',
    'reports',
    legacyCapabilityDirName,
  );
  const legacyChallengeAdvisorDatasetFormatReportPath = path.join(
    legacyChallengeAdvisorReportRoot,
    'dataset-format.schema-template.v1.json',
  );
  const legacyChallengeAdvisorStyleIntakeLogPath = path.join(
    legacyChallengeAdvisorReportRoot,
    'style-intake-log.v1.json',
  );
  const legacyChallengeDataComplianceTestPath = path.join(
    repoRoot,
    'tooling',
    'tests',
    'challenge-data-provenance-compliance.test.ts',
  );
  const privateCompanionDatasetFormatReportPath = path.join(
    repoRoot,
    'tooling',
    'reports',
    publicPrivateCompanionReportDirName,
    'dataset-format.schema-template.v1.json',
  );
  const privateCompanionStyleIntakeLogPath = path.join(
    repoRoot,
    'tooling',
    'reports',
    publicPrivateCompanionReportDirName,
    'style-intake-log.v1.json',
  );
  const surfacesSource = fs.readFileSync(
    path.join(repoRoot, 'apps', 'companion-app', 'src', 'surfaces.ts'),
    'utf8',
  );
  const runtimeBundles = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'apps', 'companion-app', 'src', 'runtime-bundles.json'),
      'utf8',
    ),
  ) as Record<string, unknown>;
  const runtimeBundleList = Array.isArray(
    (runtimeBundles as {bundles?: unknown}).bundles,
  )
    ? ((runtimeBundles as {bundles?: unknown}).bundles as Array<{
        minHostVersion?: string;
      }>)
    : [];
  const surfaceIds = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'apps', 'companion-app', 'src', 'surface-ids.json'),
      'utf8',
    ),
  ) as Record<string, unknown>;
  const companionRuntimeSource = fs.readFileSync(
    path.join(repoRoot, 'apps', 'companion-app', 'src', 'companion-runtime.ts'),
    'utf8',
  );
  const packScript = fs.readFileSync(
    path.join(repoRoot, 'tooling', 'scripts', 'pack-companion.mjs'),
    'utf8',
  );
  const windowsBundleScript = fs.readFileSync(
    path.join(repoRoot, 'tooling', 'scripts', 'bundle-companion-windows.mjs'),
    'utf8',
  );
  const androidBundleScript = fs.readFileSync(
    path.join(repoRoot, 'tooling', 'scripts', 'bundle-companion-android.mjs'),
    'utf8',
  );
  const iosBundleScript = fs.readFileSync(
    path.join(repoRoot, 'tooling', 'scripts', 'bundle-companion-ios.mjs'),
    'utf8',
  );
  const tsconfig = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'tsconfig.json'), 'utf8'),
  ) as {
    compilerOptions?: {
      paths?: Record<string, unknown>;
    };
  };
  const lockfileSource = fs.readFileSync(
    path.join(repoRoot, 'pnpm-lock.yaml'),
    'utf8',
  );

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      appPackage.dependencies ?? {},
      legacyCapabilityPackageName,
    ),
    false,
    'app-companion must not declare the removed private capability workspace package as a public dependency.',
  );
  assert.deepEqual(
    appPackage.files?.includes('.private-companion'),
    true,
    'app-companion packaging must include the optional .private-companion directory as a whole.',
  );
  assert.deepEqual(
    appPackage.files?.includes(legacyPrivateDirName),
    false,
    'app-companion packaging must not keep the legacy private directory name.',
  );
  assert.deepEqual(
    appPackage.files?.includes(legacyPublicEntryFile),
    false,
    'app-companion must not keep shipping the legacy public capability entry.',
  );
  assert.equal(
    surfacesSource.includes(legacyCapabilityPackageName),
    false,
    'public companion surfaces must not import the removed private capability workspace package.',
  );
  assert.equal(
    fs.existsSync(challengeAdvisorPackageRoot),
    false,
    'public repo must not keep a tracked capability package once it has been moved behind the private boundary.',
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      rootPackage.scripts ?? {},
      'report:lineup-placeholders',
    ),
    false,
    'public package.json must not keep exposing the removed private-domain placeholder report script.',
  );
  if (fs.existsSync(privateBundleEntryPath)) {
    const privateBundleEntrySource = fs.readFileSync(privateBundleEntryPath, 'utf8');
    assert.equal(
      privateBundleEntrySource.includes(legacyCapabilityPackageName),
      false,
      'private companion entry must not reintroduce the removed capability workspace package import.',
    );
  }
  if (fs.existsSync(privateScreenPath)) {
    const privateScreenSource = fs.readFileSync(privateScreenPath, 'utf8');
    assert.equal(
      privateScreenSource.includes(legacyPrivateDomainImportPath),
      false,
      'private companion screen must not keep reaching back into the removed public lineup domain path.',
    );
  }
  if (fs.existsSync(privateDatasetHookPath)) {
    const privateDatasetHookSource = fs.readFileSync(privateDatasetHookPath, 'utf8');
    assert.equal(
      privateDatasetHookSource.includes(legacyPrivateDomainImportPath),
      false,
      'private companion dataset hook must not keep reaching back into the removed public lineup domain path.',
    );
  }
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      tsconfig.compilerOptions?.paths ?? {},
      legacyCapabilityPackageName,
    ),
    false,
    'public tsconfig paths must not keep exposing the removed private capability alias.',
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      tsconfig.compilerOptions?.paths ?? {},
      legacyPrivateDomainPackageName,
    ),
    false,
    'public tsconfig paths must not keep exposing the removed private domain alias.',
  );
  assert.equal(
    packScript.includes(legacyCapabilityPackageName),
    false,
    'pack-companion must not hardcode the removed private capability package name.',
  );
  assert.equal(
    lockfileSource.includes(legacyCapabilityPackageName),
    false,
    'pnpm-lock must not keep a public workspace dependency entry for the removed private capability package.',
  );
  assert.equal(
    lockfileSource.includes(legacyCapabilityWorkspaceImporter),
    false,
    'pnpm-lock must not keep a workspace importer for the removed public capability package.',
  );
  assert.equal(
    lockfileSource.includes(legacyPrivateDomainPackageName),
    false,
    'pnpm-lock must not keep a public workspace dependency entry for the removed private domain package.',
  );
  assert.equal(
    lockfileSource.includes(legacyPrivateDomainWorkspaceImporter),
    false,
    'pnpm-lock must not keep a workspace importer for the removed private domain package.',
  );
  assert.equal(
    packScript.includes(legacyCapabilityPackageMapKey),
    false,
    'pack-companion must not carry legacy capability-specific package map wiring.',
  );
  assert.equal(
    packScript.includes(legacyPrivateDomainPackageName),
    false,
    'pack-companion must not keep bundling the removed private domain logic into the public companion artifact.',
  );
  assert.equal(
    packScript.includes(legacyPrivateDirName),
    false,
    'pack-companion must not hardcode the legacy private directory name.',
  );
  assert.equal(
    windowsBundleScript.includes(legacyPrivateDirName),
    false,
    'bundle-companion-windows must not hardcode the legacy private directory name.',
  );
  assert.equal(
    windowsBundleScript.includes(legacyPrivateEntryFile),
    false,
    'bundle-companion-windows must not hardcode a private bundle entry filename.',
  );
  assert.equal(
    windowsBundleScript.includes(legacyRuntimeBundleKey),
    false,
    'bundle-companion-windows must not depend on tracked runtime metadata for a private bundle id.',
  );
  assert.equal(
    androidBundleScript.includes('surface-ids.json'),
    false,
    'Android bundle manifest generation must not advertise private-only surfaces through surface-ids.json.',
  );
  assert.equal(
    iosBundleScript.includes('surface-ids.json'),
    false,
    'iOS bundle manifest generation must not advertise private-only surfaces through surface-ids.json.',
  );
  assert.equal(
    androidBundleScript.includes('runtime-bundles.json'),
    true,
    'Android bundle manifest generation must derive surfaces from runtime-bundles.json.',
  );
  assert.equal(
    iosBundleScript.includes('runtime-bundles.json'),
    true,
    'iOS bundle manifest generation must derive surfaces from runtime-bundles.json.',
  );
  assert.equal(
    windowsBundleScript.includes('minHostVersion'),
    true,
    'Windows bundle manifest generation must preserve optional minHostVersion compatibility metadata.',
  );
  assert.equal(
    windowsBundleScript.includes('maxHostVersion'),
    true,
    'Windows bundle manifest generation must preserve optional maxHostVersion compatibility metadata.',
  );
  assert.equal(
    runtimeBundleList.every(
      bundle =>
        typeof bundle.minHostVersion === 'string' && bundle.minHostVersion.length > 0,
    ),
    true,
    'tracked runtime bundles must declare the current Windows host compatibility floor.',
  );
  assert.equal(
    runtimeBundles[legacyRuntimeBundleKey],
    undefined,
    'tracked runtime bundle metadata must not declare a removed private bundle id.',
  );
  assert.equal(
    surfaceIds[legacySurfaceIdKey],
    undefined,
    'tracked surface ids must not expose a removed private surface id.',
  );
  assert.equal(
    companionRuntimeSource.includes(`targetId: '${legacyCapabilityDirName}'`),
    false,
    'tracked companion runtime must not hardcode a removed private launch target.',
  );
  assert.equal(
    fs.existsSync(legacyPrivateDomainRoot),
    false,
    'public repo must not keep a tracked lineup domain package once it has been moved behind the private boundary.',
  );
  assert.equal(
    fs.existsSync(legacyLineupReportScriptPath),
    false,
    'public repo must not keep a tracked lineup placeholder report script after the domain moves behind the private boundary.',
  );
  assert.equal(
    fs.existsSync(legacyLineupTestPath),
    false,
    'public repo must not keep a tracked lineup domain test after the domain moves behind the private boundary.',
  );
  assert.equal(
    fs.existsSync(legacyChallengeAdvisorDatasetFormatReportPath),
    false,
    'public repo must not keep the legacy challenge-advisor dataset format report after the private companion rename.',
  );
  assert.equal(
    fs.existsSync(legacyChallengeAdvisorStyleIntakeLogPath),
    false,
    'public repo must not keep the legacy challenge-advisor style intake log after the private companion rename.',
  );
  assert.equal(
    fs.existsSync(legacyChallengeDataComplianceTestPath),
    false,
    'public repo must not keep the legacy challenge-data provenance compliance test filename after the private companion rename.',
  );
  if (fs.existsSync(privateCompanionDatasetFormatReportPath)) {
    const privateCompanionDatasetFormatReport = fs.readFileSync(
      privateCompanionDatasetFormatReportPath,
      'utf8',
    );
    assert.equal(
      privateCompanionDatasetFormatReport.includes(legacyCapabilitySchemaPrefix),
      false,
      'private companion dataset format report must not keep the legacy challenge-advisor schema namespace.',
    );
    assert.equal(
      privateCompanionDatasetFormatReport.includes(legacyPrivateDomainDirName),
      false,
      'private companion dataset format report must not keep the removed lineup-advisor path identity.',
    );
  }
  if (fs.existsSync(privateCompanionStyleIntakeLogPath)) {
    const privateCompanionStyleIntakeLog = fs.readFileSync(
      privateCompanionStyleIntakeLogPath,
      'utf8',
    );
    assert.equal(
      privateCompanionStyleIntakeLog.includes(legacyCapabilitySchemaPrefix),
      false,
      'private companion intake log must not keep the legacy challenge-advisor schema namespace.',
    );
  }
  assert.equal(
    fs.existsSync(
      path.join(
        repoRoot,
        'capabilities',
        legacyCapabilityDirName,
        'src',
        'useChallengeAdvisorDataset.ts',
      ),
    ),
    false,
    'public tracked capability package must not keep the dataset loader in source.',
  );
  assert.equal(
    fs.existsSync(
      path.join(
        repoRoot,
        'capabilities',
        legacyCapabilityDirName,
        'src',
        'useChallengeAdvisorPreferences.ts',
      ),
    ),
    false,
    'public tracked capability package must not keep the prefs persistence hook in source.',
  );
}
