import React, {useEffect, useRef, useState} from 'react';
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
  SignalPill,
  Stack,
  StatusBadge,
  appPalette,
  appRadius,
  appSpacing,
  appTypography,
} from '@opapp/ui-native-primitives';

type CaptureActionId =
  | 'capture-ref-tmpfile'
  | 'component-data-uri'
  | 'capture-screen-tmpfile';

type ViewShotLabScreenProps = {
  devSmokeScenario?: string;
};

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

export function ViewShotLabScreen({devSmokeScenario}: ViewShotLabScreenProps = {}) {
  const captureTargetRef = useRef<View>(null);
  const viewShotRef = useRef<ViewShotHandle>(null);
  const managedTmpfileRef = useRef<string | null>(null);
  const busyActionRef = useRef<
    CaptureActionId | 'release' | 'return-main' | 'open-detached' | null
  >(null);
  const devSmokeRanRef = useRef(false);
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

  useEffect(() => {
    if (devSmokeScenario !== 'view-shot-basics' || devSmokeRanRef.current) {
      return;
    }

    devSmokeRanRef.current = true;
    let cancelled = false;
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    void (async () => {
      if (!hostBridgeReady) {
        throw new Error('View Shot dev smoke requires the OpappViewShot host bridge.');
      }

      console.log('[frontend-view-shot] dev-smoke-start');
      logInteraction('view-shot-lab.dev-smoke.start', {
        scenario: devSmokeScenario,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });

      await wait(220);
      if (cancelled) {
        return;
      }

      await focusWindow(currentWindowId ?? 'window.main');
      await wait(180);
      if (cancelled) {
        return;
      }

      const refCaptureResult = await runCapture(
        'capture-ref-tmpfile',
        'tmpfile',
        () =>
          captureRef(captureTargetRef, {
            result: 'tmpfile',
            format: 'png',
            width: 920,
            fileName: createCaptureFileName('view-shot-smoke-ref', 101),
          }),
        {throwOnFailure: true},
      );

      if (!refCaptureResult) {
        throw new Error('View Shot dev smoke did not receive a tmpfile from captureRef.');
      }

      console.log(`[frontend-view-shot] dev-smoke-capture-ref uri=${refCaptureResult}`);
      logInteraction('view-shot-lab.dev-smoke.capture-ref', {
        scenario: devSmokeScenario,
        uri: refCaptureResult,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });

      setSampleSeed(currentSeed => currentSeed + 1);

      await wait(220);
      if (cancelled) {
        return;
      }

      const inspectionCaptureResult = await runCapture(
        'capture-ref-tmpfile',
        'tmpfile',
        () =>
          captureRef(captureTargetRef, {
            result: 'tmpfile',
            format: 'png',
            width: 920,
            fileName: createCaptureFileName('view-shot-smoke-inspect', 103),
          }),
        {throwOnFailure: true, manageTmpfile: false},
      );

      if (!inspectionCaptureResult) {
        throw new Error(
          'View Shot dev smoke did not receive an inspection tmpfile from captureRef.',
        );
      }

      console.log(
        `[frontend-view-shot] dev-smoke-inspection-ref uri=${inspectionCaptureResult}`,
      );
      logInteraction('view-shot-lab.dev-smoke.inspection-ref', {
        scenario: devSmokeScenario,
        uri: inspectionCaptureResult,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });

      await wait(220);
      if (cancelled) {
        return;
      }

      const componentCaptureResult = await runCapture(
        'component-data-uri',
        'data-uri',
        async () => {
          if (!viewShotRef.current) {
            throw new Error('ViewShot target is not mounted yet.');
          }

          const options: CaptureOptions = {
            result: 'data-uri',
            format: 'png',
            width: 920,
          };
          return viewShotRef.current.capture(options);
        },
        {throwOnFailure: true},
      );

      if (!componentCaptureResult) {
        throw new Error('View Shot dev smoke did not receive a data-uri from ViewShot.capture.');
      }

      ensureDataUri(
        componentCaptureResult,
        'data:image/png;base64,',
        'View Shot dev smoke PNG data-uri capture',
      );
      const componentCaptureSummary = summarizeDataUri(componentCaptureResult);
      console.log(
        `[frontend-view-shot] dev-smoke-component-data-uri prefix=${componentCaptureSummary.prefix} length=${componentCaptureSummary.length}`,
      );
      logInteraction('view-shot-lab.dev-smoke.component-data-uri', {
        scenario: devSmokeScenario,
        resultPrefix: componentCaptureSummary.prefix,
        resultLength: componentCaptureSummary.length,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });

      await wait(220);
      if (cancelled) {
        return;
      }

      const jpegLowQualityResult = await runCapture(
        'component-data-uri',
        'data-uri',
        async () => {
          if (!viewShotRef.current) {
            throw new Error('ViewShot target is not mounted yet.');
          }

          const options: CaptureOptions = {
            result: 'data-uri',
            format: 'jpg',
            quality: 0.2,
            width: 920,
          };
          return viewShotRef.current.capture(options);
        },
        {throwOnFailure: true},
      );

      if (!jpegLowQualityResult) {
        throw new Error('View Shot dev smoke did not receive a low-quality JPG data-uri.');
      }

      ensureDataUri(
        jpegLowQualityResult,
        'data:image/jpeg;base64,',
        'View Shot dev smoke JPG low-quality capture',
      );
      const jpegLowQualitySummary = summarizeDataUri(jpegLowQualityResult);

      await wait(220);
      if (cancelled) {
        return;
      }

      const jpegHighQualityResult = await runCapture(
        'component-data-uri',
        'data-uri',
        async () => {
          if (!viewShotRef.current) {
            throw new Error('ViewShot target is not mounted yet.');
          }

          const options: CaptureOptions = {
            result: 'data-uri',
            format: 'jpg',
            quality: 0.92,
            width: 920,
          };
          return viewShotRef.current.capture(options);
        },
        {throwOnFailure: true},
      );

      if (!jpegHighQualityResult) {
        throw new Error('View Shot dev smoke did not receive a high-quality JPG data-uri.');
      }

      ensureDataUri(
        jpegHighQualityResult,
        'data:image/jpeg;base64,',
        'View Shot dev smoke JPG high-quality capture',
      );
      const jpegHighQualitySummary = summarizeDataUri(jpegHighQualityResult);

      if (jpegHighQualitySummary.length <= jpegLowQualitySummary.length) {
        throw new Error(
          'View Shot dev smoke expected the high-quality JPG data-uri to be larger than the low-quality JPG data-uri.',
        );
      }

      console.log(
        `[frontend-view-shot] dev-smoke-jpg-quality low=${jpegLowQualitySummary.length} high=${jpegHighQualitySummary.length}`,
      );
      logInteraction('view-shot-lab.dev-smoke.jpg-quality', {
        scenario: devSmokeScenario,
        lowQuality: 0.2,
        lowResultLength: jpegLowQualitySummary.length,
        highQuality: 0.92,
        highResultLength: jpegHighQualitySummary.length,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });

      await wait(220);
      if (cancelled) {
        return;
      }

      const screenCaptureResult = await runCapture(
        'capture-screen-tmpfile',
        'tmpfile',
        () =>
          captureScreen({
            result: 'tmpfile',
            format: 'png',
            width: 1280,
            fileName: createCaptureFileName('view-shot-smoke-screen', 102),
          }),
        {throwOnFailure: true},
      );

      if (!screenCaptureResult) {
        throw new Error('View Shot dev smoke did not receive a tmpfile from captureScreen.');
      }

      console.log(`[frontend-view-shot] dev-smoke-capture-screen uri=${screenCaptureResult}`);
      logInteraction('view-shot-lab.dev-smoke.capture-screen', {
        scenario: devSmokeScenario,
        uri: screenCaptureResult,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });

      await wait(220);
      if (cancelled) {
        return;
      }

      const removed = await releaseCapture(screenCaptureResult);
      if (!removed) {
        throw new Error('View Shot dev smoke could not delete the generated tmpfile.');
      }

      if (managedTmpfileRef.current === screenCaptureResult) {
        clearManagedTmpfileState();
        setPreviewUri(null);
      }

      setStatusMessage(appI18n.viewShotLab.status.released);
      console.log('[frontend-view-shot] dev-smoke-release-complete');
      logInteraction('view-shot-lab.dev-smoke.release-complete', {
        scenario: devSmokeScenario,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });

      console.log('[frontend-view-shot] dev-smoke-complete');
      logInteraction('view-shot-lab.dev-smoke.complete', {
        scenario: devSmokeScenario,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
    })().catch(error => {
      logException('view-shot-lab.dev-smoke.failed', error, {
        scenario: devSmokeScenario,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [currentWindowId, devSmokeScenario, hostBridgeReady]);

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
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AppFrame
          eyebrow={appI18n.viewShotLab.frame.eyebrow}
          title={appI18n.viewShotLab.frame.title}
          description={appI18n.viewShotLab.frame.description}>
          <Stack>
            <SectionCard
              title={appI18n.viewShotLab.sections.targetTitle}
              description={appI18n.viewShotLab.sections.targetDescription}>
              <View style={styles.metricRow}>
                <InlineMetric
                  label={appI18n.viewShotLab.status.sampleSeed}
                  value={String(sampleSeed).padStart(2, '0')}
                />
                <InlineMetric
                  label={appI18n.viewShotLab.status.captureCount}
                  value={String(captureCount)}
                />
                <InlineMetric
                  label={appI18n.viewShotLab.status.windowId}
                  value={currentWindowId ?? appI18n.common.unknown}
                />
              </View>

              <View style={styles.metricRow}>
                <InlineMetric
                  label={appI18n.viewShotLab.status.windowPolicy}
                  value={formatWindowTargetLabel(currentWindowPolicy)}
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
                    <SignalPill
                      label={`${appI18n.viewShotLab.status.sampleSeed} ${String(sampleSeed).padStart(2, '0')}`}
                      tone="accent"
                      size="sm"
                    />
                    <SignalPill
                      label={`${appI18n.viewShotLab.status.captureCount} ${captureCount}`}
                      tone="support"
                      size="sm"
                    />
                    <SignalPill
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
                  label={appI18n.viewShotLab.actions.captureRefTmpfile}
                  onPress={() => {
                    void handleCaptureRefTmpfile();
                  }}
                  disabled={!hostBridgeReady || Boolean(busyAction)}
                />
                <ActionButton
                  label={appI18n.viewShotLab.actions.captureComponentDataUri}
                  onPress={() => {
                    void handleCaptureComponentDataUri();
                  }}
                  disabled={!hostBridgeReady || Boolean(busyAction)}
                  tone="ghost"
                />
                <ActionButton
                  label={appI18n.viewShotLab.actions.captureScreenTmpfile}
                  onPress={() => {
                    void handleCaptureScreenTmpfile();
                  }}
                  disabled={!hostBridgeReady || Boolean(busyAction)}
                  tone="ghost"
                />
                <ActionButton
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
                <SignalPill label={hostStatusLabel} tone={hostStatusTone} size="sm" />
                <SignalPill
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
                />
                <InlineMetric
                  label={appI18n.viewShotLab.status.latestResultKind}
                  value={latestResultKindLabel}
                />
                <InlineMetric
                  label={appI18n.viewShotLab.status.latestUpdatedAt}
                  value={formatUpdatedAt(lastUpdatedAt)}
                />
              </View>

              {errorMessage ? (
                <InfoPanel title={appI18n.viewShotLab.feedback.captureFailedTitle}>
                  <MutedText>{errorMessage}</MutedText>
                </InfoPanel>
              ) : null}

              {statusMessage ? (
                <InfoPanel title={appI18n.viewShotLab.feedback.hostStatusTitle} tone="neutral">
                  <MutedText>{statusMessage}</MutedText>
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
                <Text selectable style={styles.resultValue}>
                  {lastResult ?? appI18n.viewShotLab.status.idle}
                </Text>
              </View>

              <View style={styles.resultTextBlock}>
                <Text style={styles.resultLabel}>{appI18n.viewShotLab.status.managedTmpfileLabel}</Text>
                <Text selectable style={styles.resultValue}>
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
    borderColor: '#c86c3f',
    backgroundColor: '#fff8f0',
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
    color: '#8e3f1d',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  captureTitle: {
    color: appPalette.ink,
    ...appTypography.title,
  },
  captureDescription: {
    color: appPalette.inkMuted,
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
    backgroundColor: '#f2d3bf',
  },
  captureStripeSupport: {
    backgroundColor: '#d8e7da',
  },
  captureStripeSlate: {
    backgroundColor: '#d9e4ea',
  },
  captureStripeLabel: {
    color: appPalette.ink,
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
    backgroundColor: '#f4ebde',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  captureFootnoteLabel: {
    color: '#6b5649',
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
    borderColor: appPalette.border,
    backgroundColor: appPalette.panel,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 360,
  },
  resultTextBlock: {
    gap: 6,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: appPalette.border,
    backgroundColor: appPalette.panel,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultLabel: {
    color: appPalette.ink,
    ...appTypography.captionBold,
  },
  resultValue: {
    color: appPalette.inkMuted,
    ...appTypography.body,
  },
  noteList: {
    gap: 8,
  },
});
