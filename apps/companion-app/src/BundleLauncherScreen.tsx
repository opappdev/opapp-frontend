import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Platform,
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
  getTitleBarMetrics,
  runBundleUpdate,
  type BundleUpdateStatus,
  type StagedBundleRecord,
  type TitleBarMetrics,
  useCurrentWindowId,
  useOpenSurface,
} from '@opapp/framework-windowing';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  AppFrame,
  AppThemeProvider,
  ChoiceChip,
  Stack,
  StatusBadge,
  desktopCursor,
  useDiscretePressableState,
  useTheme,
  windowsFocusProps,
  appRadius,
  appSpacing,
  appLayout,
  appTypography,
  type AppPalette,
  type AppTheme,
} from '@opapp/ui-native-primitives';
import {
  buildBundleLauncherDiscoveryEntries,
  parseRemoteBundleCatalogIndex,
  parseRemoteBundleManifestSurfaceIds,
  type RemoteBundleCatalogEntry,
} from './bundle-launcher-discovery';
import {
  buildBundleLibraryEntries,
  resolveBundleLibraryOpenTarget,
  type BundleLibraryEntry,
  type BundleLibraryGroupId,
} from './bundle-library-model';
import {humanizeSurfaceId} from './bundle-library-presentation';
import {
  BundleLibraryPane,
  type BundleLibrarySection,
} from './bundle-launcher-library-pane';
import {
  buildDiscoveredCompanionLaunchTargets,
  companionBundleIds,
  companionLaunchTargets,
  createCompanionOpenSurfaceRequest,
  type CompanionLaunchTarget,
  type CompanionStartupTarget,
} from './companion-runtime';
import {useCompanionStartupTarget} from './useCompanionStartupTarget';

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

function buildBundleLauncherTonePalette(
  palette: AppPalette,
  colorScheme: AppTheme['colorScheme'],
): AppTheme['tonePalette'] {
  const isLight = colorScheme === 'light';

  return {
    accent: {
      soft: {
        container: {
          backgroundColor: palette.accentSoft,
          borderColor: palette.accent,
        },
        label: {color: isLight ? '#864260' : '#773d58'},
      },
      solid: {
        container: {
          backgroundColor: palette.accent,
          borderColor: palette.accent,
        },
        label: {color: '#fff8fb'},
      },
    },
    neutral: {
      soft: {
        container: {
          backgroundColor: palette.panel,
          borderColor: palette.border,
        },
        label: {color: palette.inkMuted},
      },
      solid: {
        container: {
          backgroundColor: palette.borderStrong,
          borderColor: palette.borderStrong,
        },
        label: {color: '#fbf8fd'},
      },
    },
    support: {
      soft: {
        container: {
          backgroundColor: palette.supportSoft,
          borderColor: palette.support,
        },
        label: {color: isLight ? '#2c737d' : '#2b6f79'},
      },
      solid: {
        container: {
          backgroundColor: palette.support,
          borderColor: palette.support,
        },
        label: {color: '#f7ffff'},
      },
    },
    warning: {
      soft: {
        container: {
          backgroundColor: isLight ? '#f6ecd8' : '#f0e3c7',
          borderColor: isLight ? '#c39a61' : '#c29a64',
        },
        label: {color: isLight ? '#7a5c32' : '#73582f'},
      },
      solid: {
        container: {
          backgroundColor: isLight ? '#c39a61' : '#c29a64',
          borderColor: isLight ? '#c39a61' : '#c29a64',
        },
        label: {color: '#fff9f1'},
      },
    },
    danger: {
      soft: {
        container: {
          backgroundColor: isLight ? '#f7dde7' : '#efd4de',
          borderColor: isLight ? '#cf7a95' : '#cc7891',
        },
        label: {color: isLight ? '#824156' : '#7c3f53'},
      },
      solid: {
        container: {
          backgroundColor: isLight ? '#c86a87' : '#c56782',
          borderColor: isLight ? '#c86a87' : '#c56782',
        },
        label: {color: '#fff8fb'},
      },
    },
  };
}

function buildBundleLauncherTheme(baseTheme: AppTheme): AppTheme {
  if (
    baseTheme.colorScheme === 'high-contrast' ||
    baseTheme.appearancePreset !== 'blossom'
  ) {
    return baseTheme;
  }

  return {
    ...baseTheme,
    tonePalette: buildBundleLauncherTonePalette(
      baseTheme.palette,
      baseTheme.colorScheme,
    ),
  };
}

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

function groupBundleLibraryEntries(
  entries: ReadonlyArray<BundleLibraryEntry>,
): BundleLibrarySection[] {
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
  headerTestID,
  contentTestID,
  children,
}: React.PropsWithChildren<{
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  headerTestID?: string;
  contentTestID?: string;
}>) {
  const {palette} = useTheme();
  const {
    hovered,
    focusVisible,
    handleHoverIn,
    handleHoverOut,
    handlePointerDown,
    handlePointerUp,
    handlePressIn,
    handlePressOut,
    handleFocus,
    handleKeyDownCapture,
    handleBlur,
  } = useDiscretePressableState();
  return (
    <View style={{gap: appSpacing.sm, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: appSpacing.md}}>
      <Pressable
        testID={headerTestID}
        accessibilityRole='button'
        accessibilityState={{expanded}}
        focusable
        {...windowsFocusProps({nativeFocusRing: false})}
        onPress={onToggle}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onKeyDownCapture={handleKeyDownCapture}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={({pressed}: any) => [
          {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: appSpacing.md,
            borderRadius: appRadius.control,
            paddingHorizontal: appSpacing.xs,
            paddingVertical: appSpacing.xs,
          },
          hovered && !pressed ? {backgroundColor: palette.canvasShade} : null,
          focusVisible ? {borderColor: palette.focusRing, borderWidth: 2} : null,
          pressed ? {backgroundColor: palette.canvasShade} : null,
          desktopCursor,
        ]}>
        <View style={{flex: 1, gap: appSpacing.xs}}>
          <Text style={{color: palette.ink, ...appTypography.bodyStrong}}>{title}</Text>
          <Text style={{color: palette.inkMuted, ...appTypography.caption}}>{description}</Text>
        </View>
        <Text
          style={[
            {
              color: expanded ? palette.accent : palette.inkSoft,
              ...appTypography.captionStrong,
            },
          ]}>
          {expanded
            ? appI18n.bundleLauncher.details.actions.collapse
            : appI18n.bundleLauncher.details.actions.expand}
        </Text>
      </Pressable>
      {expanded ? (
        <View testID={contentTestID} style={{gap: appSpacing.md}}>
          {children}
        </View>
      ) : null}
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
  const {palette} = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: 180,
        gap: appSpacing.xs,
        borderRadius: appRadius.control,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.panel,
        paddingHorizontal: appSpacing.md,
        paddingVertical: appSpacing.sm2,
      }}>
      <Text
        style={{
          color: palette.inkSoft,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          ...appTypography.labelTightBold,
        }}>
        {label}
      </Text>
      <Text style={{color: palette.ink, ...appTypography.bodyStrong}}>
        {value}
      </Text>
    </View>
  );
}

type BundleDetailPaneProps = {
  selectedEntry: BundleLibraryEntry | null;
  selectedTargetTitle: string | null;
  selectedEntryOpenTarget: CompanionLaunchTarget | null;
  selectedEntryCanOpen: boolean;
  actingBundleId: string | null;
  openingTargetId: string | null;
  savingStartupTarget: boolean;
  startupPreferencesExpanded: boolean;
  advancedDetailsExpanded: boolean;
  statusMessage: string | null;
  statusTone: 'support' | 'danger' | 'neutral';
  currentWindowId: string | null;
  onPrimaryAction: (entry: BundleLibraryEntry) => void;
  onSaveStartupTarget: () => void;
  onChooseStartupTarget: (bundleId: string, targetId: string) => void;
  onToggleStartupPreferences: () => void;
  onToggleAdvancedDetails: () => void;
  styles: ReturnType<typeof createScreenStyles>;
};

function BundleDetailPane({
  selectedEntry,
  selectedTargetTitle,
  selectedEntryOpenTarget,
  selectedEntryCanOpen,
  actingBundleId,
  openingTargetId,
  savingStartupTarget,
  startupPreferencesExpanded,
  advancedDetailsExpanded,
  statusMessage,
  statusTone,
  currentWindowId,
  onPrimaryAction,
  onSaveStartupTarget,
  onChooseStartupTarget,
  onToggleStartupPreferences,
  onToggleAdvancedDetails,
  styles,
}: BundleDetailPaneProps) {
  const detailPrimaryActionLabel =
    selectedEntry?.primaryActionLabel === null || selectedEntry === null
      ? null
      : actingBundleId === selectedEntry.bundleId
        ? selectedEntry.primaryActionKind === 'install'
          ? appI18n.bundleLauncher.actions.installing
          : selectedEntry.primaryActionKind === 'update'
            ? appI18n.bundleLauncher.actions.updating
            : appI18n.bundleLauncher.actions.opening
        : selectedEntry.primaryActionKind === 'open'
          ? appI18n.bundleLauncher.actions.openSelected
          : selectedEntry.primaryActionLabel;
  const detailPrimaryActionDisabled =
    selectedEntry === null
      ? true
      : actingBundleId === selectedEntry.bundleId ||
        openingTargetId === selectedEntryOpenTarget?.targetId ||
        (selectedEntry.primaryActionKind === 'open' && !selectedEntryCanOpen);

  return (
    <>
      <Text style={styles.paneTitle}>
        {appI18n.bundleLauncher.sections.detailTitle}
      </Text>

      {selectedEntry ? (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderCopy}>
              <Text testID='bundle-launcher.detail.title' style={styles.detailTitle}>
                {selectedEntry.displayName}
              </Text>
              <Text
                testID='bundle-launcher.detail.subtitle'
                style={styles.detailSubtitle}>
                {selectedEntry.subtitle}
              </Text>
            </View>
            <StatusBadge
              label={selectedEntry.stateLabel}
              tone={selectedEntry.stateTone}
              size='sm'
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
            <Text
              style={[
                styles.statusMessage,
                statusTone === 'support' ? styles.statusMessageSuccess : null,
                statusTone === 'danger' ? styles.statusMessageError : null,
              ]}>
              {statusMessage}
            </Text>
          ) : null}

          <View style={styles.detailActions}>
            {detailPrimaryActionLabel ? (
              <ActionButton
                testID='bundle-launcher.detail.action.primary'
                label={detailPrimaryActionLabel}
                onPress={() => {
                  onPrimaryAction(selectedEntry);
                }}
                disabled={detailPrimaryActionDisabled}
                tone={selectedEntry.primaryActionTone}
              />
            ) : null}
            <ActionButton
              testID='bundle-launcher.detail.action.set-default'
              label={
                savingStartupTarget
                  ? appI18n.bundleLauncher.actions.savingDefault
                  : appI18n.bundleLauncher.actions.setDefault
              }
              onPress={() => {
                onSaveStartupTarget();
              }}
              disabled={
                savingStartupTarget || !selectedEntry.selectedStartupTarget
              }
              tone='ghost'
            />
          </View>

          <DisclosureSection
            title={appI18n.bundleLauncher.details.startupPreferencesTitle}
            description={
              appI18n.bundleLauncher.details.startupPreferencesDescription
            }
            expanded={startupPreferencesExpanded}
            headerTestID='bundle-launcher.startup-preferences.header'
            contentTestID='bundle-launcher.startup-preferences.content'
            onToggle={onToggleStartupPreferences}>
            <View style={styles.choiceGrid}>
              {selectedEntry.launchTargets.map(target => (
                <ChoiceChip
                  key={target.targetId}
                  testID={
                    selectedEntry.selectedStartupTarget?.targetId === target.targetId
                      ? 'bundle-launcher.startup-target.selected'
                      : `bundle-launcher.startup-target.${target.targetId}`
                  }
                  label={formatLaunchTargetTitle(target)}
                  detail={target.description}
                  active={
                    selectedEntry.selectedStartupTarget?.targetId === target.targetId
                  }
                  activeBadgeLabel={appI18n.common.choiceStatus.selected}
                  inactiveBadgeLabel={appI18n.common.choiceStatus.available}
                  onPress={() => {
                    onChooseStartupTarget(selectedEntry.bundleId, target.targetId);
                  }}
                />
              ))}
            </View>
          </DisclosureSection>

          <DisclosureSection
            title={appI18n.bundleLauncher.details.advancedTitle}
            description={appI18n.bundleLauncher.details.advancedDescription}
            expanded={advancedDetailsExpanded}
            headerTestID='bundle-launcher.advanced-details.header'
            contentTestID='bundle-launcher.advanced-details.content'
            onToggle={onToggleAdvancedDetails}>
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
    </>
  );
}

export function BundleLauncherScreen() {
  const openSurface = useOpenSurface();
  const currentWindowId = useCurrentWindowId();
  const {width, height} = useWindowDimensions();
  const baseTheme = useTheme();
  const bundleLauncherTheme = useMemo(
    () => buildBundleLauncherTheme(baseTheme),
    [baseTheme],
  );
  const {palette, tonePalette} = bundleLauncherTheme;
  const styles = useMemo(
    () => createScreenStyles(palette, tonePalette),
    [palette, tonePalette],
  );
  const supportsBundleUpdates = canManageBundleUpdates();
  const isCompactLayout = width < 1180;
  const workspaceMinHeight = isCompactLayout
    ? undefined
    : Math.max(560, height - 320);
  const [titleBarMetrics, setTitleBarMetrics] = useState<TitleBarMetrics | null>(
    null,
  );
  const showCustomTitleBar = Boolean(titleBarMetrics?.extendsContentIntoTitleBar);
  const customTitleBarHeight = Math.max(48, titleBarMetrics?.height ?? 0);
  const customTitleBarPaddingLeft =
    (titleBarMetrics?.leftInset ?? 0) + appSpacing.lg2;
  const customTitleBarPaddingRight =
    (titleBarMetrics?.rightInset ?? 0) + appSpacing.md;

  const [bundleAvailability, setBundleAvailability] = useState<Record<string, boolean>>({});
  const [startupTargetSelections, setStartupTargetSelections] = useState<
    Record<string, string | undefined>
  >({});
  const [openingTargetId, setOpeningTargetId] = useState<string | null>(null);
  const [actingBundleId, setActingBundleId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'support' | 'danger' | 'neutral'>('neutral');
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
  const flatBundleIds = useMemo(
    () => groupedLibraryEntries.flatMap(section => section.entries.map(e => e.bundleId)),
    [groupedLibraryEntries],
  );
  const rowRefs = useRef(new Map<string, View>());
  const arrowKeyEvents = useMemo(
    () =>
      Platform.OS === 'windows'
        ? [{ code: 'ArrowDown' }, { code: 'ArrowUp' }]
        : undefined,
    [],
  );
  const handleRowKeyDown = useCallback(
    (bundleId: string, e: { nativeEvent: { key: string } }) => {
      const key = e.nativeEvent.key;
      if (key !== 'ArrowDown' && key !== 'ArrowUp') {
        return;
      }

      const currentIndex = flatBundleIds.indexOf(bundleId);
      if (currentIndex === -1) {
        return;
      }

      const nextIndex =
        key === 'ArrowDown'
          ? Math.min(currentIndex + 1, flatBundleIds.length - 1)
          : Math.max(currentIndex - 1, 0);
      if (nextIndex === currentIndex) {
        return;
      }

      const nextBundleId = flatBundleIds[nextIndex];
      const nextRef = rowRefs.current.get(nextBundleId);
      if (nextRef && typeof (nextRef as any).focus === 'function') {
        (nextRef as any).focus();
      }
      setSelectedBundleId(nextBundleId);
      setStatusMessage(null);
    },
    [flatBundleIds],
  );
  const setRowRef = useCallback((bundleId: string, ref: View | null) => {
    if (ref) {
      rowRefs.current.set(bundleId, ref);
    } else {
      rowRefs.current.delete(bundleId);
    }
  }, []);
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
  const agentWorkbenchTarget = useMemo(
    () =>
      companionLaunchTargets.find(target => target.targetId === 'agent-workbench') ??
      null,
    [],
  );
  const availableLaunchTargetBundleIds = useMemo(
    () => launchTargets.map(target => target.bundleId),
    [launchTargets],
  );

  useEffect(() => {
    let cancelled = false;

    void getTitleBarMetrics().then(metrics => {
      if (!cancelled) {
        setTitleBarMetrics(metrics);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [baseTheme.appearancePreset]);

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
      setStatusTone('support');
      setStatusMessage(appI18n.bundleLauncher.feedback.opened);
    } catch (error) {
      console.error('Failed to open launch target', error);
      setStatusTone('danger');
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
      setStatusTone('support');
      setStatusMessage(appI18n.bundleLauncher.feedback.checked);
    } catch (error) {
      console.error('Failed to refresh bundle library', error);
      setStatusTone('danger');
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
      const openTarget = resolveBundleLibraryOpenTarget(entry);
      if (!openTarget) {
        return;
      }

      await openLaunchTarget(openTarget);
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
        setStatusTone('support');
        setStatusMessage(
          entry.primaryActionKind === 'install'
            ? appI18n.bundleLauncher.feedback.installed
            : appI18n.bundleLauncher.feedback.updated,
        );
      } else if (result.status === 'failed') {
        setStatusTone('danger');
        setStatusMessage(
          result.errorMessage ?? appI18n.bundleLauncher.feedback.updateFailed,
        );
      } else {
        setStatusTone('neutral');
        setStatusMessage(appI18n.bundleLauncher.feedback.checked);
      }
    } catch (error) {
      console.error('Failed to run bundle update', error);
      setStatusTone('danger');
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
      setStatusTone('support');
      setStatusMessage(appI18n.bundleLauncher.feedback.saved);
    } catch (error) {
      console.error('Failed to save startup target', error);
      setStatusTone('danger');
      setStatusMessage(appI18n.bundleLauncher.feedback.saveFailed);
    }
  }

  const selectedTargetTitle = selectedEntry?.selectedStartupTarget
    ? formatLaunchTargetTitle(selectedEntry.selectedStartupTarget)
    : null;
  const selectedEntryOpenTarget = selectedEntry
    ? resolveBundleLibraryOpenTarget(selectedEntry)
    : null;
  const selectedEntryCanOpen = selectedEntryOpenTarget
    ? bundleAvailability[selectedEntryOpenTarget.bundleId] ?? true
    : false;

  return (
    <AppThemeProvider theme={bundleLauncherTheme}>
      <View testID='bundle-launcher.screen' style={styles.screen}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {showCustomTitleBar ? (
            <View style={styles.windowChromeShell}>
              <View
                pointerEvents='none'
                style={[
                  styles.windowChrome,
                  {
                    minHeight: customTitleBarHeight,
                    paddingLeft: customTitleBarPaddingLeft,
                    paddingRight: customTitleBarPaddingRight,
                  },
                ]}>
                <View style={styles.windowChromeRibbon} />
                <View
                  style={[
                    styles.windowChromeButtonWell,
                    {
                      width: Math.max(
                        170,
                        (titleBarMetrics?.rightInset ?? 0) + 78,
                      ),
                    },
                  ]}>
                  <View style={styles.windowChromeButtonWellRibbon} />
                  <View style={styles.windowChromeButtonWellGlow} />
                  <View style={styles.windowChromeButtonWellAccent} />
                </View>
                <View style={styles.windowChromeInner}>
                  <View style={styles.windowChromeLead}>
                    <View style={styles.windowChromeBadge}>
                      <View style={styles.windowChromeBadgeDot} />
                      <Text style={styles.windowChromeBadgeText}>OPApp</Text>
                    </View>
                    <View style={styles.windowChromeSparkles}>
                      <View
                        style={[
                          styles.windowChromeSparkle,
                          styles.windowChromeSparkleAccent,
                        ]}
                      />
                      <View
                        style={[
                          styles.windowChromeSparkle,
                          styles.windowChromeSparklePearl,
                        ]}
                      />
                      <View
                        style={[
                          styles.windowChromeSparkle,
                          styles.windowChromeSparkleSupport,
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.windowChromeCopy}>
                    <View style={styles.windowChromeTitleRow}>
                      <View style={styles.windowChromeEyebrowBadge}>
                        <Text style={styles.windowChromeEyebrow}>
                          {appI18n.bundleLauncher.frame.eyebrow}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={styles.windowChromeTitle}>
                        {appI18n.bundleLauncher.frame.title}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.windowChromeTrailingShell}>
                    <View style={styles.windowChromeTrailingConnector}>
                      <View style={styles.windowChromeTrailingConnectorRibbon} />
                      <View style={styles.windowChromeTrailingConnectorGlow} />
                    </View>
                    <View style={styles.windowChromeTrailing}>
                      <View style={styles.windowChromeTrailingPearls}>
                        <View
                          style={[
                            styles.windowChromeTrailingPearl,
                            styles.windowChromeTrailingPearlLarge,
                          ]}
                        />
                        <View
                          style={[
                            styles.windowChromeTrailingPearl,
                            styles.windowChromeTrailingPearlMedium,
                          ]}
                        />
                        <View
                          style={[
                            styles.windowChromeTrailingPearl,
                            styles.windowChromeTrailingPearlSmall,
                          ]}
                        />
                      </View>
                      <Text style={styles.windowChromeDescription}>
                        OPApp Launcher
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : null}
          <AppFrame
            eyebrow={appI18n.bundleLauncher.frame.eyebrow}
            title={appI18n.bundleLauncher.frame.title}
            description={appI18n.bundleLauncher.frame.description}
            showHero={!showCustomTitleBar}>
            <Stack style={styles.stack}>
              <View style={styles.serviceBar}>
                <View style={styles.serviceCopy}>
                  <Text style={styles.serviceLabel}>
                    {appI18n.bundleLauncher.service.label}
                  </Text>
                  <Text
                    testID='bundle-launcher.service.detail'
                    style={styles.serviceValue}>
                    {servicePresentation.detail}
                  </Text>
                </View>
                <View style={styles.serviceActions}>
                  <StatusBadge
                    testID='bundle-launcher.service.status'
                    label={servicePresentation.label}
                    tone={servicePresentation.tone}
                    size='sm'
                  />
                  {supportsBundleUpdates ? (
                    <ActionButton
                      testID='bundle-launcher.action.check-updates'
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
                  {agentWorkbenchTarget ? (
                    <ActionButton
                      label={appI18n.surfaces.agentWorkbench}
                      onPress={() => {
                        void openSurface(
                          createCompanionOpenSurfaceRequest(
                            agentWorkbenchTarget,
                          ),
                        );
                      }}
                      tone='ghost'
                    />
                  ) : null}
                </View>
              </View>

              <View
                style={[
                  styles.libraryShell,
                  typeof workspaceMinHeight === 'number'
                    ? {minHeight: workspaceMinHeight}
                    : null,
                  isCompactLayout ? styles.libraryShellCompact : null,
                ]}>
                <View
                  style={[
                    styles.listPane,
                    isCompactLayout ? styles.listPaneCompact : null,
                  ]}>
                  <BundleLibraryPane
                    groupedLibraryEntries={groupedLibraryEntries}
                    loading={remoteCatalog.status === 'loading'}
                    selectedBundleId={selectedEntry?.bundleId ?? null}
                    bundleAvailability={bundleAvailability}
                    openingTargetId={openingTargetId}
                    keyDownEvents={arrowKeyEvents}
                    onRowRef={setRowRef}
                    onRowKeyDown={handleRowKeyDown}
                    onSelectEntry={bundleId => {
                      setSelectedBundleId(bundleId);
                      setStatusMessage(null);
                    }}
                    onPrimaryAction={entry => {
                      void handlePrimaryAction(entry);
                    }}
                    styles={styles}
                    tonePalette={tonePalette}
                  />
                </View>

                <View
                  style={[
                    styles.detailPane,
                    isCompactLayout ? styles.detailPaneCompact : null,
                  ]}>
                  <BundleDetailPane
                    selectedEntry={selectedEntry}
                    selectedTargetTitle={selectedTargetTitle}
                    selectedEntryOpenTarget={selectedEntryOpenTarget}
                    selectedEntryCanOpen={selectedEntryCanOpen}
                    actingBundleId={actingBundleId}
                    openingTargetId={openingTargetId}
                    savingStartupTarget={savingStartupTarget}
                    startupPreferencesExpanded={startupPreferencesExpanded}
                    advancedDetailsExpanded={advancedDetailsExpanded}
                    statusMessage={statusMessage}
                    statusTone={statusTone}
                    currentWindowId={currentWindowId}
                    onPrimaryAction={entry => {
                      void handlePrimaryAction(entry);
                    }}
                    onSaveStartupTarget={() => {
                      void handleSaveStartupTarget();
                    }}
                    onChooseStartupTarget={(bundleId, targetId) => {
                      setStartupTargetSelections(previous => ({
                        ...previous,
                        [bundleId]: targetId,
                      }));
                      setStatusMessage(null);
                    }}
                    onToggleStartupPreferences={() => {
                      setStartupPreferencesExpanded(previous => !previous);
                    }}
                    onToggleAdvancedDetails={() => {
                      setAdvancedDetailsExpanded(previous => !previous);
                    }}
                    styles={styles}
                  />
                </View>
              </View>
            </Stack>
          </AppFrame>
        </ScrollView>
      </View>
    </AppThemeProvider>
  );
}

export type ScreenTonePalette = AppTheme['tonePalette'];

export type BundleLauncherScreenStyles = ReturnType<typeof createScreenStyles>;

function createScreenStyles(palette: AppPalette, tonePalette: ScreenTonePalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: appSpacing.xl,
  },
  windowChromeShell: {
    paddingHorizontal: 22,
    paddingTop: 8,
    alignItems: 'center',
  },
  windowChrome: {
    width: '100%',
    maxWidth: appLayout.frameMaxWidth,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomColor: palette.border,
    borderColor: palette.border,
    borderRadius: 14,
    backgroundColor: palette.panel,
    paddingTop: appSpacing.sm,
    paddingBottom: appSpacing.sm,
  },
  windowChromeRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: palette.accentSoft,
  },
  windowChromeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appSpacing.md,
    minHeight: 36,
  },
  windowChromeButtonWell: {
    position: 'absolute',
    top: 4,
    right: 0,
    bottom: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
    backgroundColor: palette.panelEmphasis,
    overflow: 'hidden',
    opacity: 0.96,
  },
  windowChromeButtonWellRibbon: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 0,
    height: 3,
    backgroundColor: palette.accentSoft,
  },
  windowChromeButtonWellGlow: {
    position: 'absolute',
    top: 8,
    left: 18,
    width: 64,
    height: 24,
    borderRadius: 999,
    backgroundColor: palette.supportSoft,
    opacity: 0.72,
  },
  windowChromeButtonWellAccent: {
    position: 'absolute',
    right: 28,
    bottom: -10,
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: palette.accentSoft,
    opacity: 0.7,
  },
  windowChromeLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.sm,
  },
  windowChromeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
    paddingHorizontal: appSpacing.md,
    paddingVertical: appSpacing.sm,
  },
  windowChromeBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  windowChromeBadgeText: {
    color: palette.ink,
    letterSpacing: 0.6,
    ...appTypography.captionStrong,
  },
  windowChromeSparkles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.xxs,
  },
  windowChromeSparkle: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  windowChromeSparkleAccent: {
    width: 6,
    height: 6,
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  windowChromeSparklePearl: {
    width: 10,
    height: 10,
    backgroundColor: palette.panel,
  },
  windowChromeSparkleSupport: {
    width: 7,
    height: 7,
    backgroundColor: palette.supportSoft,
    borderColor: palette.support,
  },
  windowChromeCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  windowChromeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.sm,
    minWidth: 0,
  },
  windowChromeEyebrowBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
    paddingHorizontal: appSpacing.sm2,
    paddingVertical: appSpacing.xxs,
    flexShrink: 0,
  },
  windowChromeEyebrow: {
    color: palette.accentHover,
    letterSpacing: 0.4,
    ...appTypography.labelTightBold,
  },
  windowChromeTrailingShell: {
    position: 'relative',
    alignItems: 'flex-end',
    marginRight: appSpacing.xxs,
  },
  windowChromeTrailingConnector: {
    position: 'absolute',
    top: 3,
    right: -54,
    bottom: 3,
    width: 86,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: palette.border,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
    backgroundColor: palette.panelEmphasis,
    overflow: 'hidden',
    opacity: 0.94,
  },
  windowChromeTrailingConnectorRibbon: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 0,
    height: 3,
    backgroundColor: palette.accentSoft,
  },
  windowChromeTrailingConnectorGlow: {
    position: 'absolute',
    top: 7,
    right: 18,
    width: 34,
    height: 14,
    borderRadius: 999,
    backgroundColor: palette.supportSoft,
    opacity: 0.72,
  },
  windowChromeTrailing: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panelEmphasis,
    paddingLeft: appSpacing.sm2,
    paddingRight: appSpacing.md,
    paddingVertical: appSpacing.xxs,
  },
  windowChromeTitle: {
    color: palette.ink,
    flexShrink: 1,
    ...appTypography.subheading,
  },
  windowChromeTrailingPearls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.xxs,
  },
  windowChromeTrailingPearl: {
    borderRadius: 999,
    borderWidth: 1,
  },
  windowChromeTrailingPearlLarge: {
    width: 10,
    height: 10,
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  windowChromeTrailingPearlMedium: {
    width: 8,
    height: 8,
    borderColor: palette.support,
    backgroundColor: palette.supportSoft,
  },
  windowChromeTrailingPearlSmall: {
    width: 6,
    height: 6,
    borderColor: palette.border,
    backgroundColor: palette.panelEmphasis,
  },
  windowChromeDescription: {
    color: palette.inkSoft,
    letterSpacing: 0.4,
    ...appTypography.captionStrong,
  },
  stack: {
    gap: appSpacing.lg2,
  },
  serviceBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: appSpacing.md,
    borderRadius: appRadius.panel,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: appSpacing.lg2,
    paddingVertical: appSpacing.lg,
  },
  serviceCopy: {
    flexGrow: 1,
    minWidth: 280,
    gap: appSpacing.xs,
  },
  serviceLabel: {
    color: palette.inkSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...appTypography.labelTightBold,
  },
  serviceValue: {
    color: palette.ink,
    ...appTypography.bodyStrong,
  },
  serviceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: appSpacing.sm,
  },
  libraryShell: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: appRadius.panel,
    borderWidth: 1,
    borderColor: palette.canvasShade,
    backgroundColor: palette.panel,
    overflow: 'hidden',
  },
  libraryShellCompact: {
    flexDirection: 'column',
  },
  listPane: {
    flex: 1.06,
    minWidth: 0,
    gap: appSpacing.lg,
    borderRightWidth: 1,
    borderRightColor: palette.canvasShade,
    paddingHorizontal: appSpacing.lg2,
    paddingVertical: appSpacing.lg2,
  },
  listPaneCompact: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  detailPane: {
    flex: 0.94,
    minWidth: 0,
    gap: appSpacing.lg,
    backgroundColor: palette.panelEmphasis,
    paddingHorizontal: appSpacing.lg2,
    paddingVertical: appSpacing.lg2,
  },
  detailPaneCompact: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  paneTitle: {
    color: palette.ink,
    ...appTypography.subheading,
  },
  paneDescription: {
    color: palette.inkMuted,
    ...appTypography.body,
  },
  groupSection: {
    gap: appSpacing.sm,
  },
  groupSectionSeparated: {
    borderTopWidth: 1,
    borderTopColor: palette.canvasShade,
    paddingTop: appSpacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appSpacing.sm,
  },
  groupTitle: {
    color: palette.inkSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...appTypography.labelTightBold,
  },
  groupCount: {
    color: palette.inkSoft,
    ...appTypography.captionStrong,
  },
  groupList: {
    gap: appSpacing.sm,
  },
  appRowShell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    borderRadius: appRadius.control,
    borderWidth: 1,
    gap: appSpacing.sm,
    overflow: 'hidden',
  },
  appRow: {
    borderColor: palette.canvasShade,
    backgroundColor: palette.panel,
  },
  appRowSelected: {
    borderColor: palette.border,
    backgroundColor: palette.panelEmphasis,
  },
  appRowIndicator: {
    width: 2,
    height: 26,
    borderRadius: 1,
    marginLeft: appSpacing.sm,
    flexShrink: 0,
  },
  appRowPressable: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.sm,
    paddingVertical: appSpacing.sm,
  },
  appRowPressablePressed: {
    opacity: 0.92,
  },
  appRowBody: {
    flex: 1,
    minWidth: 0,
    gap: appSpacing.xxs,
  },
  appRowTrailing: {
    minWidth: 152,
    alignItems: 'stretch',
    gap: appSpacing.xs,
    marginLeft: appSpacing.xs,
    paddingRight: appSpacing.sm,
    paddingVertical: appSpacing.xs,
  },
  appRowAction: {
    alignSelf: 'flex-end',
    paddingRight: appSpacing.xs,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: appRadius.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconLabel: {
    ...appTypography.bodyStrong,
  },
  appName: {
    color: palette.ink,
    ...appTypography.bodyStrong,
  },
  appSubtitle: {
    color: palette.inkMuted,
    ...appTypography.caption,
  },
  appRowSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: appSpacing.xs,
    paddingTop: appSpacing.xxs,
  },
  appVersionSummary: {
    color: palette.inkSoft,
    ...appTypography.captionStrong,
  },
  emptyState: {
    gap: appSpacing.sm,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panelEmphasis,
    paddingHorizontal: appSpacing.lg,
    paddingVertical: appSpacing.lg,
  },
  emptyStateTitle: {
    color: palette.ink,
    ...appTypography.bodyStrong,
  },
  emptyStateDescription: {
    color: palette.inkMuted,
    ...appTypography.body,
  },
  detailCard: {
    flex: 1,
    gap: appSpacing.lg,
  },
  detailHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: appSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingBottom: appSpacing.md,
  },
  detailHeaderCopy: {
    flex: 1,
    gap: appSpacing.xs,
  },
  detailTitle: {
    color: palette.ink,
    ...appTypography.title,
  },
  detailSubtitle: {
    color: palette.inkMuted,
    ...appTypography.body,
  },
  detailHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.sm2,
  },
  detailNote: {
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: tonePalette.warning.soft.container.borderColor as string,
    backgroundColor: tonePalette.warning.soft.container.backgroundColor as string,
    color: tonePalette.warning.soft.label.color as string,
    paddingHorizontal: appSpacing.md,
    paddingVertical: appSpacing.sm,
    ...appTypography.bodyStrong,
  },
  statusMessage: {
    color: palette.accent,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
    paddingHorizontal: appSpacing.md,
    paddingVertical: appSpacing.sm,
    ...appTypography.bodyStrong,
  },
  statusMessageSuccess: {
    color: tonePalette.support.soft.label.color as string,
    borderColor: tonePalette.support.soft.container.borderColor as string,
    backgroundColor: tonePalette.support.soft.container.backgroundColor as string,
  },
  statusMessageError: {
    color: tonePalette.danger.soft.label.color as string,
    borderColor: tonePalette.danger.soft.container.borderColor as string,
    backgroundColor: tonePalette.danger.soft.container.backgroundColor as string,
  },
  loadingHint: {
    color: palette.inkSoft,
    ...appTypography.caption,
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.sm,
    paddingTop: appSpacing.xs,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.sm,
  },
  advancedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.sm,
  },
  });
}
