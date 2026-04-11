import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {logException, logInteraction} from '@opapp/framework-diagnostics';
import {
  ViewShot,
  captureRef,
  captureScreen,
  releaseCapture,
  type CaptureOptions,
  type ViewShotHandle,
  type ViewShotResult,
} from '@opapp/framework-view-shot';
import {
  focusWindow,
  useCurrentWindowId,
  useCurrentWindowPolicy,
  useOpenSurface,
} from '@opapp/framework-windowing';
import {
  ActionButton,
  AppFrame,
  InfoPanel,
  InlineMetric,
  MutedText,
  SectionCard,
  Stack,
  StatusBadge,
  useTheme,
  appRadius,
  appSpacing,
  appTypography,
} from '@opapp/ui-native-primitives';
import type { AppPalette } from '@opapp/ui-native-primitives';

type CaptureActionId =
  | 'capture-ref-tmpfile'
  | 'component-data-uri'
  | 'capture-screen-tmpfile';

type CaptureExecutionOptions = {
  throwOnFailure?: boolean;
  manageTmpfile?: boolean;
};

function formatWindowTargetLabel(policy: string | null) {
  if (policy === 'main') {
    return appI18n.common.windowTarget.main;
  }

  if (policy === 'settings') {
    return appI18n.common.windowTarget.settings;
  }

  if (policy === 'tool') {
    return appI18n.common.windowTarget.tool;
  }

  return appI18n.common.windowTarget.current;
}

function formatCaptureActionLabel(actionId: CaptureActionId | null) {
  if (actionId === 'capture-ref-tmpfile') {
    return appI18n.viewShotLab.actions.captureRefTmpfile;
  }

  if (actionId === 'component-data-uri') {
    return appI18n.viewShotLab.actions.captureComponentDataUri;
  }

  if (actionId === 'capture-screen-tmpfile') {
    return appI18n.viewShotLab.actions.captureScreenTmpfile;
  }

  return appI18n.viewShotLab.status.idle;
}

function toRenderableImageUri(uri: string) {
  if (uri.startsWith('data:') || uri.startsWith('file://')) {
    return uri;
  }

  const normalized = uri.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${normalized}`;
  }

  return normalized;
}

function createCaptureFileName(prefix: string, sampleSeed: number) {
  return `${prefix}-${sampleSeed}-${Date.now()}`;
}

function ensureDataUri(result: string, expectedPrefix: string, context: string) {
  if (!result.startsWith(expectedPrefix) || result.length <= expectedPrefix.length) {
    throw new Error(`${context} did not return a non-empty ${expectedPrefix} payload.`);
  }
}

function normalizeThrownError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return new Error(error);
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0
  ) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

function summarizeDataUri(result: string) {
  const separatorIndex = result.indexOf(',');
  const prefix =
    separatorIndex >= 0 ? result.slice(0, separatorIndex + 1) : result.slice(0, 32);
  return {
    prefix,
    length: result.length,
  };
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return appI18n.common.unknown;
  }

  return new Date(value).toLocaleString('zh-CN', {hour12: false});
}

export function ViewShotLabScreen() {
  const { palette } = useTheme();
  const styles = useMemo(() => createScreenStyles(palette), [palette]);
  const captureTargetRef = useRef<View>(null);
  const viewShotRef = useRef<ViewShotHandle>(null);
  const managedTmpfileRef = useRef<string | null>(null);
  const busyActionRef = useRef<
    CaptureActionId | 'release' | 'return-main' | 'open-detached' | null
  >(null);
  const openSurface = useOpenSurface();
  const currentWindowId = useCurrentWindowId();
  const currentWindowPolicy = useCurrentWindowPolicy();
  const hostBridgeReady =
    Platform.OS === 'windows' &&
    Boolean((NativeModules as {OpappViewShot?: unknown}).OpappViewShot);
  const [sampleSeed, setSampleSeed] = useState(1);
  const [captureCount, setCaptureCount] = useState(0);
  const [busyAction, setBusyAction] = useState<CaptureActionId | 'release' | 'return-main' | 'open-detached' | null>(null);
  const [lastAction, setLastAction] = useState<CaptureActionId | null>(null);
  const [lastResultKind, setLastResultKind] = useState<ViewShotResult | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [managedTmpfile, setManagedTmpfile] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    managedTmpfileRef.current = managedTmpfile;
  }, [managedTmpfile]);

  useEffect(() => {
    busyActionRef.current = busyAction;
  }, [busyAction]);

  useEffect(() => {
    return () => {
      const tmpfileUri = managedTmpfileRef.current;
      if (tmpfileUri) {
        void releaseCapture(tmpfileUri).catch(() => {});
      }
    };
  }, []);

  function rememberManagedTmpfile(nextTmpfile: string | null) {
    setManagedTmpfile(currentTmpfile => {
      if (currentTmpfile && currentTmpfile !== nextTmpfile) {
        void releaseCapture(currentTmpfile).catch(() => {});
      }

      return nextTmpfile;
    });
  }

  function clearManagedTmpfileState() {
    managedTmpfileRef.current = null;
    setManagedTmpfile(null);
  }

  function commitCaptureResult(
    actionId: CaptureActionId,
    resultKind: ViewShotResult,
    result: string,
    options: CaptureExecutionOptions = {},
  ) {
    const nextUpdatedAt = new Date().toISOString();
    setCaptureCount(currentCount => currentCount + 1);
    setLastAction(actionId);
    setLastResultKind(resultKind);
    setLastUpdatedAt(nextUpdatedAt);
    setLastResult(result);
    setPreviewUri(resultKind === 'base64' ? null : toRenderableImageUri(result));
    setErrorMessage(null);
    setStatusMessage(null);

    if (resultKind === 'tmpfile' && options.manageTmpfile !== false) {
      rememberManagedTmpfile(result);
    }
  }

  async function runCapture(
    actionId: CaptureActionId,
    resultKind: ViewShotResult,
    execute: () => Promise<string>,
    options: CaptureExecutionOptions = {},
  ) {
    if (busyActionRef.current) {
      const busyError = new Error('View Shot is busy.');
      if (options.throwOnFailure) {
        throw busyError;
      }
      return null;
    }

    setBusyAction(actionId);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await execute();
      commitCaptureResult(actionId, resultKind, result, options);
      logInteraction('view-shot-lab.capture.succeeded', {
        actionId,
        resultKind,
        sampleSeed,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
      return result;
    } catch (error) {
      const normalizedError = normalizeThrownError(error, 'View Shot capture failed.');
      setErrorMessage(normalizedError.message);
      logException('view-shot-lab.capture.failed', normalizedError, {
        actionId,
        resultKind,
        sampleSeed,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
      if (options.throwOnFailure) {
        throw normalizedError;
      }
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCaptureRefTmpfile() {
    await runCapture('capture-ref-tmpfile', 'tmpfile', () =>
      captureRef(captureTargetRef, {
        result: 'tmpfile',
        format: 'png',
        width: 920,
        fileName: createCaptureFileName('view-shot-target', sampleSeed),
      }),
    );
  }

  async function handleCaptureComponentDataUri() {
    await runCapture('component-data-uri', 'data-uri', async () => {
      if (!viewShotRef.current) {
        throw new Error('ViewShot target is not mounted yet.');
      }

      const options: CaptureOptions = {
        result: 'data-uri',
        format: 'png',
        width: 920,
      };
      return viewShotRef.current.capture(options);
    });
  }

  async function handleCaptureScreenTmpfile() {
    await runCapture('capture-screen-tmpfile', 'tmpfile', () =>
      captureScreen({
        result: 'tmpfile',
        format: 'png',
        width: 1280,
        fileName: createCaptureFileName('view-shot-screen', sampleSeed),
      }),
    );
  }

  async function handleReleaseTmpfile() {
    if (busyAction) {
      return;
    }

    if (!managedTmpfile) {
      setStatusMessage(appI18n.viewShotLab.status.releaseSkipped);
      return;
    }

    setBusyAction('release');
    setErrorMessage(null);

    try {
      const removed = await releaseCapture(managedTmpfile);
      if (removed) {
        if (lastResult === managedTmpfile) {
          setPreviewUri(null);
        }

        clearManagedTmpfileState();
        setStatusMessage(appI18n.viewShotLab.status.released);
        logInteraction('view-shot-lab.capture.released', {
          windowId: currentWindowId ?? appI18n.common.unknown,
        });
      } else {
        setStatusMessage(appI18n.viewShotLab.status.releaseSkipped);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to release tmpfile.';
      setErrorMessage(message);
      logException('view-shot-lab.capture.release-failed', error, {
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReturnMain() {
    if (busyAction) {
      return;
    }

    setBusyAction('return-main');

    try {
      await openSurface({
        surfaceId: 'companion.main',
        presentation: 'current-window',
        initialProps: {
          skipStartupAutoOpen: true,
        },
      });
      logInteraction('view-shot-lab.navigation.return-main', {
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to return to main surface.';
      setErrorMessage(message);
      logException('view-shot-lab.navigation.return-main.failed', error, {
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleOpenDetachedLab() {
    if (busyAction) {
      return;
    }

    setBusyAction('open-detached');
    setErrorMessage(null);

    try {
      await openSurface({
        surfaceId: 'companion.view-shot',
        presentation: 'new-window',
      });
      setStatusMessage(appI18n.viewShotLab.messages.detachedOpened);
      logInteraction('view-shot-lab.navigation.open-detached', {
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to open detached lab window.';
      setErrorMessage(message);
      logException('view-shot-lab.navigation.open-detached.failed', error, {
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
    } finally {
      setBusyAction(null);
    }
  }

  const hostStatusTone = !hostBridgeReady
    ? 'warning'
    : busyAction
      ? 'accent'
      : 'support';
  const hostStatusLabel = !hostBridgeReady
    ? appI18n.viewShotLab.status.hostUnavailable
    : busyAction
      ? appI18n.viewShotLab.status.capturing
      : appI18n.viewShotLab.status.hostReady;
  const latestResultKindLabel = lastResultKind
    ? appI18n.viewShotLab.resultKinds[lastResultKind]
    : appI18n.viewShotLab.status.idle;

  return (
    <View testID='view-shot.screen' style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AppFrame
          eyebrow={appI18n.viewShotLab.frame.eyebrow}
          title={appI18n.viewShotLab.frame.title}
          description={appI18n.viewShotLab.frame.description}
          headerActions={[
            {
              label:
                busyAction === 'return-main'
                  ? appI18n.common.navigation.returnHomeBusy
                  : appI18n.common.navigation.returnHome,
              onPress: () => {
                void handleReturnMain();
              },
              disabled: Boolean(busyAction),
              tone: 'ghost',
              testID: 'view-shot.frame.action.return-home',
            },
          ]}>
          <Stack>
            <SectionCard
              title={appI18n.viewShotLab.sections.targetTitle}
              description={appI18n.viewShotLab.sections.targetDescription}>
              <View style={styles.metricRow}>
                <InlineMetric
                  label={appI18n.viewShotLab.status.sampleSeed}
                  value={String(sampleSeed).padStart(2, '0')}
                  valueTestID='view-shot.metric.sample-seed'
                />
                <InlineMetric
                  label={appI18n.viewShotLab.status.captureCount}
                  value={String(captureCount)}
                  valueTestID='view-shot.metric.capture-count'
                />
                <InlineMetric
                  label={appI18n.viewShotLab.status.windowId}
                  value={currentWindowId ?? appI18n.common.unknown}
                  valueTestID='view-shot.metric.window-id'
                />
              </View>

              <View style={styles.metricRow}>
                <InlineMetric
                  label={appI18n.viewShotLab.status.windowPolicy}
                  value={formatWindowTargetLabel(currentWindowPolicy)}
                  valueTestID='view-shot.metric.window-policy'
                />
              </View>

              <ViewShot ref={viewShotRef}>
                <View
                  ref={captureTargetRef}
                  collapsable={false}
                  style={styles.captureTargetShell}>
                  <View style={styles.captureTargetHeader}>
                    <Text style={styles.captureEyebrow}>
                      {appI18n.viewShotLab.sampleCard.eyebrow}
                    </Text>
                    <StatusBadge
                      label={`${appI18n.viewShotLab.status.sampleSeed} ${String(sampleSeed).padStart(2, '0')}`}
                      tone="accent"
                      size="sm"
                    />
                  </View>
                  <Text style={styles.captureTitle}>
                    {appI18n.viewShotLab.sampleCard.title}
                  </Text>
                  <Text style={styles.captureDescription}>
                    {appI18n.viewShotLab.status.windowId}：{currentWindowId ?? appI18n.common.unknown}。{appI18n.viewShotLab.status.windowPolicy}：{formatWindowTargetLabel(currentWindowPolicy)}。
                  </Text>
                  <View style={styles.captureStripeRow}>
                    <View style={[styles.captureStripe, styles.captureStripeAccent]}>
                      <Text style={styles.captureStripeLabel}>
                        {appI18n.viewShotLab.sampleCard.stripeCaptureRef}
                      </Text>
                    </View>
                    <View style={[styles.captureStripe, styles.captureStripeSupport]}>
                      <Text style={styles.captureStripeLabel}>
                        {appI18n.viewShotLab.sampleCard.stripeComponentCapture}
                      </Text>
                    </View>
                    <View style={[styles.captureStripe, styles.captureStripeSlate]}>
                      <Text style={styles.captureStripeLabel}>
                        {appI18n.viewShotLab.sampleCard.stripeScreenCapture}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.captureSignalRow}>
                    <StatusBadge
                      label={
                        hostBridgeReady
                          ? appI18n.viewShotLab.sampleCard.hostBridgeReady
                          : appI18n.viewShotLab.sampleCard.hostBridgeMissing
                      }
                      tone={hostBridgeReady ? 'support' : 'warning'}
                      size="sm"
                    />
                  </View>
                  <View style={styles.captureFootnote}>
                    <Text style={styles.captureFootnoteLabel}>
                      {appI18n.viewShotLab.sampleCard.renderTimePrefix} {formatUpdatedAt(new Date().toISOString())}
                    </Text>
                    <Text style={styles.captureFootnoteLabel}>
                      {appI18n.viewShotLab.sampleCard.renderSeedHint}
                    </Text>
                  </View>
                </View>
              </ViewShot>

              <View style={styles.actionRow}>
                <ActionButton
                  testID='view-shot.action.bump-sample'
                  label={appI18n.viewShotLab.actions.bumpSample}
                  onPress={() => {
                    setSampleSeed(currentSeed => currentSeed + 1);
                    setStatusMessage(null);
                    setErrorMessage(null);
                  }}
                  disabled={Boolean(busyAction)}
                  tone="ghost"
                />
                <ActionButton
                  testID='view-shot.action.return-main'
                  label={
                    busyAction === 'return-main'
                      ? appI18n.viewShotLab.actions.returnMainBusy
                      : appI18n.viewShotLab.actions.returnMain
                  }
                  onPress={() => {
                    void handleReturnMain();
                  }}
                  disabled={Boolean(busyAction)}
                  tone="ghost"
                />
                <ActionButton
                  testID='view-shot.action.open-detached'
                  label={
                    busyAction === 'open-detached'
                      ? appI18n.viewShotLab.actions.openDetachedLabBusy
                      : appI18n.viewShotLab.actions.openDetachedLab
                  }
                  onPress={() => {
                    void handleOpenDetachedLab();
                  }}
                  disabled={Boolean(busyAction)}
                />
              </View>
            </SectionCard>

            <SectionCard
              title={appI18n.viewShotLab.sections.actionTitle}
              description={appI18n.viewShotLab.sections.actionDescription}>
              <View style={styles.actionRow}>
                <ActionButton
                  testID='view-shot.action.capture-ref'
                  label={appI18n.viewShotLab.actions.captureRefTmpfile}
                  onPress={() => {
                    void handleCaptureRefTmpfile();
                  }}
                  disabled={!hostBridgeReady || Boolean(busyAction)}
                />
                <ActionButton
                  testID='view-shot.action.capture-data-uri'
                  label={appI18n.viewShotLab.actions.captureComponentDataUri}
                  onPress={() => {
                    void handleCaptureComponentDataUri();
                  }}
                  disabled={!hostBridgeReady || Boolean(busyAction)}
                  tone="ghost"
                />
                <ActionButton
                  testID='view-shot.action.capture-screen'
                  label={appI18n.viewShotLab.actions.captureScreenTmpfile}
                  onPress={() => {
                    void handleCaptureScreenTmpfile();
                  }}
                  disabled={!hostBridgeReady || Boolean(busyAction)}
                  tone="ghost"
                />
                <ActionButton
                  testID='view-shot.action.release-tmpfile'
                  label={
                    busyAction === 'release'
                      ? appI18n.viewShotLab.actions.releaseTmpfileBusy
                      : appI18n.viewShotLab.actions.releaseTmpfile
                  }
                  onPress={() => {
                    void handleReleaseTmpfile();
                  }}
                  disabled={Boolean(busyAction) || !managedTmpfile}
                  tone="ghost"
                />
              </View>

              {!hostBridgeReady ? (
                <InfoPanel title={appI18n.viewShotLab.status.hostUnavailable} tone="neutral">
                  <MutedText>{appI18n.viewShotLab.feedback.hostUnavailableBody}</MutedText>
                </InfoPanel>
              ) : null}
            </SectionCard>

            <SectionCard
              title={appI18n.viewShotLab.sections.resultTitle}
              description={appI18n.viewShotLab.sections.resultDescription}>
              <View style={styles.resultStatusRow}>
                <StatusBadge testID='view-shot.status.host' label={hostStatusLabel} tone={hostStatusTone} size="sm" />
                <StatusBadge
                  testID='view-shot.status.tmpfile'
                  label={
                    managedTmpfile
                      ? appI18n.viewShotLab.status.tmpfileReady
                      : appI18n.viewShotLab.status.noTmpfile
                  }
                  tone={managedTmpfile ? 'support' : 'neutral'}
                  size="sm"
                />
              </View>

              <View style={styles.metricRow}>
                <InlineMetric
                  label={appI18n.viewShotLab.status.latestAction}
                  value={formatCaptureActionLabel(lastAction)}
                  valueTestID='view-shot.result.latest-action'
                />
                <InlineMetric
                  label={appI18n.viewShotLab.status.latestResultKind}
                  value={latestResultKindLabel}
                  valueTestID='view-shot.result.latest-kind'
                />
                <InlineMetric
                  label={appI18n.viewShotLab.status.latestUpdatedAt}
                  value={formatUpdatedAt(lastUpdatedAt)}
                  valueTestID='view-shot.result.latest-updated-at'
                />
              </View>

              {errorMessage ? (
                <InfoPanel testID='view-shot.error.panel' title={appI18n.viewShotLab.feedback.captureFailedTitle}>
                  <MutedText>
                    <Text testID='view-shot.error.message'>{errorMessage}</Text>
                  </MutedText>
                </InfoPanel>
              ) : null}

              {statusMessage ? (
                <InfoPanel testID='view-shot.status.panel' title={appI18n.viewShotLab.feedback.hostStatusTitle} tone="neutral">
                  <MutedText>
                    <Text testID='view-shot.status.message'>{statusMessage}</Text>
                  </MutedText>
                </InfoPanel>
              ) : null}

              <View style={styles.previewShell}>
                {previewUri ? (
                  <Image
                    resizeMode="contain"
                    source={{uri: previewUri}}
                    style={styles.previewImage}
                  />
                ) : (
                  <MutedText>{appI18n.viewShotLab.status.previewEmpty}</MutedText>
                )}
              </View>

              <View style={styles.resultTextBlock}>
                <Text style={styles.resultLabel}>{appI18n.viewShotLab.status.latestResultLabel}</Text>
                <Text testID='view-shot.result.latest-result' selectable style={styles.resultValue}>
                  {lastResult ?? appI18n.viewShotLab.status.idle}
                </Text>
              </View>

              <View style={styles.resultTextBlock}>
                <Text style={styles.resultLabel}>{appI18n.viewShotLab.status.managedTmpfileLabel}</Text>
                <Text testID='view-shot.result.managed-tmpfile' selectable style={styles.resultValue}>
                  {managedTmpfile ?? appI18n.viewShotLab.status.noTmpfile}
                </Text>
              </View>
            </SectionCard>

            <SectionCard title={appI18n.viewShotLab.sections.notesTitle}>
              <View style={styles.noteList}>
                <MutedText>{appI18n.viewShotLab.notes.visiblePixels}</MutedText>
                <MutedText>{appI18n.viewShotLab.notes.focusedWindow}</MutedText>
                <MutedText>{appI18n.viewShotLab.notes.measuredRegion}</MutedText>
              </View>
            </SectionCard>
          </Stack>
        </AppFrame>
      </ScrollView>
    </View>
  );
}

function createScreenStyles(palette: AppPalette) {
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
    paddingBottom: 18,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.sm,
  },
  captureTargetShell: {
    gap: 14,
    borderRadius: appRadius.hero,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  captureTargetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  captureEyebrow: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  captureTitle: {
    color: palette.ink,
    ...appTypography.title,
  },
  captureDescription: {
    color: palette.inkMuted,
    ...appTypography.body,
  },
  captureStripeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  captureStripe: {
    minWidth: 150,
    borderRadius: appRadius.control,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  captureStripeAccent: {
    backgroundColor: palette.accentSoft,
  },
  captureStripeSupport: {
    backgroundColor: palette.supportSoft,
  },
  captureStripeSlate: {
    backgroundColor: palette.panelEmphasis,
  },
  captureStripeLabel: {
    color: palette.ink,
    ...appTypography.bodyStrong,
  },
  captureSignalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  captureFootnote: {
    gap: 4,
    borderRadius: appRadius.control,
    backgroundColor: palette.canvasShade,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  captureFootnoteLabel: {
    color: palette.inkMuted,
    ...appTypography.captionStrong,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resultStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewShell: {
    minHeight: 260,
    borderRadius: appRadius.hero,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%' as const,
    height: 360,
  },
  resultTextBlock: {
    gap: 6,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultLabel: {
    color: palette.ink,
    ...appTypography.captionBold,
  },
  resultValue: {
    color: palette.inkMuted,
    ...appTypography.body,
  },
  noteList: {
    gap: 8,
  },
  });
}
