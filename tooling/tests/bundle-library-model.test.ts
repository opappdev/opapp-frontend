import assert from 'node:assert/strict';
import {buildBundleLauncherDiscoveryEntries} from '../../apps/companion-app/src/bundle-launcher-discovery';
import {
  buildBundleLibraryEntries,
  resolveBundleLibraryOpenTarget,
  type BundleLibraryEntry,
} from '../../apps/companion-app/src/bundle-library-model';
import {
  companionBundleIds,
  companionLaunchTargets,
  type CompanionLaunchTarget,
} from '../../apps/companion-app/src/companion-runtime';

function createLaunchTarget(
  bundleId: string,
  surfaceId: string,
  title: string,
): CompanionLaunchTarget {
  return {
    targetId: `${bundleId}:${surfaceId}`,
    title,
    description: `${title} description`,
    surfaceId,
    bundleId,
    policy: 'main',
    presentation: 'current-window',
  };
}

function findEntry(entries: BundleLibraryEntry[], bundleId: string) {
  const entry = entries.find(candidate => candidate.bundleId === bundleId);
  assert.ok(entry, `Expected entry ${bundleId} to exist.`);
  return entry;
}

export function run() {
  const discoveryEntries = buildBundleLauncherDiscoveryEntries({
    remoteEntries: [
      {
        bundleId: companionBundleIds.main,
        latestVersion: '0.1.3',
        versions: ['0.1.3'],
        rolloutPercent: null,
        channels: {stable: '0.1.3'},
        surfaceIds: ['companion.main'],
      },
      {
        bundleId: 'opapp.hbr.workspace',
        latestVersion: '0.1.3',
        versions: ['0.1.2', '0.1.3'],
        rolloutPercent: 25,
        channels: {nightly: '0.1.3'},
        surfaceIds: ['hbr.challenge-advisor'],
      },
      {
        bundleId: 'opapp.hbr.stellar-sweep',
        latestVersion: '0.2.0',
        versions: ['0.2.0'],
        rolloutPercent: null,
        channels: {stable: '0.2.0'},
        surfaceIds: ['hbr.stellar-sweep'],
      },
      {
        bundleId: companionBundleIds.chat,
        latestVersion: '0.1.0',
        versions: ['0.1.0'],
        rolloutPercent: null,
        channels: {stable: '0.1.0'},
        surfaceIds: ['companion.chat.main'],
      },
      {
        bundleId: 'opapp.hidden.tool',
        latestVersion: '0.1.0',
        versions: ['0.1.0'],
        rolloutPercent: null,
        channels: null,
        surfaceIds: ['hidden.tool'],
      },
    ],
    stagedBundles: [
      {
        bundleId: 'opapp.hbr.workspace',
        version: '0.1.2',
        sourceKind: 'sibling-staging',
        provenanceKind: 'native-ota-applied',
        provenanceStatus: 'updated',
        provenanceStagedAt: '2026-03-31T00:00:00.000Z',
      },
      {
        bundleId: 'opapp.private.shadow',
        version: '0.0.9',
        sourceKind: 'local-build',
        provenanceKind: 'host-staged-only',
        provenanceStatus: null,
        provenanceStagedAt: null,
      },
    ],
  });

  const launchTargetsByBundleId = new Map<string, CompanionLaunchTarget[]>([
    [
      companionBundleIds.main,
      companionLaunchTargets.filter(
        target => target.bundleId === companionBundleIds.main,
      ),
    ],
    [
      companionBundleIds.chat,
      companionLaunchTargets.filter(
        target => target.bundleId === companionBundleIds.chat,
      ),
    ],
    [
      'opapp.hbr.workspace',
      [createLaunchTarget('opapp.hbr.workspace', 'hbr.challenge-advisor', '挑战场景作战板')],
    ],
    [
      'opapp.hbr.stellar-sweep',
      [createLaunchTarget('opapp.hbr.stellar-sweep', 'hbr.stellar-sweep', '恒星战实验场')],
    ],
    [
      'opapp.private.shadow',
      [createLaunchTarget('opapp.private.shadow', 'shadow.home', '影子应用')],
    ],
  ]);

  const entries = buildBundleLibraryEntries({
    discoveryEntries,
    launchTargetsByBundleId,
    updateStatuses: [
      {
        bundleId: companionBundleIds.main,
        remoteUrl: 'https://r2.opapp.dev',
        channel: 'stable',
        currentVersion: '0.1.3',
        latestVersion: '0.1.3',
        version: '0.1.3',
        previousVersion: null,
        hasUpdate: false,
        inRollout: true,
        rolloutPercent: null,
        status: 'up-to-date',
        stagedAt: null,
        recordedAt: '2026-03-31T00:00:00.000Z',
        channels: {stable: '0.1.3'},
        errorMessage: null,
      },
      {
        bundleId: 'opapp.hbr.workspace',
        remoteUrl: 'https://r2.opapp.dev',
        channel: 'nightly',
        currentVersion: '0.1.2',
        latestVersion: '0.1.3',
        version: '0.1.2',
        previousVersion: '0.1.1',
        hasUpdate: true,
        inRollout: true,
        rolloutPercent: 25,
        status: 'update-available',
        stagedAt: '2026-03-31T00:00:00.000Z',
        recordedAt: '2026-03-31T00:00:00.000Z',
        channels: {nightly: '0.1.3'},
        errorMessage: null,
      },
      {
        bundleId: 'opapp.hbr.stellar-sweep',
        remoteUrl: 'https://r2.opapp.dev',
        channel: 'stable',
        currentVersion: null,
        latestVersion: '0.2.0',
        version: null,
        previousVersion: null,
        hasUpdate: true,
        inRollout: true,
        rolloutPercent: null,
        status: 'install-available',
        stagedAt: null,
        recordedAt: '2026-03-31T00:00:00.000Z',
        channels: {stable: '0.2.0'},
        errorMessage: null,
      },
    ],
    savedStartupTarget: {
      surfaceId: 'hbr.challenge-advisor',
      bundleId: 'opapp.hbr.workspace',
      policy: 'main',
      presentation: 'current-window',
    },
    startupTargetSelections: {
      'opapp.hbr.workspace': 'opapp.hbr.workspace:hbr.challenge-advisor',
    },
    hasConnectedUpdateService: true,
    canManageUpdates: true,
    busyBundleId: 'opapp.hbr.stellar-sweep',
  });

  assert.equal(entries.some(entry => entry.bundleId === 'opapp.hidden.tool'), false);

  const workspaceEntry = findEntry(entries, 'opapp.hbr.workspace');
  assert.equal(workspaceEntry.group, 'updates');
  assert.equal(workspaceEntry.state, 'update-available');
  assert.equal(workspaceEntry.primaryActionKind, 'update');
  assert.equal(workspaceEntry.isDefaultStartupApp, true);

  const mainEntry = findEntry(entries, companionBundleIds.main);
  assert.equal(mainEntry.group, 'installed');
  assert.equal(mainEntry.state, 'installed');
  assert.equal(mainEntry.primaryActionKind, 'open');
  assert.equal(
    resolveBundleLibraryOpenTarget(mainEntry)?.targetId,
    mainEntry.defaultOpenTarget?.targetId,
  );

  const customizedMainEntry = {
    ...mainEntry,
    selectedStartupTarget: companionLaunchTargets.find(
      target => target.targetId === 'settings',
    )!,
  };
  assert.equal(
    resolveBundleLibraryOpenTarget(customizedMainEntry)?.targetId,
    'settings',
  );

  const chatEntry = findEntry(entries, companionBundleIds.chat);
  assert.equal(chatEntry.group, 'available');
  assert.equal(chatEntry.state, 'install-available');
  assert.equal(chatEntry.primaryActionKind, 'install');

  const installableEntry = findEntry(entries, 'opapp.hbr.stellar-sweep');
  assert.equal(installableEntry.group, 'available');
  assert.equal(installableEntry.state, 'install-available');
  assert.equal(installableEntry.primaryActionKind, 'install');
  assert.equal(installableEntry.isBusy, true);

  const localOnlyEntry = findEntry(entries, 'opapp.private.shadow');
  assert.equal(localOnlyEntry.group, 'local');
  assert.equal(localOnlyEntry.state, 'local-only');

  const installableIndex = entries.findIndex(
    entry => entry.bundleId === 'opapp.hbr.stellar-sweep',
  );
  const localOnlyIndex = entries.findIndex(
    entry => entry.bundleId === 'opapp.private.shadow',
  );
  assert.ok(installableIndex >= 0 && localOnlyIndex > installableIndex);
}
