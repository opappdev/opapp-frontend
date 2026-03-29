import {companionBundleIds} from './companion-runtime';

export type RemoteBundleCatalogEntry = {
  bundleId: string;
  latestVersion: string | null;
  versions: string[];
  rolloutPercent: number | null;
  channels: Record<string, string> | null;
};

export type RemoteBundleLocalState = 'bundled' | 'staged' | 'remote-only';

export type BundleLauncherDiscoverySource = 'remote-catalog' | 'local-only';

export type BundleLauncherDiscoveryEntry = RemoteBundleCatalogEntry & {
  localState: RemoteBundleLocalState;
  discoverySource: BundleLauncherDiscoverySource;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(Boolean)
    .sort();
}

function normalizeChannels(
  value: unknown,
  versions: ReadonlyArray<string>,
): Record<string, string> | null {
  if (!isRecord(value)) {
    return null;
  }

  const versionSet = new Set(versions);
  const entries = Object.entries(value).flatMap(([channel, version]) => {
    if (channel.trim().length === 0 || typeof version !== 'string') {
      return [];
    }

    const normalizedVersion = version.trim();
    if (
      normalizedVersion.length === 0 ||
      (versionSet.size > 0 && !versionSet.has(normalizedVersion))
    ) {
      return [];
    }

    return [[channel.trim(), normalizedVersion] as const];
  });

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(
    entries.sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizeRolloutPercent(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return clamped < 100 ? clamped : null;
}

export function parseRemoteBundleCatalogIndex(
  raw: unknown,
): RemoteBundleCatalogEntry[] {
  if (!isRecord(raw) || !isRecord(raw.bundles)) {
    return [];
  }

  return Object.entries(raw.bundles)
    .filter(([bundleId]) => bundleId.trim().length > 0)
    .map(([bundleId, bundleInfo]) => {
      const normalizedBundleId = bundleId.trim();
      const normalizedInfo = isRecord(bundleInfo) ? bundleInfo : {};
      const versions = normalizeStringArray(normalizedInfo.versions);
      const latestVersionCandidate =
        typeof normalizedInfo.latestVersion === 'string'
          ? normalizedInfo.latestVersion.trim()
          : '';
      const latestVersion =
        latestVersionCandidate && (versions.length === 0 || versions.includes(latestVersionCandidate))
          ? latestVersionCandidate
          : versions.at(-1) ?? null;

      return {
        bundleId: normalizedBundleId,
        latestVersion,
        versions,
        rolloutPercent: normalizeRolloutPercent(normalizedInfo.rolloutPercent),
        channels: normalizeChannels(normalizedInfo.channels, versions),
      };
    })
    .sort((left, right) => left.bundleId.localeCompare(right.bundleId));
}

export function resolveRemoteBundleLocalState(
  bundleId: string,
  locallyOpenable: boolean | null | undefined,
): RemoteBundleLocalState {
  if (bundleId === companionBundleIds.main) {
    return 'bundled';
  }

  return locallyOpenable ? 'staged' : 'remote-only';
}

export function buildBundleLauncherDiscoveryEntries({
  remoteEntries,
  stagedBundleIds,
}: {
  remoteEntries: ReadonlyArray<RemoteBundleCatalogEntry>;
  stagedBundleIds: ReadonlyArray<string>;
}): BundleLauncherDiscoveryEntry[] {
  const normalizedStagedBundleIds = normalizeStringArray(stagedBundleIds).filter(
    bundleId => bundleId !== companionBundleIds.main,
  );
  const stagedBundleIdSet = new Set(normalizedStagedBundleIds);
  const remoteBundleIdSet = new Set(remoteEntries.map(entry => entry.bundleId));

  const entries: BundleLauncherDiscoveryEntry[] = remoteEntries.map(entry => ({
    ...entry,
    localState: resolveRemoteBundleLocalState(
      entry.bundleId,
      stagedBundleIdSet.has(entry.bundleId),
    ),
    discoverySource: 'remote-catalog' as const,
  }));

  for (const bundleId of normalizedStagedBundleIds) {
    if (remoteBundleIdSet.has(bundleId)) {
      continue;
    }

    entries.push({
      bundleId,
      latestVersion: null,
      versions: [],
      rolloutPercent: null,
      channels: null,
      localState: 'staged',
      discoverySource: 'local-only',
    });
  }

  return entries;
}
