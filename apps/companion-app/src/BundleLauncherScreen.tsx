import React, {useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {logInteraction} from '@opapp/framework-diagnostics';
import {
  canManageBundleUpdates,
  canOpenBundleTarget,
  getBundleUpdateStatuses,
  getCachedOtaRemoteCatalog,
  getOtaRemoteUrl,
  getStagedBundles,
  runBundleUpdate,
  type BundleUpdateStatus,
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
  buildBundleLibraryEntries,
  type BundleLibraryEntry,
  type BundleLibraryGroupId,
} from './bundle-library-model';
import {humanizeSurfaceId} from './bundle-library-presentation';
import {
  buildDiscoveredCompanionLaunchTargets,
  companionBundleIds,
  companionLaunchTargets,
  createCompanionOpenSurfaceRequest,
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

type ServicePresentation = {
  label: string;
  tone: 'support' | 'warning' | 'neutral' | 'danger';
  detail: string;
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

  return appI18n.bundleLauncher.service.errorFallback;
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
  preferNetwork = false,
) {
  let usedNetwork = false;
  const hydratedEntries = await Promise.all(
    entries.map(async entry => {
      if (!entry.latestVersion) {
        return entry;
      }

      const cachedManifestPayload =
        cachedManifests?.[entry.bundleId]?.[entry.latestVersion];
      if (cachedManifestPayload && !preferNetwork) {
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
        return cachedManifestPayload
          ? {
              ...entry,
              surfaceIds: parseRemoteBundleManifestSurfaceIds(cachedManifestPayload),
            }
          : entry;
      }
    }),
  );

  return {
    entries: hydratedEntries,
    usedNetwork,
  };
}

async function fetchRemoteBundleCatalog({
  preferNetwork = false,
}: {
  preferNetwork?: boolean;
} = {}) {
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
  if (!preferNetwork && cachedRemoteCatalog?.index && cachedRemoteUrl === normalizedRemoteUrl) {
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
      cachedRemoteCatalog?.manifests,
      true,
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

function formatChannels(channels: Record<string, string> | null) {
  if (!channels || Object.keys(channels).length === 0) {
    return appI18n.bundleLauncher.details.values.none;
  }

  return Object.entries(channels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([channel, version]) => `${channel}=${version}`)
    .join(' / ');
}

function formatSourceKind(sourceKind: string | null) {
  switch (sourceKind) {
    case 'local-build':
      return appI18n.bundleLauncher.details.values.localBuild;
    case 'sibling-staging':
      return appI18n.bundleLauncher.details.values.hostStaged;
    default:
      return sourceKind ?? appI18n.common.unknown;
  }
}

function formatProvenanceKind(provenanceKind: string | null) {
  switch (provenanceKind) {
    case 'native-ota-applied':
      return appI18n.bundleLauncher.details.values.nativeOtaApplied;
    case 'host-staged-only':
      return appI18n.bundleLauncher.details.values.hostStagedOnly;
    default:
      return provenanceKind ?? appI18n.common.unknown;
  }
}

function formatProvenanceStatus(status: string | null) {
  switch (status) {
    case 'updated':
      return appI18n.bundleLauncher.details.values.updated;
    case 'up-to-date':
      return appI18n.bundleLauncher.details.values.upToDate;
    case 'failed':
      return appI18n.bundleLauncher.details.values.failed;
    default:
      return status ?? appI18n.common.unknown;
  }
}

function formatLaunchTargetTitle(target: CompanionLaunchTarget) {
  return target.title === target.surfaceId
    ? humanizeSurfaceId(target.surfaceId)
    : target.title;
}

function buildServicePresentation(
  remoteCatalog: RemoteCatalogState,
  checkingForUpdates: boolean,
): ServicePresentation {
  if (checkingForUpdates) {
    return {
      label: appI18n.bundleLauncher.service.status.checking,
      tone: 'neutral',
      detail:
        remoteCatalog.remoteUrl ??
        appI18n.bundleLauncher.service.unavailableDescription,
    };
  }

  switch (remoteCatalog.status) {
    case 'ready':
      return {
        label: appI18n.bundleLauncher.service.status.ready,
        tone: 'support',
        detail:
          remoteCatalog.remoteUrl ??
          appI18n.bundleLauncher.service.unavailableDescription,
      };
    case 'error':
      return {
        label: appI18n.bundleLauncher.service.status.error,
        tone: 'danger',
        detail:
          remoteCatalog.errorMessage ??
          appI18n.bundleLauncher.service.errorFallback,
      };
    case 'unavailable':
      return {
        label: appI18n.bundleLauncher.service.status.unavailable,
        tone: 'warning',
        detail: appI18n.bundleLauncher.service.unavailableDescription,
      };
    default:
      return {
        label: appI18n.bundleLauncher.service.status.loading,
        tone: 'neutral',
        detail: appI18n.bundleLauncher.service.loadingDescription,
      };
  }
}

function groupBundleLibraryEntries(entries: ReadonlyArray<BundleLibraryEntry>) {
  const sectionOrder: BundleLibraryGroupId[] = [
    'updates',
    'installed',
    'available',
    'local',
  ];
  const sectionTitles: Record<BundleLibraryGroupId, string> = {
    updates: appI18n.bundleLauncher.groups.updates,
    installed: appI18n.bundleLauncher.groups.installed,
    available: appI18n.bundleLauncher.groups.available,
    local: appI18n.bundleLauncher.groups.local,
  };

  return sectionOrder
    .map(groupId => ({
      groupId,
      title: sectionTitles[groupId],
      entries: entries.filter(entry => entry.group === groupId),
    }))
    .filter(section => section.entries.length > 0);
}

function buildMainBundleRemoteEntry(): RemoteBundleCatalogEntry {
  return {
    bundleId: companionBundleIds.main,
    latestVersion: null,
    versions: [],
    rolloutPercent: null,
    channels: null,
    surfaceIds: companionLaunchTargets
      .filter(target => target.bundleId === companionBundleIds.main)
      .map(target => target.surfaceId),
  };
}

function DisclosureSection({
  title,
  description,
  expanded,
  onToggle,
  children,
}: React.PropsWithChildren<{
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
}>) {
  return (
    <View style={styles.disclosureShell}>
      <Pressable onPress={onToggle} style={styles.disclosureHeader}>
        <View style={styles.disclosureHeaderCopy}>
          <Text style={styles.disclosureTitle}>{title}</Text>
          <Text style={styles.disclosureDescription}>{description}</Text>
        </View>
        <SignalPill
          label={
            expanded
              ? appI18n.bundleLauncher.details.actions.collapse
              : appI18n.bundleLauncher.details.actions.expand
          }
          tone={expanded ? 'accent' : 'neutral'}
          size="sm"
        />
      </Pressable>
      {expanded ? <View style={styles.disclosureBody}>{children}</View> : null}
    </View>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailFieldLabel}>{label}</Text>
      <Text style={styles.detailFieldValue}>{value}</Text>
    </View>
  );
}

export function BundleLauncherScreen({
  devSmokeScenario: _devSmokeScenario,
}: BundleLauncherScreenProps = {}) {
  const openSurface = useOpenSurface();
  const currentWindowId = useCurrentWindowId();
  const {width} = useWindowDimensions();
  const supportsBundleUpdates = canManageBundleUpdates();
  const isCompactLayout = width < 1180;

  const [bundleAvailability, setBundleAvailability] = useState<Record<string, boolean>>({});
  const [startupTargetSelections, setStartupTargetSelections] = useState<
    Record<string, string | undefined>
  >({});
  const [openingTargetId, setOpeningTargetId] = useState<string | null>(null);
  const [actingBundleId, setActingBundleId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [stagedBundles, setStagedBundles] = useState<StagedBundleRecord[]>([]);
  const [updateStatuses, setUpdateStatuses] = useState<BundleUpdateStatus[]>([]);
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [startupPreferencesExpanded, setStartupPreferencesExpanded] = useState(false);
  const [advancedDetailsExpanded, setAdvancedDetailsExpanded] = useState(false);
  const [remoteCatalog, setRemoteCatalog] = useState<RemoteCatalogState>({
    status: 'loading',
    source: 'pending',
    remoteUrl: null,
    entries: [],
    errorMessage: null,
  });
  const {
    startupTarget: resolvedStartupTarget,
    saving: savingStartupTarget,
    save: saveStartupTarget,
  } = useCompanionStartupTarget();

  const syntheticRemoteEntries = useMemo(() => {
    if (remoteCatalog.entries.some(entry => entry.bundleId === companionBundleIds.main)) {
      return remoteCatalog.entries;
    }

    return [buildMainBundleRemoteEntry(), ...remoteCatalog.entries];
  }, [remoteCatalog.entries]);

  const discoveredLaunchTargets = useMemo(
    () => buildDiscoveredCompanionLaunchTargets(syntheticRemoteEntries),
    [syntheticRemoteEntries],
  );
  const launchTargets = useMemo(
    () => [...companionLaunchTargets, ...discoveredLaunchTargets],
    [discoveredLaunchTargets],
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

  const discoveryEntries = useMemo(
    () =>
      buildBundleLauncherDiscoveryEntries({
        remoteEntries: syntheticRemoteEntries,
        stagedBundles,
      }),
    [stagedBundles, syntheticRemoteEntries],
  );
  const serviceRemoteUrl =
    remoteCatalog.remoteUrl ??
    updateStatuses.find(status => status.remoteUrl)?.remoteUrl ??
    null;
  const libraryEntries = useMemo(
    () =>
      buildBundleLibraryEntries({
        discoveryEntries,
        launchTargetsByBundleId,
        updateStatuses,
        savedStartupTarget: resolvedStartupTarget,
        startupTargetSelections,
        hasConnectedUpdateService: Boolean(serviceRemoteUrl),
        canManageUpdates: supportsBundleUpdates,
        busyBundleId: actingBundleId,
      }),
    [
      actingBundleId,
      discoveryEntries,
      launchTargetsByBundleId,
      resolvedStartupTarget,
      serviceRemoteUrl,
      startupTargetSelections,
      supportsBundleUpdates,
      updateStatuses,
    ],
  );
  const groupedLibraryEntries = useMemo(
    () => groupBundleLibraryEntries(libraryEntries),
    [libraryEntries],
  );
  const selectedEntry = useMemo(
    () =>
      libraryEntries.find(entry => entry.bundleId === selectedBundleId) ??
      libraryEntries[0] ??
      null,
    [libraryEntries, selectedBundleId],
  );
  const servicePresentation = useMemo(
    () => buildServicePresentation(remoteCatalog, checkingForUpdates),
    [checkingForUpdates, remoteCatalog],
  );
  const availableLaunchTargetBundleIds = useMemo(
    () => launchTargets.map(target => target.bundleId),
    [launchTargets],
  );

  useEffect(() => {
    if (!selectedEntry) {
      setSelectedBundleId(null);
      return;
    }

    if (selectedBundleId !== selectedEntry.bundleId) {
      setSelectedBundleId(selectedEntry.bundleId);
    }
  }, [selectedBundleId, selectedEntry]);

  useEffect(() => {
    const matchedSavedTarget = launchTargets.find(
      target =>
        target.bundleId === resolvedStartupTarget?.bundleId &&
        target.surfaceId === resolvedStartupTarget?.surfaceId,
    );
    if (!matchedSavedTarget) {
      return;
    }

    setStartupTargetSelections(previous => {
      if (previous[matchedSavedTarget.bundleId] === matchedSavedTarget.targetId) {
        return previous;
      }

      return {
        ...previous,
        [matchedSavedTarget.bundleId]: matchedSavedTarget.targetId,
      };
    });
  }, [
    launchTargets,
    resolvedStartupTarget?.bundleId,
    resolvedStartupTarget?.surfaceId,
  ]);

  useEffect(() => {
    let cancelled = false;

    void queryBundleAvailability(availableLaunchTargetBundleIds).then(availability => {
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
  }, [availableLaunchTargetBundleIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      logInteraction('bundle-library.load-start', {
        supportsBundleUpdates,
      });

      const [nextRemoteCatalog, nextStagedBundles, nextUpdateStatuses] = await Promise.all([
        fetchRemoteBundleCatalog(),
        getStagedBundles().catch(error => {
          console.warn('Failed to query staged bundles', error);
          return [];
        }),
        supportsBundleUpdates
          ? getBundleUpdateStatuses().catch(error => {
              console.warn('Failed to query bundle update statuses', error);
              return [];
            })
          : Promise.resolve([]),
      ]);

      if (cancelled) {
        return;
      }

      setRemoteCatalog(nextRemoteCatalog);
      setStagedBundles(nextStagedBundles);
      setUpdateStatuses(nextUpdateStatuses);
      logInteraction('bundle-library.load-finished', {
        remoteStatus: nextRemoteCatalog.status,
        remoteEntryCount: nextRemoteCatalog.entries.length,
        stagedBundleCount: nextStagedBundles.length,
        updateStatusCount: nextUpdateStatuses.length,
      });
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [supportsBundleUpdates]);

  async function refreshLibraryData({
    preferNetwork = false,
  }: {
    preferNetwork?: boolean;
  } = {}) {
    const [nextRemoteCatalog, nextStagedBundles, nextUpdateStatuses] = await Promise.all([
      fetchRemoteBundleCatalog({preferNetwork}),
      getStagedBundles().catch(error => {
        console.warn('Failed to query staged bundles', error);
        return [];
      }),
      supportsBundleUpdates
        ? getBundleUpdateStatuses().catch(error => {
            console.warn('Failed to query bundle update statuses', error);
            return [];
          })
        : Promise.resolve([]),
    ]);

    setRemoteCatalog(nextRemoteCatalog);
    setStagedBundles(nextStagedBundles);
    setUpdateStatuses(nextUpdateStatuses);
    const availability = await queryBundleAvailability(availableLaunchTargetBundleIds);
    setBundleAvailability(previous => ({
      ...previous,
      ...availability,
    }));
  }

  async function openLaunchTarget(target: CompanionLaunchTarget) {
    if (openingTargetId) {
      return;
    }

    setOpeningTargetId(target.targetId);
    setStatusMessage(null);

    try {
      await openSurface(createCompanionOpenSurfaceRequest(target));
      setStatusMessage(appI18n.bundleLauncher.feedback.opened);
    } catch (error) {
      console.error('Failed to open launch target', error);
      setStatusMessage(appI18n.bundleLauncher.feedback.openFailed);
      throw error;
    } finally {
      setOpeningTargetId(null);
    }
  }

  async function handleCheckUpdates() {
    if (!supportsBundleUpdates || checkingForUpdates) {
      return;
    }

    setCheckingForUpdates(true);
    setStatusMessage(null);

    try {
      await refreshLibraryData({preferNetwork: true});
      setStatusMessage(appI18n.bundleLauncher.feedback.checked);
    } catch (error) {
      console.error('Failed to refresh bundle library', error);
      setStatusMessage(appI18n.bundleLauncher.feedback.checkFailed);
    } finally {
      setCheckingForUpdates(false);
    }
  }

  async function handlePrimaryAction(entry: BundleLibraryEntry) {
    if (entry.primaryActionKind === 'none') {
      return;
    }

    if (entry.primaryActionKind === 'open') {
      if (!entry.defaultOpenTarget) {
        return;
      }

      await openLaunchTarget(entry.defaultOpenTarget);
      return;
    }

    if (!supportsBundleUpdates) {
      return;
    }

    setActingBundleId(entry.bundleId);
    setStatusMessage(null);

    try {
      const result = await runBundleUpdate(entry.bundleId);
      await refreshLibraryData();
      if (result.status === 'updated') {
        setStatusMessage(
          entry.primaryActionKind === 'install'
            ? appI18n.bundleLauncher.feedback.installed
            : appI18n.bundleLauncher.feedback.updated,
        );
      } else if (result.status === 'failed') {
        setStatusMessage(
          result.errorMessage ?? appI18n.bundleLauncher.feedback.updateFailed,
        );
      } else {
        setStatusMessage(appI18n.bundleLauncher.feedback.checked);
      }
    } catch (error) {
      console.error('Failed to run bundle update', error);
      setStatusMessage(appI18n.bundleLauncher.feedback.updateFailed);
    } finally {
      setActingBundleId(null);
    }
  }

  async function handleSaveStartupTarget() {
    if (!selectedEntry?.selectedStartupTarget || savingStartupTarget) {
      return;
    }

    setStatusMessage(null);

    try {
      const nextStartupTarget: CompanionStartupTarget = {
        surfaceId: selectedEntry.selectedStartupTarget.surfaceId,
        bundleId: selectedEntry.selectedStartupTarget.bundleId,
        policy: selectedEntry.selectedStartupTarget.policy,
        presentation: selectedEntry.selectedStartupTarget.presentation,
      };
      await saveStartupTarget(nextStartupTarget);
      setStatusMessage(appI18n.bundleLauncher.feedback.saved);
    } catch (error) {
      console.error('Failed to save startup target', error);
      setStatusMessage(appI18n.bundleLauncher.feedback.saveFailed);
    }
  }

  const selectedTargetTitle = selectedEntry?.selectedStartupTarget
    ? formatLaunchTargetTitle(selectedEntry.selectedStartupTarget)
    : null;
  const selectedEntryCanOpen = selectedEntry?.defaultOpenTarget
    ? bundleAvailability[selectedEntry.defaultOpenTarget.bundleId] ?? true
    : false;

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AppFrame
          eyebrow={appI18n.bundleLauncher.frame.eyebrow}
          title={appI18n.bundleLauncher.frame.title}
          description={appI18n.bundleLauncher.frame.description}>
          <Stack style={styles.stack}>
            <View style={styles.serviceBar}>
              <View style={styles.serviceCopy}>
                <Text style={styles.serviceLabel}>
                  {appI18n.bundleLauncher.service.label}
                </Text>
                <Text style={styles.serviceValue}>{servicePresentation.detail}</Text>
              </View>
              <View style={styles.serviceActions}>
                <SignalPill
                  label={servicePresentation.label}
                  tone={servicePresentation.tone}
                  size="sm"
                />
                {supportsBundleUpdates ? (
                  <ActionButton
                    label={
                      checkingForUpdates
                        ? appI18n.bundleLauncher.actions.checking
                        : appI18n.bundleLauncher.actions.check
                    }
                    onPress={() => {
                      void handleCheckUpdates();
                    }}
                    disabled={checkingForUpdates}
                  />
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.libraryShell,
                isCompactLayout ? styles.libraryShellCompact : null,
              ]}>
              <View
                style={[
                  styles.listPane,
                  isCompactLayout ? styles.listPaneCompact : null,
                ]}>
                <Text style={styles.paneTitle}>
                  {appI18n.bundleLauncher.sections.libraryTitle}
                </Text>
                <Text style={styles.paneDescription}>
                  {appI18n.bundleLauncher.sections.libraryDescription}
                </Text>

                {groupedLibraryEntries.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>
                      {appI18n.bundleLauncher.empty.title}
                    </Text>
                    <Text style={styles.emptyStateDescription}>
                      {appI18n.bundleLauncher.empty.description}
                    </Text>
                  </View>
                ) : (
                  groupedLibraryEntries.map(section => (
                    <View key={section.groupId} style={styles.groupSection}>
                      <Text style={styles.groupTitle}>{section.title}</Text>
                      <View style={styles.groupList}>
                        {section.entries.map(entry => {
                          const rowBusy = entry.isBusy;
                          const rowOpenBusy =
                            openingTargetId === entry.defaultOpenTarget?.targetId;
                          const rowSelected = selectedEntry?.bundleId === entry.bundleId;
                          const rowCanOpen = entry.defaultOpenTarget
                            ? bundleAvailability[entry.defaultOpenTarget.bundleId] ?? true
                            : false;

                          return (
                            <Pressable
                              key={entry.bundleId}
                              onPress={() => {
                                setSelectedBundleId(entry.bundleId);
                                setStatusMessage(null);
                              }}
                              style={[
                                styles.appRow,
                                rowSelected ? styles.appRowSelected : null,
                              ]}>
                              <View style={styles.appRowIdentity}>
                                <View style={styles.appIcon}>
                                  <Text style={styles.appIconLabel}>{entry.monogram}</Text>
                                </View>
                                <View style={styles.appMeta}>
                                  <View style={styles.appMetaHeader}>
                                    <Text style={styles.appName}>{entry.displayName}</Text>
                                    {entry.isDefaultStartupApp ? (
                                      <SignalPill
                                        label={appI18n.bundleLauncher.library.defaultStartup}
                                        tone="accent"
                                        size="sm"
                                      />
                                    ) : null}
                                  </View>
                                  <Text style={styles.appSubtitle}>{entry.subtitle}</Text>
                                </View>
                              </View>

                              <View style={styles.appRowSummary}>
                                <SignalPill
                                  label={entry.stateLabel}
                                  tone={entry.stateTone}
                                  size="sm"
                                />
                                <Text style={styles.appVersionSummary}>
                                  {entry.versionSummary}
                                </Text>
                              </View>

                              <View style={styles.appRowAction}>
                                {entry.primaryActionLabel ? (
                                  <ActionButton
                                    label={
                                      rowBusy
                                        ? entry.primaryActionKind === 'install'
                                          ? appI18n.bundleLauncher.actions.installing
                                          : appI18n.bundleLauncher.actions.updating
                                        : rowOpenBusy
                                          ? appI18n.bundleLauncher.actions.opening
                                          : entry.primaryActionLabel
                                    }
                                    onPress={() => {
                                      void handlePrimaryAction(entry);
                                    }}
                                    disabled={
                                      rowBusy ||
                                      rowOpenBusy ||
                                      (entry.primaryActionKind === 'open' && !rowCanOpen)
                                    }
                                    tone={entry.primaryActionTone}
                                  />
                                ) : (
                                  <MutedText>
                                    {appI18n.bundleLauncher.library.readOnlyHint}
                                  </MutedText>
                                )}
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View
                style={[
                  styles.detailPane,
                  isCompactLayout ? styles.detailPaneCompact : null,
                ]}>
                <Text style={styles.paneTitle}>
                  {appI18n.bundleLauncher.sections.detailTitle}
                </Text>
                <Text style={styles.paneDescription}>
                  {appI18n.bundleLauncher.sections.detailDescription}
                </Text>

                {selectedEntry ? (
                  <View style={styles.detailCard}>
                    <View style={styles.detailHeader}>
                      <View style={styles.detailHeaderCopy}>
                        <Text style={styles.detailTitle}>{selectedEntry.displayName}</Text>
                        <Text style={styles.detailSubtitle}>{selectedEntry.subtitle}</Text>
                      </View>
                      <SignalPill
                        label={selectedEntry.stateLabel}
                        tone={selectedEntry.stateTone}
                        size="sm"
                      />
                    </View>

                    <View style={styles.detailHighlights}>
                      <DetailField
                        label={appI18n.bundleLauncher.details.installedVersion}
                        value={
                          selectedEntry.currentVersion ??
                          appI18n.bundleLauncher.details.values.notInstalled
                        }
                      />
                      <DetailField
                        label={appI18n.bundleLauncher.details.availableVersion}
                        value={
                          selectedEntry.latestVersion ??
                          appI18n.bundleLauncher.details.values.notAvailable
                        }
                      />
                      <DetailField
                        label={appI18n.bundleLauncher.details.selectedEntry}
                        value={
                          selectedTargetTitle ??
                          appI18n.bundleLauncher.details.values.none
                        }
                      />
                    </View>

                    {selectedEntry.detailNote ? (
                      <Text style={styles.detailNote}>{selectedEntry.detailNote}</Text>
                    ) : null}
                    {statusMessage ? (
                      <Text style={styles.statusMessage}>{statusMessage}</Text>
                    ) : null}

                    <View style={styles.detailActions}>
                      {selectedEntry.primaryActionLabel ? (
                        <ActionButton
                          label={
                            actingBundleId === selectedEntry.bundleId
                              ? selectedEntry.primaryActionKind === 'install'
                                ? appI18n.bundleLauncher.actions.installing
                                : selectedEntry.primaryActionKind === 'update'
                                  ? appI18n.bundleLauncher.actions.updating
                                  : appI18n.bundleLauncher.actions.opening
                              : selectedEntry.primaryActionLabel
                          }
                          onPress={() => {
                            void handlePrimaryAction(selectedEntry);
                          }}
                          disabled={
                            actingBundleId === selectedEntry.bundleId ||
                            openingTargetId === selectedEntry.defaultOpenTarget?.targetId ||
                            (selectedEntry.primaryActionKind === 'open' &&
                              !selectedEntryCanOpen)
                          }
                          tone={selectedEntry.primaryActionTone}
                        />
                      ) : null}
                      <ActionButton
                        label={
                          savingStartupTarget
                            ? appI18n.bundleLauncher.actions.savingDefault
                            : appI18n.bundleLauncher.actions.setDefault
                        }
                        onPress={() => {
                          void handleSaveStartupTarget();
                        }}
                        disabled={
                          savingStartupTarget || !selectedEntry.selectedStartupTarget
                        }
                        tone="ghost"
                      />
                    </View>

                    <DisclosureSection
                      title={appI18n.bundleLauncher.details.startupPreferencesTitle}
                      description={
                        appI18n.bundleLauncher.details.startupPreferencesDescription
                      }
                      expanded={startupPreferencesExpanded}
                      onToggle={() => {
                        setStartupPreferencesExpanded(previous => !previous);
                      }}>
                      <View style={styles.choiceGrid}>
                        {selectedEntry.launchTargets.map(target => (
                          <ChoiceChip
                            key={target.targetId}
                            label={formatLaunchTargetTitle(target)}
                            detail={target.description}
                            active={
                              selectedEntry.selectedStartupTarget?.targetId === target.targetId
                            }
                            activeBadgeLabel={appI18n.common.choiceStatus.selected}
                            inactiveBadgeLabel={appI18n.common.choiceStatus.available}
                            onPress={() => {
                              setStartupTargetSelections(previous => ({
                                ...previous,
                                [selectedEntry.bundleId]: target.targetId,
                              }));
                              setStatusMessage(null);
                            }}
                          />
                        ))}
                      </View>
                    </DisclosureSection>

                    <DisclosureSection
                      title={appI18n.bundleLauncher.details.advancedTitle}
                      description={appI18n.bundleLauncher.details.advancedDescription}
                      expanded={advancedDetailsExpanded}
                      onToggle={() => {
                        setAdvancedDetailsExpanded(previous => !previous);
                      }}>
                      <View style={styles.advancedGrid}>
                        <DetailField
                          label={appI18n.bundleLauncher.details.bundleId}
                          value={selectedEntry.bundleId}
                        />
                        <DetailField
                          label={appI18n.bundleLauncher.details.channel}
                          value={
                            selectedEntry.channel ??
                            appI18n.bundleLauncher.details.values.none
                          }
                        />
                        <DetailField
                          label={appI18n.bundleLauncher.details.rollout}
                          value={
                            selectedEntry.rolloutPercent !== null
                              ? `${selectedEntry.rolloutPercent}%`
                              : appI18n.bundleLauncher.details.values.fullRollout
                          }
                        />
                        <DetailField
                          label={appI18n.bundleLauncher.details.localSource}
                          value={formatSourceKind(selectedEntry.localSourceKind)}
                        />
                        <DetailField
                          label={appI18n.bundleLauncher.details.lastOta}
                          value={formatProvenanceStatus(selectedEntry.localProvenanceStatus)}
                        />
                        <DetailField
                          label={appI18n.bundleLauncher.details.stagedAt}
                          value={formatIsoTimestamp(selectedEntry.localProvenanceStagedAt)}
                        />
                        <DetailField
                          label={appI18n.bundleLauncher.details.provenance}
                          value={formatProvenanceKind(selectedEntry.localProvenanceKind)}
                        />
                        <DetailField
                          label={appI18n.bundleLauncher.details.channels}
                          value={formatChannels(selectedEntry.channels)}
                        />
                        <DetailField
                          label={appI18n.bundleLauncher.details.currentWindow}
                          value={currentWindowId ?? appI18n.common.unknown}
                        />
                      </View>
                    </DisclosureSection>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>
                      {appI18n.bundleLauncher.empty.title}
                    </Text>
                    <Text style={styles.emptyStateDescription}>
                      {appI18n.bundleLauncher.empty.description}
                    </Text>
                  </View>
                )}
              </View>
            </View>
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
  stack: {
    gap: appSpacing.lg,
  },
  serviceBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appSpacing.lg,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: appPalette.border,
    backgroundColor: appPalette.panel,
    paddingHorizontal: appSpacing.lg,
    paddingVertical: appSpacing.md,
  },
  serviceCopy: {
    flexGrow: 1,
    gap: appSpacing.xs,
  },
  serviceLabel: {
    color: appPalette.inkSoft,
    ...appTypography.captionStrong,
  },
  serviceValue: {
    color: appPalette.ink,
    ...appTypography.body,
  },
  serviceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: appSpacing.sm,
  },
  libraryShell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: appSpacing.lg,
  },
  libraryShellCompact: {
    flexDirection: 'column',
  },
  listPane: {
    flex: 1.1,
    gap: appSpacing.md,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: appPalette.border,
    backgroundColor: appPalette.panel,
    paddingHorizontal: appSpacing.lg,
    paddingVertical: appSpacing.lg,
  },
  listPaneCompact: {
    width: '100%',
  },
  detailPane: {
    flex: 0.9,
    gap: appSpacing.md,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: appPalette.border,
    backgroundColor: appPalette.panel,
    paddingHorizontal: appSpacing.lg,
    paddingVertical: appSpacing.lg,
  },
  detailPaneCompact: {
    width: '100%',
  },
  paneTitle: {
    color: appPalette.ink,
    ...appTypography.sectionTitle,
  },
  paneDescription: {
    color: appPalette.inkMuted,
    ...appTypography.body,
  },
  groupSection: {
    gap: appSpacing.sm,
  },
  groupTitle: {
    color: appPalette.inkSoft,
    ...appTypography.captionStrong,
  },
  groupList: {
    gap: appSpacing.sm,
  },
  appRow: {
    gap: appSpacing.md,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: appPalette.border,
    backgroundColor: appPalette.canvas,
    paddingHorizontal: appSpacing.md,
    paddingVertical: appSpacing.md,
  },
  appRowSelected: {
    borderColor: appPalette.accent,
    backgroundColor: '#f6e7de',
  },
  appRowIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.md,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2d6c8',
  },
  appIconLabel: {
    color: '#6e3b2e',
    ...appTypography.bodyStrong,
  },
  appMeta: {
    flex: 1,
    gap: appSpacing.xs,
  },
  appMetaHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: appSpacing.sm,
  },
  appName: {
    flexShrink: 1,
    color: appPalette.ink,
    ...appTypography.bodyStrong,
  },
  appSubtitle: {
    color: appPalette.inkMuted,
    ...appTypography.caption,
  },
  appRowSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: appSpacing.sm,
  },
  appVersionSummary: {
    color: appPalette.inkSoft,
    ...appTypography.caption,
  },
  appRowAction: {
    alignItems: 'flex-start',
  },
  emptyState: {
    gap: appSpacing.sm,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: appPalette.border,
    backgroundColor: appPalette.canvas,
    paddingHorizontal: appSpacing.lg,
    paddingVertical: appSpacing.lg,
  },
  emptyStateTitle: {
    color: appPalette.ink,
    ...appTypography.bodyStrong,
  },
  emptyStateDescription: {
    color: appPalette.inkMuted,
    ...appTypography.body,
  },
  detailCard: {
    gap: appSpacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: appSpacing.md,
  },
  detailHeaderCopy: {
    flex: 1,
    gap: appSpacing.xs,
  },
  detailTitle: {
    color: appPalette.ink,
    ...appTypography.title,
  },
  detailSubtitle: {
    color: appPalette.inkMuted,
    ...appTypography.body,
  },
  detailHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.md,
  },
  detailField: {
    flexGrow: 1,
    minWidth: 180,
    gap: appSpacing.xs,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: appPalette.border,
    backgroundColor: appPalette.canvas,
    paddingHorizontal: appSpacing.md,
    paddingVertical: appSpacing.sm,
  },
  detailFieldLabel: {
    color: appPalette.inkSoft,
    ...appTypography.captionStrong,
  },
  detailFieldValue: {
    color: appPalette.ink,
    ...appTypography.body,
  },
  detailNote: {
    color: '#8c5d2b',
    ...appTypography.bodyStrong,
  },
  statusMessage: {
    color: appPalette.accent,
    ...appTypography.bodyStrong,
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.md,
  },
  disclosureShell: {
    gap: appSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: appPalette.border,
    paddingTop: appSpacing.md,
  },
  disclosureHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appSpacing.md,
  },
  disclosureHeaderCopy: {
    flex: 1,
    gap: appSpacing.xs,
  },
  disclosureTitle: {
    color: appPalette.ink,
    ...appTypography.bodyStrong,
  },
  disclosureDescription: {
    color: appPalette.inkMuted,
    ...appTypography.caption,
  },
  disclosureBody: {
    gap: appSpacing.md,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.md,
  },
  advancedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.md,
  },
});
