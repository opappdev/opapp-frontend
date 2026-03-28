import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  canOpenBundleTarget,
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
  areCompanionTargetsEqual,
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

export function BundleLauncherScreen({
  devSmokeScenario: _devSmokeScenario,
}: BundleLauncherScreenProps = {}) {
  const openSurface = useOpenSurface();
  const currentWindowId = useCurrentWindowId();
  const [bundleAvailability, setBundleAvailability] = useState<
    Record<string, boolean>
  >({});
  const [selectedTargetId, setSelectedTargetId] = useState(
    companionLaunchTargets[0]?.targetId ?? 'main-launcher',
  );
  const [openingTargetId, setOpeningTargetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const {
    startupTarget: resolvedStartupTarget,
    loading: startupTargetLoading,
    saving: savingStartupTarget,
    save: saveStartupTarget,
  } = useCompanionStartupTarget();
  const startupTargetLoaded = !startupTargetLoading;
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
  const savedTarget = useMemo(
    () =>
      findCompanionLaunchTarget(resolvedStartupTarget, availableLaunchTargets) ??
      availableLaunchTargets[0] ??
      companionLaunchTargets[0],
    [availableLaunchTargets, resolvedStartupTarget],
  );
  const hasUnsavedSelection = !areCompanionTargetsEqual(
    selectedTarget,
    savedTarget,
  );

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
    const bundleIds = [...new Set(companionLaunchTargets.map(target => target.bundleId))];

    void Promise.all(
      bundleIds.map(async bundleId => [bundleId, await canOpenBundleTarget(bundleId)] as const),
    ).then(results => {
      if (cancelled) {
        return;
      }

      setBundleAvailability(Object.fromEntries(results));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (savedTarget?.targetId) {
      setSelectedTargetId(savedTarget.targetId);
    }
  }, [savedTarget?.targetId]);

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
          title={appI18n.bundleLauncher.sections.summaryTitle}
          description={appI18n.bundleLauncher.sections.summaryDescription}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <SignalPill
                label={
                  startupTargetLoaded
                    ? hasUnsavedSelection
                      ? appI18n.bundleLauncher.status.pending
                      : appI18n.bundleLauncher.status.synced
                    : appI18n.bundleLauncher.status.loading
                }
                tone={
                  startupTargetLoaded
                    ? hasUnsavedSelection
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
              {savedTarget?.title ?? appI18n.surfaces.launcher}
            </MutedText>
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
  statusMessage: {
    color: appPalette.accent,
    ...appTypography.bodyStrong,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.md,
  },
});
