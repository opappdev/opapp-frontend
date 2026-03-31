import {appI18n} from '@opapp/framework-i18n';
import type {BundleUpdateStatus} from '@opapp/framework-windowing';
import type {
  BundleLauncherDiscoveryEntry,
  BundleLauncherDiscoverySource,
  RemoteBundleLocalState,
} from './bundle-launcher-discovery';
import type {
  CompanionLaunchTarget,
  CompanionStartupTarget,
} from './companion-runtime';
import {
  buildBundleLibraryMonogram,
  resolveBundleLibraryPresentation,
} from './bundle-library-presentation';

export type BundleLibraryGroupId =
  | 'updates'
  | 'installed'
  | 'available'
  | 'local';

export type BundleLibraryEntryState =
  | 'update-failed'
  | 'update-available'
  | 'installed'
  | 'install-available'
  | 'local-only'
  | 'remote-unavailable'
  | 'rollout-pending';

export type BundleLibraryActionKind = 'open' | 'update' | 'install' | 'none';

export type BundleLibraryTone =
  | 'accent'
  | 'support'
  | 'warning'
  | 'neutral'
  | 'danger';

export type BundleLibraryEntry = {
  bundleId: string;
  displayName: string;
  subtitle: string;
  monogram: string;
  group: BundleLibraryGroupId;
  state: BundleLibraryEntryState;
  stateLabel: string;
  stateTone: BundleLibraryTone;
  versionSummary: string;
  detailNote: string | null;
  primaryActionKind: BundleLibraryActionKind;
  primaryActionLabel: string | null;
  primaryActionTone: 'accent' | 'ghost';
  launchTargets: CompanionLaunchTarget[];
  defaultOpenTarget: CompanionLaunchTarget | null;
  selectedStartupTarget: CompanionLaunchTarget | null;
  updateStatus: BundleUpdateStatus | null;
  currentVersion: string | null;
  latestVersion: string | null;
  remoteUrl: string | null;
  channel: string | null;
  channels: Record<string, string> | null;
  rolloutPercent: number | null;
  inRollout: boolean | null;
  errorMessage: string | null;
  isDefaultStartupApp: boolean;
  isBusy: boolean;
  localState: RemoteBundleLocalState;
  discoverySource: BundleLauncherDiscoverySource;
  localSourceKind: string | null;
  localProvenanceKind: string | null;
  localProvenanceStatus: string | null;
  localProvenanceStagedAt: string | null;
};

function resolveEntryState({
  entry,
  updateStatus,
  hasConnectedUpdateService,
}: {
  entry: BundleLauncherDiscoveryEntry;
  updateStatus: BundleUpdateStatus | null;
  hasConnectedUpdateService: boolean;
}): BundleLibraryEntryState {
  if (
    updateStatus?.status === 'failed' ||
    entry.localProvenanceStatus === 'failed'
  ) {
    return 'update-failed';
  }

  if (entry.discoverySource === 'local-only') {
    return 'local-only';
  }

  if (!hasConnectedUpdateService) {
    return 'remote-unavailable';
  }

  if (updateStatus?.inRollout === false) {
    return 'rollout-pending';
  }

  if (entry.localState === 'remote-only') {
    return 'install-available';
  }

  if (updateStatus?.hasUpdate) {
    return 'update-available';
  }

  return 'installed';
}

function resolveEntryGroup(
  entry: BundleLauncherDiscoveryEntry,
  state: BundleLibraryEntryState,
): BundleLibraryGroupId {
  if (entry.discoverySource === 'local-only') {
    return 'local';
  }

  if (entry.localState === 'remote-only') {
    return 'available';
  }

  if (state === 'update-available' || state === 'update-failed') {
    return 'updates';
  }

  return 'installed';
}

function resolveEntryStateLabel(state: BundleLibraryEntryState) {
  switch (state) {
    case 'update-failed':
      return appI18n.bundleLauncher.library.states.updateFailed;
    case 'update-available':
      return appI18n.bundleLauncher.library.states.updateAvailable;
    case 'install-available':
      return appI18n.bundleLauncher.library.states.installAvailable;
    case 'local-only':
      return appI18n.bundleLauncher.library.states.localOnly;
    case 'remote-unavailable':
      return appI18n.bundleLauncher.library.states.remoteUnavailable;
    case 'rollout-pending':
      return appI18n.bundleLauncher.library.states.rolloutPending;
    default:
      return appI18n.bundleLauncher.library.states.installed;
  }
}

function resolveEntryStateTone(
  state: BundleLibraryEntryState,
): BundleLibraryTone {
  switch (state) {
    case 'update-failed':
      return 'danger';
    case 'update-available':
      return 'warning';
    case 'install-available':
      return 'accent';
    case 'local-only':
      return 'warning';
    case 'remote-unavailable':
      return 'neutral';
    case 'rollout-pending':
      return 'neutral';
    default:
      return 'support';
  }
}

function formatVersionSummary(
  currentVersion: string | null,
  latestVersion: string | null,
) {
  if (currentVersion && latestVersion && currentVersion !== latestVersion) {
    return appI18n.bundleLauncher.library.versionSummary.installedAndLatest(
      currentVersion,
      latestVersion,
    );
  }

  if (currentVersion) {
    return appI18n.bundleLauncher.library.versionSummary.current(currentVersion);
  }

  if (latestVersion) {
    return appI18n.bundleLauncher.library.versionSummary.latest(latestVersion);
  }

  return appI18n.bundleLauncher.library.versionSummary.unknown;
}

function resolveDetailNote(
  state: BundleLibraryEntryState,
  errorMessage: string | null,
) {
  switch (state) {
    case 'update-failed':
      return errorMessage ?? appI18n.bundleLauncher.library.notes.updateFailed;
    case 'local-only':
      return appI18n.bundleLauncher.library.notes.localOnly;
    case 'remote-unavailable':
      return appI18n.bundleLauncher.library.notes.remoteUnavailable;
    case 'rollout-pending':
      return appI18n.bundleLauncher.library.notes.rolloutPending;
    default:
      return null;
  }
}

function resolvePrimaryActionKind({
  entry,
  state,
  canManageUpdates,
  defaultOpenTarget,
}: {
  entry: BundleLauncherDiscoveryEntry;
  state: BundleLibraryEntryState;
  canManageUpdates: boolean;
  defaultOpenTarget: CompanionLaunchTarget | null;
}): BundleLibraryActionKind {
  if (!defaultOpenTarget) {
    return 'none';
  }

  if (state === 'update-available' && canManageUpdates) {
    return 'update';
  }

  if (entry.localState === 'remote-only') {
    return canManageUpdates ? 'install' : 'none';
  }

  return 'open';
}

function resolvePrimaryActionLabel(kind: BundleLibraryActionKind) {
  switch (kind) {
    case 'update':
      return appI18n.bundleLauncher.actions.update;
    case 'install':
      return appI18n.bundleLauncher.actions.install;
    case 'open':
      return appI18n.bundleLauncher.actions.open;
    default:
      return null;
  }
}

function resolvePrimaryActionTone(kind: BundleLibraryActionKind) {
  return kind === 'open' ? 'ghost' : 'accent';
}

function pickLaunchTarget(
  launchTargets: ReadonlyArray<CompanionLaunchTarget>,
  targetId?: string | null,
) {
  if (!targetId) {
    return launchTargets[0] ?? null;
  }

  return (
    launchTargets.find(target => target.targetId === targetId) ??
    launchTargets[0] ??
    null
  );
}

const groupRank: Record<BundleLibraryGroupId, number> = {
  updates: 0,
  installed: 1,
  available: 2,
  local: 3,
};

const stateRank: Record<BundleLibraryEntryState, number> = {
  'update-available': 0,
  installed: 1,
  'install-available': 2,
  'local-only': 3,
  'remote-unavailable': 4,
  'rollout-pending': 5,
  'update-failed': 6,
};

export function buildBundleLibraryEntries({
  discoveryEntries,
  launchTargetsByBundleId,
  updateStatuses,
  savedStartupTarget,
  startupTargetSelections,
  hasConnectedUpdateService,
  canManageUpdates,
  busyBundleId,
}: {
  discoveryEntries: ReadonlyArray<BundleLauncherDiscoveryEntry>;
  launchTargetsByBundleId: ReadonlyMap<string, CompanionLaunchTarget[]>;
  updateStatuses: ReadonlyArray<BundleUpdateStatus>;
  savedStartupTarget: CompanionStartupTarget | null;
  startupTargetSelections: Readonly<Record<string, string | undefined>>;
  hasConnectedUpdateService: boolean;
  canManageUpdates: boolean;
  busyBundleId?: string | null;
}): BundleLibraryEntry[] {
  const updateStatusByBundleId = new Map(
    updateStatuses.map(status => [status.bundleId, status] as const),
  );

  const entries: BundleLibraryEntry[] = [];

  for (const entry of discoveryEntries) {
    const launchTargets = launchTargetsByBundleId.get(entry.bundleId) ?? [];
    if (launchTargets.length === 0) {
      continue;
    }

    const presentation = resolveBundleLibraryPresentation({
      bundleId: entry.bundleId,
      firstLaunchTargetTitle: launchTargets[0]?.title ?? null,
    });
    const updateStatus = updateStatusByBundleId.get(entry.bundleId) ?? null;
    const currentVersion =
      updateStatus?.currentVersion ?? entry.localVersion ?? null;
    const latestVersion =
      updateStatus?.latestVersion ?? entry.latestVersion ?? null;
    const defaultOpenTarget = pickLaunchTarget(
      launchTargets,
      presentation.defaultOpenTargetId,
    );
    const selectedStartupTarget = pickLaunchTarget(
      launchTargets,
      startupTargetSelections[entry.bundleId] ??
        (savedStartupTarget?.bundleId === entry.bundleId
          ? launchTargets.find(
              target => target.surfaceId === savedStartupTarget.surfaceId,
            )?.targetId
          : presentation.defaultOpenTargetId),
    );
    const state = resolveEntryState({
      entry,
      updateStatus,
      hasConnectedUpdateService,
    });
    const group = resolveEntryGroup(entry, state);
    const primaryActionKind = resolvePrimaryActionKind({
      entry,
      state,
      canManageUpdates,
      defaultOpenTarget,
    });

    entries.push({
      bundleId: entry.bundleId,
      displayName: presentation.displayName,
      subtitle: presentation.subtitle,
      monogram: buildBundleLibraryMonogram(
        presentation.displayName,
        entry.bundleId,
      ),
      group,
      state,
      stateLabel: resolveEntryStateLabel(state),
      stateTone: resolveEntryStateTone(state),
      versionSummary: formatVersionSummary(currentVersion, latestVersion),
      detailNote: resolveDetailNote(state, updateStatus?.errorMessage ?? null),
      primaryActionKind,
      primaryActionLabel: resolvePrimaryActionLabel(primaryActionKind),
      primaryActionTone: resolvePrimaryActionTone(primaryActionKind),
      launchTargets,
      defaultOpenTarget,
      selectedStartupTarget,
      updateStatus,
      currentVersion,
      latestVersion,
      remoteUrl: updateStatus?.remoteUrl ?? null,
      channel: updateStatus?.channel ?? null,
      channels: updateStatus?.channels ?? entry.channels ?? null,
      rolloutPercent:
        updateStatus?.rolloutPercent ?? entry.rolloutPercent ?? null,
      inRollout: updateStatus?.inRollout ?? null,
      errorMessage: updateStatus?.errorMessage ?? null,
      isDefaultStartupApp: savedStartupTarget?.bundleId === entry.bundleId,
      isBusy: busyBundleId === entry.bundleId,
      localState: entry.localState,
      discoverySource: entry.discoverySource,
      localSourceKind: entry.localSourceKind,
      localProvenanceKind: entry.localProvenanceKind,
      localProvenanceStatus: entry.localProvenanceStatus,
      localProvenanceStagedAt: entry.localProvenanceStagedAt,
    });
  }

  return entries.sort((left, right) => {
      const leftGroupRank = groupRank[left.group];
      const rightGroupRank = groupRank[right.group];
      if (leftGroupRank !== rightGroupRank) {
        return leftGroupRank - rightGroupRank;
      }

      if (left.isDefaultStartupApp !== right.isDefaultStartupApp) {
        return left.isDefaultStartupApp ? -1 : 1;
      }

      if (left.isBusy !== right.isBusy) {
        return left.isBusy ? -1 : 1;
      }

      const leftStateRank = stateRank[left.state];
      const rightStateRank = stateRank[right.state];
      if (leftStateRank !== rightStateRank) {
        return leftStateRank - rightStateRank;
      }

      return left.displayName.localeCompare(right.displayName, 'zh-CN');
    });
}
