import {companionBundleIds} from './companion-runtime';

export type RemoteBundleCatalogEntry = {
  bundleId: string;
  latestVersion: string | null;
  versions: string[];
  rolloutPercent: number | null;
  channels: Record<string, string> | null;
  surfaceIds: string[];
};

export type RemoteBundleLocalState = 'bundled' | 'staged' | 'remote-only';

export type BundleLauncherDiscoverySource = 'remote-catalog' | 'local-only';

type StagedBundleDiscoveryRecord = {
  bundleId: string;
  version: string | null;
  sourceKind: string | null;
  provenanceKind: string | null;
  provenanceStatus: string | null;
  provenanceStagedAt: string | null;
};

export type BundleLauncherDiscoveryEntry = RemoteBundleCatalogEntry & {
  localState: RemoteBundleLocalState;
  discoverySource: BundleLauncherDiscoverySource;
  localVersion: string | null;
  localSourceKind: string | null;
  localProvenanceKind: string | null;
  localProvenanceStatus: string | null;
  localProvenanceStagedAt: string | null;
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

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeStagedBundles(
  stagedBundles: ReadonlyArray<StagedBundleDiscoveryRecord>,
) {
  const normalizedEntries = new Map<string, StagedBundleDiscoveryRecord>();

  for (const bundle of stagedBundles) {
    const bundleId = normalizeOptionalString(bundle.bundleId);
    if (!bundleId || bundleId === companionBundleIds.main) {
      continue;
    }

    const previous = normalizedEntries.get(bundleId);
    normalizedEntries.set(bundleId, {
      bundleId,
      version: previous?.version ?? normalizeOptionalString(bundle.version),
      sourceKind:
        previous?.sourceKind ?? normalizeOptionalString(bundle.sourceKind),
      provenanceKind:
        previous?.provenanceKind ??
        normalizeOptionalString(bundle.provenanceKind),
      provenanceStatus:
        previous?.provenanceStatus ??
        normalizeOptionalString(bundle.provenanceStatus),
      provenanceStagedAt:
        previous?.provenanceStagedAt ??
        normalizeOptionalString(bundle.provenanceStagedAt),
    });
  }

  return [...normalizedEntries.values()].sort((left, right) =>
    left.bundleId.localeCompare(right.bundleId),
  );
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
        surfaceIds: [],
      };
    })
    .sort((left, right) => left.bundleId.localeCompare(right.bundleId));
}

export function parseRemoteBundleManifestSurfaceIds(raw: unknown) {
  if (!isRecord(raw)) {
    return [];
  }

  return [...new Set(normalizeStringArray(raw.surfaces))];
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
  stagedBundles,
}: {
  remoteEntries: ReadonlyArray<RemoteBundleCatalogEntry>;
  stagedBundles: ReadonlyArray<StagedBundleDiscoveryRecord>;
}): BundleLauncherDiscoveryEntry[] {
  const normalizedStagedBundles = normalizeStagedBundles(stagedBundles);
  const stagedBundleMap = new Map(
    normalizedStagedBundles.map(bundle => [bundle.bundleId, bundle] as const),
  );
  const remoteBundleIdSet = new Set(remoteEntries.map(entry => entry.bundleId));

  const entries: BundleLauncherDiscoveryEntry[] = remoteEntries.map(entry => ({
    ...entry,
    localVersion: stagedBundleMap.get(entry.bundleId)?.version ?? null,
    localSourceKind: stagedBundleMap.get(entry.bundleId)?.sourceKind ?? null,
    localProvenanceKind:
      stagedBundleMap.get(entry.bundleId)?.provenanceKind ?? null,
    localProvenanceStatus:
      stagedBundleMap.get(entry.bundleId)?.provenanceStatus ?? null,
    localProvenanceStagedAt:
      stagedBundleMap.get(entry.bundleId)?.provenanceStagedAt ?? null,
    localState: resolveRemoteBundleLocalState(
      entry.bundleId,
      stagedBundleMap.has(entry.bundleId),
    ),
    discoverySource: 'remote-catalog' as const,
  }));

  for (const bundle of normalizedStagedBundles) {
    const {bundleId} = bundle;
    if (remoteBundleIdSet.has(bundleId)) {
      continue;
    }

    entries.push({
      bundleId,
      latestVersion: null,
      versions: [],
      rolloutPercent: null,
      channels: null,
      surfaceIds: [],
      localVersion: bundle.version,
      localSourceKind: bundle.sourceKind,
      localProvenanceKind: bundle.provenanceKind,
      localProvenanceStatus: bundle.provenanceStatus,
      localProvenanceStagedAt: bundle.provenanceStagedAt,
      localState: 'staged',
      discoverySource: 'local-only',
    });
  }

  return entries;
}
