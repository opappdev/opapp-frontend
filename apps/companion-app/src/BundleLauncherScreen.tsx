import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {logInteraction} from '@opapp/framework-diagnostics';
import {
  canOpenBundleTarget,
  getCachedOtaRemoteCatalog,
  getStagedBundles,
  getOtaRemoteUrl,
  type StagedBundleRecord,
  useCurrentWindowId,
  useOpenSurface,
} from '@opapp/framework-windowing';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  AppFrame,
  ChoiceChip,
  MutedText,
  SectionCard,
  SignalPill,
  Stack,
  appPalette,
  appRadius,
  appSpacing,
  appTypography,
} from '@opapp/ui-native-primitives';
import {
  buildBundleLauncherDiscoveryEntries,
  parseRemoteBundleCatalogIndex,
  parseRemoteBundleManifestSurfaceIds,
  type RemoteBundleCatalogEntry,
} from './bundle-launcher-discovery';
import {
  areCompanionTargetsEqual,
  buildDiscoveredCompanionLaunchTargets,
  companionBundleIds,
  companionLaunchTargets,
  createCompanionOpenSurfaceRequest,
  defaultCompanionStartupTarget,
  findCompanionLaunchTarget,
  type CompanionLaunchTarget,
  type CompanionStartupTarget,
} from './companion-runtime';
import {useCompanionStartupTarget} from './useCompanionStartupTarget';

type BundleLauncherScreenProps = {
  devSmokeScenario?: string;
};

type RemoteCatalogState =
  | {
      status: 'loading';
      source: 'pending';
      remoteUrl: string | null;
      entries: RemoteBundleCatalogEntry[];
      errorMessage: string | null;
    }
  | {
      status: 'ready' | 'unavailable' | 'error';
      source: 'cache' | 'network' | 'unavailable' | 'error';
      remoteUrl: string | null;
      entries: RemoteBundleCatalogEntry[];
      errorMessage: string | null;
    };

const remoteCatalogRequestTimeoutMs = 5_000;

async function queryBundleAvailability(bundleIds: ReadonlyArray<string>) {
  const uniqueBundleIds = [...new Set(bundleIds.map(bundleId => bundleId.trim()).filter(Boolean))];

  if (uniqueBundleIds.length === 0) {
    return {};
  }

  const availabilityEntries = await Promise.all(
    uniqueBundleIds.map(async bundleId => [bundleId, await canOpenBundleTarget(bundleId)] as const),
  );

  return Object.fromEntries(availabilityEntries);
}

function formatRemoteCatalogErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return appI18n.bundleLauncher.remoteCatalog.errorFallback;
}

async function fetchJsonWithTimeout(url: string) {
  const response = await Promise.race([
    fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Timed out after ${remoteCatalogRequestTimeoutMs}ms while fetching ${url}`,
          ),
        );
      }, remoteCatalogRequestTimeoutMs);
    }),
  ]);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function attachRemoteBundleManifestSurfaceIds(
  entries: ReadonlyArray<RemoteBundleCatalogEntry>,
  normalizedRemoteUrl: string,
  cachedManifests?: Record<string, Record<string, unknown>>,
) {
  let usedNetwork = false;
  const hydratedEntries = await Promise.all(
    entries.map(async entry => {
      if (!entry.latestVersion) {
        return entry;
      }

      const cachedManifestPayload =
        cachedManifests?.[entry.bundleId]?.[entry.latestVersion];
      if (cachedManifestPayload) {
        return {
          ...entry,
          surfaceIds: parseRemoteBundleManifestSurfaceIds(cachedManifestPayload),
        };
      }

      try {
        const manifestPayload = await fetchJsonWithTimeout(
          `${normalizedRemoteUrl}/${encodeURIComponent(entry.bundleId)}/${encodeURIComponent(entry.latestVersion)}/windows/bundle-manifest.json`,
        );
        usedNetwork = true;
        return {
          ...entry,
          surfaceIds: parseRemoteBundleManifestSurfaceIds(manifestPayload),
        };
      } catch (error) {
        console.warn('Failed to fetch remote bundle manifest', {
          bundleId: entry.bundleId,
          version: entry.latestVersion,
          error,
        });
        return entry;
      }
    }),
  );

  return {
    entries: hydratedEntries,
    usedNetwork,
  };
}

async function fetchRemoteBundleCatalog() {
  const remoteUrl = await getOtaRemoteUrl();
  if (!remoteUrl) {
    return {
      status: 'unavailable' as const,
      source: 'unavailable' as const,
      remoteUrl: null,
      entries: [],
      errorMessage: null,
    };
  }

  const normalizedRemoteUrl = remoteUrl.replace(/\/+$/, '');
  const cachedRemoteCatalog = await getCachedOtaRemoteCatalog();
  const cachedRemoteUrl = cachedRemoteCatalog?.remoteUrl?.replace(/\/+$/, '') ?? null;
  if (cachedRemoteCatalog?.index && cachedRemoteUrl === normalizedRemoteUrl) {
    const {entries, usedNetwork} = await attachRemoteBundleManifestSurfaceIds(
      parseRemoteBundleCatalogIndex(cachedRemoteCatalog.index),
      normalizedRemoteUrl,
      cachedRemoteCatalog.manifests,
    );

    return {
      status: 'ready' as const,
      source: usedNetwork ? ('network' as const) : ('cache' as const),
      remoteUrl: normalizedRemoteUrl,
      entries,
      errorMessage: null,
    };
  }

  try {
    const payload = await fetchJsonWithTimeout(`${normalizedRemoteUrl}/index.json`);
    const {entries} = await attachRemoteBundleManifestSurfaceIds(
      parseRemoteBundleCatalogIndex(payload),
      normalizedRemoteUrl,
    );

    return {
      status: 'ready' as const,
      source: 'network' as const,
      remoteUrl: normalizedRemoteUrl,
      entries,
      errorMessage: null,
    };
  } catch (error) {
    return {
      status: 'error' as const,
      source: 'error' as const,
      remoteUrl: normalizedRemoteUrl,
      entries: [],
      errorMessage: formatRemoteCatalogErrorMessage(error),
    };
  }
}

function formatRemoteChannels(channels: Record<string, string> | null) {
  if (!channels || Object.keys(channels).length === 0) {
    return appI18n.bundleLauncher.remoteCatalog.channelsEmpty;
  }

  return Object.entries(channels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([channel, version]) => `${channel}=${version}`)
    .join(' / ');
}

function formatStagedSourceKind(sourceKind: string | null) {
  switch (sourceKind) {
    case 'local-build':
      return appI18n.bundleLauncher.remoteCatalog.sourceKind.localBuild;
    case 'sibling-staging':
      return appI18n.bundleLauncher.remoteCatalog.sourceKind.siblingStaging;
    default:
      return sourceKind ?? appI18n.common.unknown;
  }
}

function formatStagedProvenanceKind(provenanceKind: string | null) {
  switch (provenanceKind) {
    case 'native-ota-applied':
      return appI18n.bundleLauncher.remoteCatalog.provenanceKind.nativeOtaApplied;
    case 'host-staged-only':
      return appI18n.bundleLauncher.remoteCatalog.provenanceKind.hostStagedOnly;
    default:
      return provenanceKind ?? appI18n.common.unknown;
  }
}

function formatStagedProvenanceBadge(provenanceKind: string | null) {
  switch (provenanceKind) {
    case 'native-ota-applied':
      return appI18n.bundleLauncher.remoteCatalog.provenanceBadge.nativeOtaApplied;
    case 'host-staged-only':
      return appI18n.bundleLauncher.remoteCatalog.provenanceBadge.hostStagedOnly;
    default:
      return provenanceKind ?? appI18n.common.unknown;
  }
}

function formatStagedProvenanceStatus(status: string | null) {
  switch (status) {
    case 'updated':
      return appI18n.bundleLauncher.remoteCatalog.provenanceStatus.updated;
    case 'up-to-date':
      return appI18n.bundleLauncher.remoteCatalog.provenanceStatus.upToDate;
    case 'failed':
      return appI18n.bundleLauncher.remoteCatalog.provenanceStatus.failed;
    default:
      return status ?? appI18n.common.unknown;
  }
}

function formatIsoTimestamp(value: string | null) {
  if (!value) {
    return appI18n.common.unknown;
  }

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/,
  );
  if (!match) {
    return value;
  }

  return `${match[1]} ${match[2]} UTC`;
}

function getRemoteCatalogStatusPresentation(status: RemoteCatalogState['status']) {
  switch (status) {
    case 'ready':
      return {
        label: appI18n.bundleLauncher.remoteCatalog.status.ready,
        tone: 'support' as const,
      };
    case 'unavailable':
      return {
        label: appI18n.bundleLauncher.remoteCatalog.status.unavailable,
        tone: 'warning' as const,
      };
    case 'error':
      return {
        label: appI18n.bundleLauncher.remoteCatalog.status.error,
        tone: 'danger' as const,
      };
    default:
      return {
        label: appI18n.bundleLauncher.remoteCatalog.status.loading,
        tone: 'neutral' as const,
      };
  }
}

function formatSavedTargetLabel(savedTarget: CompanionStartupTarget | null) {
  if (!savedTarget) {
    return appI18n.surfaces.launcher;
  }

  const knownTarget = findCompanionLaunchTarget(savedTarget, companionLaunchTargets);
  if (knownTarget) {
    return knownTarget.title;
  }

  return `${savedTarget.bundleId} · ${savedTarget.surfaceId}`;
}

export function BundleLauncherScreen({
  devSmokeScenario: _devSmokeScenario,
}: BundleLauncherScreenProps = {}) {
  const openSurface = useOpenSurface();
  const currentWindowId = useCurrentWindowId();
  const [bundleAvailability, setBundleAvailability] = useState<Record<string, boolean>>({});
  const [selectedTargetId, setSelectedTargetId] = useState(
    companionLaunchTargets[0]?.targetId ?? 'main-launcher',
  );
  const [openingTargetId, setOpeningTargetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [stagedBundles, setStagedBundles] = useState<StagedBundleRecord[]>([]);
  const [stagedBundlesLoaded, setStagedBundlesLoaded] = useState(false);
  const [remoteCatalog, setRemoteCatalog] = useState<RemoteCatalogState>({
    status: 'loading',
    source: 'pending',
    remoteUrl: null,
    entries: [],
    errorMessage: null,
  });
  const {
    startupTarget: resolvedStartupTarget,
    loading: startupTargetLoading,
    saving: savingStartupTarget,
    save: saveStartupTarget,
  } = useCompanionStartupTarget();
  const lastRemoteCatalogDiagnosticsSignatureRef = useRef<string | null>(null);
  const startupTargetLoaded = !startupTargetLoading;
  const effectiveSavedStartupTarget =
    resolvedStartupTarget ?? defaultCompanionStartupTarget;
  const discoveredLaunchTargets = useMemo(
    () => buildDiscoveredCompanionLaunchTargets(remoteCatalog.entries),
    [remoteCatalog.entries],
  );
  const launchTargets = useMemo(
    () => [...companionLaunchTargets, ...discoveredLaunchTargets],
    [discoveredLaunchTargets],
  );
  const availableLaunchTargets = useMemo(
    () =>
      launchTargets.filter(
        target => bundleAvailability[target.bundleId] ?? true,
      ),
    [bundleAvailability, launchTargets],
  );
  const launchTargetsByBundleId = useMemo(() => {
    const groupedTargets = new Map<string, CompanionLaunchTarget[]>();
    for (const target of launchTargets) {
      const existingTargets = groupedTargets.get(target.bundleId) ?? [];
      existingTargets.push(target);
      groupedTargets.set(target.bundleId, existingTargets);
    }

    return groupedTargets;
  }, [launchTargets]);

  const selectedTarget = useMemo(
    () =>
      availableLaunchTargets.find(target => target.targetId === selectedTargetId) ??
      availableLaunchTargets[0] ??
      companionLaunchTargets[0],
    [availableLaunchTargets, selectedTargetId],
  );
  const savedKnownTarget = useMemo(
    () =>
      findCompanionLaunchTarget(
        effectiveSavedStartupTarget,
        availableLaunchTargets,
      ),
    [availableLaunchTargets, effectiveSavedStartupTarget],
  );
  const savedTargetOutsideChoices = Boolean(
    resolvedStartupTarget && !savedKnownTarget,
  );
  const hasUnsavedSelection =
    !savedTargetOutsideChoices &&
    !areCompanionTargetsEqual(
      selectedTarget,
      savedKnownTarget ?? effectiveSavedStartupTarget,
    );
  const savedTargetLabel = useMemo(
    () => formatSavedTargetLabel(resolvedStartupTarget),
    [resolvedStartupTarget],
  );
  const remoteCatalogStatus = useMemo(
    () => getRemoteCatalogStatusPresentation(remoteCatalog.status),
    [remoteCatalog.status],
  );
  const remoteCatalogEntries = useMemo(() => {
    const localStateRank = {
      bundled: 0,
      staged: 1,
      'remote-only': 2,
    } as const;
    const discoverySourceRank = {
      'local-only': 0,
      'remote-catalog': 1,
    } as const;

    return buildBundleLauncherDiscoveryEntries({
      remoteEntries: remoteCatalog.entries,
      stagedBundles,
    })
      .map(entry => {
        return {
          ...entry,
          launchTargets: launchTargetsByBundleId.get(entry.bundleId) ?? [],
          isSavedStartupTarget: resolvedStartupTarget?.bundleId === entry.bundleId,
        };
      })
      .sort((left, right) => {
        if (left.isSavedStartupTarget !== right.isSavedStartupTarget) {
          return left.isSavedStartupTarget ? -1 : 1;
        }

        const leftRank = localStateRank[left.localState];
        const rightRank = localStateRank[right.localState];
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        const leftSourceRank = discoverySourceRank[left.discoverySource];
        const rightSourceRank = discoverySourceRank[right.discoverySource];
        if (leftSourceRank !== rightSourceRank) {
          return leftSourceRank - rightSourceRank;
        }

        return left.bundleId.localeCompare(right.bundleId);
      });
  }, [
    launchTargetsByBundleId,
    remoteCatalog.entries,
    resolvedStartupTarget?.bundleId,
    stagedBundles,
  ]);

  async function openTarget(target: CompanionLaunchTarget) {
    if (openingTargetId) {
      return;
    }

    setOpeningTargetId(target.targetId);
    setStatusMessage(null);

    try {
      await openSurface(createCompanionOpenSurfaceRequest(target));
      setStatusMessage(appI18n.bundleLauncher.status.opened);
    } catch (error) {
      console.error('Failed to open startup target', error);
      setStatusMessage(appI18n.bundleLauncher.status.openFailed);
      throw error;
    } finally {
      setOpeningTargetId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void queryBundleAvailability(
      launchTargets.map(target => target.bundleId),
    ).then(availability => {
      if (cancelled) {
        return;
      }

      setBundleAvailability(previous => ({
        ...previous,
        ...availability,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [launchTargets]);

  useEffect(() => {
    let cancelled = false;

    void getStagedBundles()
      .then(nextBundles => {
        if (cancelled) {
          return;
        }

        setStagedBundles(nextBundles);
      })
      .catch(error => {
        if (cancelled) {
          return;
        }

        console.warn('Failed to query staged bundles', error);
        setStagedBundles([]);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setStagedBundlesLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    logInteraction('bundle-launcher.remote-catalog.fetch-start', {
      timeoutMs: remoteCatalogRequestTimeoutMs,
    });
    void fetchRemoteBundleCatalog()
      .then(nextRemoteCatalog => {
        if (cancelled) {
          return;
        }

        logInteraction('bundle-launcher.remote-catalog.fetch-finished', {
          status: nextRemoteCatalog.status,
          source: nextRemoteCatalog.source,
          remoteUrl: nextRemoteCatalog.remoteUrl ?? null,
          remoteEntryCount: nextRemoteCatalog.entries.length,
          errorMessage: nextRemoteCatalog.errorMessage ?? null,
        });
        setRemoteCatalog(nextRemoteCatalog);
      })
      .catch(error => {
        if (cancelled) {
          return;
        }

        console.warn('Failed to fetch remote bundle catalog', error);
        logInteraction('bundle-launcher.remote-catalog.fetch-failed', {
          errorMessage: formatRemoteCatalogErrorMessage(error),
        });
        setRemoteCatalog({
          status: 'error',
          source: 'error',
          remoteUrl: null,
          entries: [],
          errorMessage: formatRemoteCatalogErrorMessage(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (savedKnownTarget?.targetId) {
      setSelectedTargetId(savedKnownTarget.targetId);
    }
  }, [savedKnownTarget?.targetId]);

  useEffect(() => {
    if (remoteCatalog.status === 'loading') {
      return;
    }

    const diagnosticsEntries = remoteCatalogEntries.map(entry => ({
      bundleId: entry.bundleId,
      discoverySource: entry.discoverySource,
      localState: entry.localState,
      latestVersion: entry.latestVersion ?? null,
      localVersion: entry.localVersion ?? null,
      localSourceKind: entry.localSourceKind ?? null,
      localProvenanceKind: entry.localProvenanceKind ?? null,
      localProvenanceStatus: entry.localProvenanceStatus ?? null,
      localProvenanceStagedAt: entry.localProvenanceStagedAt ?? null,
      versionMismatch:
        Boolean(entry.localVersion) &&
        Boolean(entry.latestVersion) &&
        entry.localVersion !== entry.latestVersion,
      hasPublicLaunchTarget: entry.launchTargets.length > 0,
      isSavedStartupTarget: entry.isSavedStartupTarget,
      rolloutPercent: entry.rolloutPercent,
      surfaceIds: entry.surfaceIds,
    }));
    const diagnosticsSummary = {
      status: remoteCatalog.status,
      source: remoteCatalog.source,
      remoteUrl: remoteCatalog.remoteUrl ?? null,
      remoteEntryCount: remoteCatalog.entries.length,
      entryCount: diagnosticsEntries.length,
      stagedBundleCount: stagedBundles.length,
      stagedBundlesLoaded,
      startupTargetLoaded,
      savedStartupTargetBundleId: resolvedStartupTarget?.bundleId ?? null,
      savedStartupTargetSurfaceId: resolvedStartupTarget?.surfaceId ?? null,
    };
    const diagnosticsSignature = JSON.stringify({
      summary: diagnosticsSummary,
      entries: diagnosticsEntries,
    });

    if (
      diagnosticsSignature ===
      lastRemoteCatalogDiagnosticsSignatureRef.current
    ) {
      return;
    }

    lastRemoteCatalogDiagnosticsSignatureRef.current = diagnosticsSignature;
    logInteraction(
      'bundle-launcher.remote-catalog.summary',
      diagnosticsSummary,
    );
    for (const entry of diagnosticsEntries) {
      logInteraction('bundle-launcher.remote-catalog.entry', entry);
    }
  }, [
    remoteCatalog.entries,
    remoteCatalog.remoteUrl,
    remoteCatalog.source,
    remoteCatalog.status,
    remoteCatalogEntries,
    resolvedStartupTarget?.bundleId,
    resolvedStartupTarget?.surfaceId,
    stagedBundles.length,
    stagedBundlesLoaded,
    startupTargetLoaded,
  ]);

  async function handleSaveStartupTarget() {
    if (!selectedTarget || savingStartupTarget) {
      return;
    }

    setStatusMessage(null);

    try {
      const nextStartupTarget: CompanionStartupTarget = {
        surfaceId: selectedTarget.surfaceId,
        bundleId: selectedTarget.bundleId,
        policy: selectedTarget.policy,
        presentation: selectedTarget.presentation,
      };
      await saveStartupTarget(nextStartupTarget);
      setStatusMessage(appI18n.bundleLauncher.status.saved);
    } catch (error) {
      console.error('Failed to save startup target', error);
      setStatusMessage(appI18n.bundleLauncher.status.saveFailed);
    }
  }

  async function handleOpenSelectedTarget() {
    if (!selectedTarget) {
      return;
    }

    await openTarget(selectedTarget);
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AppFrame
          eyebrow={appI18n.bundleLauncher.frame.eyebrow}
          title={appI18n.bundleLauncher.frame.title}
          description={appI18n.bundleLauncher.frame.description}>
          <Stack>
            <SectionCard
              title={appI18n.bundleLauncher.sections.startupTargetTitle}
              description={appI18n.bundleLauncher.sections.startupTargetDescription}>
              <View style={styles.choiceGrid}>
                {availableLaunchTargets.map(target => (
                  <ChoiceChip
                    key={target.targetId}
                    label={target.title}
                    detail={target.description}
                    active={selectedTarget?.targetId === target.targetId}
                    activeBadgeLabel={appI18n.common.choiceStatus.selected}
                    inactiveBadgeLabel={appI18n.common.choiceStatus.available}
                    onPress={() => {
                      setSelectedTargetId(target.targetId);
                      setStatusMessage(null);
                    }}
                  />
                ))}
              </View>
            </SectionCard>

            <SectionCard
              title={appI18n.bundleLauncher.sections.remoteCatalogTitle}
              description={appI18n.bundleLauncher.sections.remoteCatalogDescription}>
              <View style={styles.remoteCatalogSummary}>
                <View style={styles.summaryHeader}>
                  <SignalPill
                    label={remoteCatalogStatus.label}
                    tone={remoteCatalogStatus.tone}
                    size="sm"
                  />
                  <Text style={styles.remoteCatalogTitleText}>
                    {remoteCatalog.remoteUrl ??
                      appI18n.bundleLauncher.remoteCatalog.noRemoteUrl}
                  </Text>
                </View>

                {remoteCatalog.status === 'unavailable' ? (
                  remoteCatalogEntries.length === 0 ? (
                    <MutedText>{appI18n.bundleLauncher.remoteCatalog.emptyUnavailable}</MutedText>
                  ) : null
                ) : null}
                {remoteCatalog.status === 'error' ? (
                  <Text style={styles.remoteCatalogError}>
                    {remoteCatalog.errorMessage ??
                      appI18n.bundleLauncher.remoteCatalog.errorFallback}
                  </Text>
                ) : null}
                {remoteCatalog.status === 'ready' && remoteCatalogEntries.length === 0 ? (
                  <MutedText>{appI18n.bundleLauncher.remoteCatalog.emptyReady}</MutedText>
                ) : null}
              </View>

              {remoteCatalogEntries.length > 0 ? (
                <View style={styles.remoteBundleList}>
                  {remoteCatalogEntries.map(entry => (
                    <View key={entry.bundleId} style={styles.remoteBundleCard}>
                      <View style={styles.remoteBundleHeader}>
                        <Text style={styles.remoteBundleTitle}>
                          {entry.bundleId === companionBundleIds.main
                            ? appI18n.bundleLauncher.remoteCatalog.mainBundleTitle
                            : entry.bundleId}
                        </Text>
                        <SignalPill
                          label={
                            entry.localState === 'bundled'
                              ? appI18n.bundleLauncher.remoteCatalog.localState.bundled
                              : entry.localState === 'staged'
                                ? appI18n.bundleLauncher.remoteCatalog.localState.staged
                                : appI18n.bundleLauncher.remoteCatalog.localState.remoteOnly
                          }
                          tone={
                            entry.localState === 'bundled'
                              ? 'support'
                              : entry.localState === 'staged'
                                ? 'warning'
                                : 'neutral'
                          }
                          size="sm"
                        />
                      </View>

                      <MutedText>
                        {appI18n.bundleLauncher.labels.bundleId}
                        {entry.bundleId}
                      </MutedText>
                      <MutedText>
                        {appI18n.bundleLauncher.remoteCatalog.labels.latestVersion}
                        {entry.latestVersion ??
                          appI18n.bundleLauncher.remoteCatalog.latestVersionUnknown}
                      </MutedText>
                      {entry.localState === 'staged' ? (
                        <MutedText>
                          {appI18n.bundleLauncher.remoteCatalog.labels.localVersion}
                          {entry.localVersion ?? appI18n.common.unknown}
                        </MutedText>
                      ) : null}
                      <MutedText>
                        {appI18n.bundleLauncher.remoteCatalog.labels.channels}
                        {formatRemoteChannels(entry.channels)}
                      </MutedText>
                      {entry.launchTargets.length > 0 ? (
                        <MutedText>
                          {appI18n.bundleLauncher.remoteCatalog.labels.launchTargets}
                          {entry.launchTargets.map(target => target.title).join(' / ')}
                        </MutedText>
                      ) : null}
                      {entry.localState === 'staged' ? (
                        <MutedText>
                          {appI18n.bundleLauncher.remoteCatalog.labels.localSourceKind}
                          {formatStagedSourceKind(entry.localSourceKind)}
                        </MutedText>
                      ) : null}
                      {entry.localState === 'staged' &&
                      entry.localProvenanceKind ? (
                        <MutedText>
                          {appI18n.bundleLauncher.remoteCatalog.labels.localProvenanceKind}
                          {formatStagedProvenanceKind(entry.localProvenanceKind)}
                        </MutedText>
                      ) : null}
                      {entry.localState === 'staged' &&
                      entry.localProvenanceStatus ? (
                        <MutedText>
                          {appI18n.bundleLauncher.remoteCatalog.labels.localProvenanceStatus}
                          {formatStagedProvenanceStatus(entry.localProvenanceStatus)}
                        </MutedText>
                      ) : null}
                      {entry.localState === 'staged' &&
                      entry.localProvenanceStagedAt ? (
                        <MutedText>
                          {appI18n.bundleLauncher.remoteCatalog.labels.localProvenanceStagedAt}
                          {formatIsoTimestamp(entry.localProvenanceStagedAt)}
                        </MutedText>
                      ) : null}
                      {entry.rolloutPercent !== null ? (
                        <MutedText>
                          {appI18n.bundleLauncher.remoteCatalog.labels.rolloutPercent}
                          {entry.rolloutPercent}%
                        </MutedText>
                      ) : null}
                      {entry.discoverySource === 'local-only' ? (
                        <MutedText>
                          {appI18n.bundleLauncher.remoteCatalog.localOnlyDescription}
                        </MutedText>
                      ) : null}

                      <View style={styles.remoteBundleMetaRow}>
                        {entry.isSavedStartupTarget ? (
                          <SignalPill
                            label={appI18n.bundleLauncher.remoteCatalog.savedTarget}
                            tone="accent"
                            size="sm"
                          />
                        ) : null}
                        {entry.localState === 'staged' &&
                        entry.localProvenanceKind ? (
                          <SignalPill
                            label={formatStagedProvenanceBadge(
                              entry.localProvenanceKind,
                            )}
                            tone={
                              entry.localProvenanceKind === 'native-ota-applied'
                                ? 'support'
                                : 'neutral'
                            }
                            size="sm"
                          />
                        ) : null}
                        {entry.localState === 'staged' &&
                        entry.localVersion &&
                        entry.latestVersion &&
                        entry.localVersion !== entry.latestVersion ? (
                          <SignalPill
                            label={appI18n.bundleLauncher.remoteCatalog.versionStatus.differs}
                            tone="warning"
                            size="sm"
                          />
                        ) : null}
                        {entry.discoverySource === 'local-only' ? (
                          <SignalPill
                            label={appI18n.bundleLauncher.remoteCatalog.discoverySource.localOnly}
                            tone="warning"
                            size="sm"
                          />
                        ) : null}
                        {entry.launchTargets.length === 0 ? (
                          <SignalPill
                            label={appI18n.bundleLauncher.remoteCatalog.noPublicLaunchTarget}
                            tone="neutral"
                            size="sm"
                          />
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </SectionCard>

            <SectionCard
              title={appI18n.bundleLauncher.sections.summaryTitle}
              description={appI18n.bundleLauncher.sections.summaryDescription}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <SignalPill
                    label={
                      startupTargetLoaded
                        ? savedTargetOutsideChoices
                          ? appI18n.bundleLauncher.status.externalSavedTarget
                          : hasUnsavedSelection
                            ? appI18n.bundleLauncher.status.pending
                            : appI18n.bundleLauncher.status.synced
                        : appI18n.bundleLauncher.status.loading
                    }
                    tone={
                      startupTargetLoaded
                        ? savedTargetOutsideChoices
                          ? 'warning'
                          : hasUnsavedSelection
                            ? 'warning'
                            : 'support'
                        : 'neutral'
                    }
                    size="sm"
                  />
                  <Text style={styles.summaryTitleText}>{selectedTarget?.title}</Text>
                </View>
                <MutedText>
                  {appI18n.bundleLauncher.labels.bundleId}
                  {selectedTarget?.bundleId ?? defaultCompanionStartupTarget.bundleId}
                </MutedText>
                <MutedText>
                  {appI18n.bundleLauncher.labels.surfaceId}
                  {selectedTarget?.surfaceId ?? defaultCompanionStartupTarget.surfaceId}
                </MutedText>
                <MutedText>
                  {appI18n.bundleLauncher.labels.windowId}
                  {currentWindowId ?? appI18n.common.unknown}
                </MutedText>
                <MutedText>
                  {appI18n.bundleLauncher.labels.savedTarget}
                  {savedTargetLabel}
                </MutedText>
                <MutedText>
                  {appI18n.bundleLauncher.labels.savedBundleId}
                  {effectiveSavedStartupTarget.bundleId}
                </MutedText>
                <MutedText>
                  {appI18n.bundleLauncher.labels.savedSurfaceId}
                  {effectiveSavedStartupTarget.surfaceId}
                </MutedText>
                {savedTargetOutsideChoices ? (
                  <Text style={styles.summaryWarning}>
                    {appI18n.bundleLauncher.status.externalSavedTargetDescription}
                  </Text>
                ) : null}
                {statusMessage ? (
                  <Text style={styles.statusMessage}>{statusMessage}</Text>
                ) : null}
              </View>
              <View style={styles.actionRow}>
                <ActionButton
                  label={
                    savingStartupTarget
                      ? appI18n.bundleLauncher.actions.saveBusy
                      : appI18n.bundleLauncher.actions.save
                  }
                  onPress={() => {
                    void handleSaveStartupTarget();
                  }}
                  disabled={
                    !startupTargetLoaded || savingStartupTarget || !selectedTarget
                  }
                  tone="ghost"
                />
                <ActionButton
                  label={
                    openingTargetId === selectedTarget?.targetId
                      ? appI18n.bundleLauncher.actions.openBusy
                      : appI18n.bundleLauncher.actions.open
                  }
                  onPress={() => {
                    void handleOpenSelectedTarget();
                  }}
                  disabled={!selectedTarget || openingTargetId !== null}
                />
              </View>
            </SectionCard>
          </Stack>
        </AppFrame>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appPalette.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: appSpacing.xl,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.md,
  },
  summaryCard: {
    gap: appSpacing.sm,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: appPalette.border,
    backgroundColor: appPalette.canvas,
    paddingHorizontal: appSpacing.lg,
    paddingVertical: appSpacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: appSpacing.sm,
  },
  summaryTitleText: {
    color: appPalette.ink,
    ...appTypography.sectionTitle,
    flexShrink: 1,
  },
  summaryWarning: {
    color: '#b19243',
    ...appTypography.bodyStrong,
  },
  statusMessage: {
    color: appPalette.accent,
    ...appTypography.bodyStrong,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.md,
  },
  remoteCatalogSummary: {
    gap: appSpacing.sm,
  },
  remoteCatalogTitleText: {
    color: appPalette.inkMuted,
    ...appTypography.caption,
    flexShrink: 1,
  },
  remoteCatalogError: {
    color: '#8c4022',
    ...appTypography.bodyStrong,
  },
  remoteBundleList: {
    gap: appSpacing.md,
  },
  remoteBundleCard: {
    gap: appSpacing.sm,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: appPalette.border,
    backgroundColor: appPalette.canvas,
    paddingHorizontal: appSpacing.lg,
    paddingVertical: appSpacing.md,
  },
  remoteBundleHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appSpacing.sm,
  },
  remoteBundleTitle: {
    color: appPalette.ink,
    ...appTypography.bodyStrong,
    flexGrow: 1,
    flexShrink: 1,
  },
  remoteBundleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.sm,
  },
});
