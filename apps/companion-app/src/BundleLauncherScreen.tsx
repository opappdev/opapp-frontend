import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  canOpenBundleTarget,
  getStagedBundleIds,
  getOtaRemoteUrl,
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
  type RemoteBundleCatalogEntry,
} from './bundle-launcher-discovery';
import {
  areCompanionTargetsEqual,
  companionBundleIds,
  companionLaunchTargets,
  createCompanionOpenSurfaceRequest,
  defaultCompanionStartupTarget,
  findCompanionLaunchTarget,
  type CompanionStartupTarget,
} from './companion-runtime';
import {useCompanionStartupTarget} from './useCompanionStartupTarget';

type BundleLauncherScreenProps = {
  devSmokeScenario?: string;
};

type RemoteCatalogState =
  | {
      status: 'loading';
      remoteUrl: string | null;
      entries: RemoteBundleCatalogEntry[];
      errorMessage: string | null;
    }
  | {
      status: 'ready' | 'unavailable' | 'error';
      remoteUrl: string | null;
      entries: RemoteBundleCatalogEntry[];
      errorMessage: string | null;
    };

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

async function fetchRemoteBundleCatalog() {
  const remoteUrl = await getOtaRemoteUrl();
  if (!remoteUrl) {
    return {
      status: 'unavailable' as const,
      remoteUrl: null,
      entries: [],
      errorMessage: null,
    };
  }

  const normalizedRemoteUrl = remoteUrl.replace(/\/+$/, '');
  const response = await fetch(`${normalizedRemoteUrl}/index.json`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  return {
    status: 'ready' as const,
    remoteUrl: normalizedRemoteUrl,
    entries: parseRemoteBundleCatalogIndex(payload),
    errorMessage: null,
  };
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
  const [stagedBundleIds, setStagedBundleIds] = useState<string[]>([]);
  const [remoteCatalog, setRemoteCatalog] = useState<RemoteCatalogState>({
    status: 'loading',
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
  const startupTargetLoaded = !startupTargetLoading;
  const effectiveSavedStartupTarget =
    resolvedStartupTarget ?? defaultCompanionStartupTarget;
  const availableLaunchTargets = useMemo(
    () =>
      companionLaunchTargets.filter(
        target => bundleAvailability[target.bundleId] ?? true,
      ),
    [bundleAvailability],
  );

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
      stagedBundleIds,
    })
      .map(entry => {
        return {
          ...entry,
          hasPublicLaunchTarget: companionLaunchTargets.some(
            target => target.bundleId === entry.bundleId,
          ),
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
  }, [remoteCatalog.entries, resolvedStartupTarget?.bundleId, stagedBundleIds]);

  async function openTarget(target: typeof companionLaunchTargets[number]) {
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
      companionLaunchTargets.map(target => target.bundleId),
    ).then(availability => {
      if (cancelled) {
        return;
      }

      setBundleAvailability(previous => ({
        ...previous,
        ...availability,
      }));
    });

    void getStagedBundleIds().then(nextBundleIds => {
      if (cancelled) {
        return;
      }

      setStagedBundleIds(nextBundleIds);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchRemoteBundleCatalog()
      .then(nextRemoteCatalog => {
        if (cancelled) {
          return;
        }

        setRemoteCatalog(nextRemoteCatalog);
      })
      .catch(error => {
        if (cancelled) {
          return;
        }

        console.warn('Failed to fetch remote bundle catalog', error);
        setRemoteCatalog({
          status: 'error',
          remoteUrl: null,
          entries: [],
          errorMessage:
            error instanceof Error
              ? error.message
              : appI18n.bundleLauncher.remoteCatalog.errorFallback,
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
                {remoteCatalog.remoteUrl ?? appI18n.bundleLauncher.remoteCatalog.noRemoteUrl}
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
                  <MutedText>
                    {appI18n.bundleLauncher.remoteCatalog.labels.channels}
                    {formatRemoteChannels(entry.channels)}
                  </MutedText>
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
                    {entry.discoverySource === 'local-only' ? (
                      <SignalPill
                        label={appI18n.bundleLauncher.remoteCatalog.discoverySource.localOnly}
                        tone="warning"
                        size="sm"
                      />
                    ) : null}
                    {!entry.hasPublicLaunchTarget ? (
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
              disabled={!startupTargetLoaded || savingStartupTarget || !selectedTarget}
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
  );
}

const styles = StyleSheet.create({
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
