import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {logException, logInteraction} from '@opapp/framework-diagnostics';
import {appI18n} from '@opapp/framework-i18n';
import {
  captureWindow,
  isWindowCaptureBridgeAvailable,
  listVisibleWindows,
  type WindowCaptureRegion,
  type WindowCaptureResult,
  type WindowCaptureSelector,
  type WindowCaptureWindowInfo,
} from '@opapp/framework-window-capture';
import {
  useCurrentWindowId,
  useCurrentWindowPolicy,
  useOpenSurface,
} from '@opapp/framework-windowing';
import {
  ActionButton,
  AppFrame,
  ChoiceChip,
  InfoPanel,
  InlineMetric,
  MutedText,
  SectionCard,
  SignalPill,
  Stack,
  useTheme,
  appRadius,
  appSpacing,
  appTypography,
} from '@opapp/ui-native-primitives';
import type { AppPalette } from '@opapp/ui-native-primitives';

type WindowCaptureLabScreenProps = {
  devSmokeScenario?: string;
};

type SelectorDraft = {
  foreground: boolean;
  handle: string;
  processName: string;
  titleContains: string;
  titleExact: string;
  className: string;
};

type BusyActionId =
  | 'refresh'
  | 'capture-window'
  | 'capture-client'
  | 'return-main'
  | 'open-detached'
  | null;

type RunOptions = {
  throwOnFailure?: boolean;
  silentOnSuccess?: boolean;
};

const foregroundSelector: WindowCaptureSelector = {
  foreground: true,
};

const defaultSelectorDraft: SelectorDraft = {
  foreground: true,
  handle: '',
  processName: '',
  titleContains: '',
  titleExact: '',
  className: '',
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

function trimSelectorValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHandleForCompare(
  value: number | string | null | undefined,
): string | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }

    return String(Math.trunc(value));
  }

  const trimmed = typeof value === 'string' ? trimSelectorValue(value) : null;
  if (!trimmed) {
    return null;
  }

  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^\d+$/.test(trimmed)) {
    return String(Number.parseInt(trimmed, 10));
  }

  return trimmed.toLowerCase();
}

function matchesWindowHandle(
  windowInfo: WindowCaptureWindowInfo,
  handleValue: number | string | null | undefined,
) {
  const normalizedHandle = normalizeHandleForCompare(handleValue);
  if (!normalizedHandle) {
    return false;
  }

  return (
    normalizeHandleForCompare(windowInfo.handleHex) === normalizedHandle ||
    normalizeHandleForCompare(windowInfo.handle) === normalizedHandle
  );
}

function findWindowByHandle(
  matches: WindowCaptureWindowInfo[],
  handleValue: number | string | null | undefined,
) {
  return matches.find(match => matchesWindowHandle(match, handleValue)) ?? null;
}

function buildSelectorFromDraftOrThrow(
  selectorDraft: SelectorDraft,
): WindowCaptureSelector {
  const selector: WindowCaptureSelector = {};
  const handle = trimSelectorValue(selectorDraft.handle);
  const processName = trimSelectorValue(selectorDraft.processName);
  const titleContains = trimSelectorValue(selectorDraft.titleContains);
  const titleExact = trimSelectorValue(selectorDraft.titleExact);
  const className = trimSelectorValue(selectorDraft.className);

  if (selectorDraft.foreground) {
    selector.foreground = true;
  }
  if (handle) {
    selector.handle = handle;
  }
  if (processName) {
    selector.processName = processName;
  }
  if (titleContains) {
    selector.titleContains = titleContains;
  }
  if (titleExact) {
    selector.titleExact = titleExact;
  }
  if (className) {
    selector.className = className;
  }

  if (Object.keys(selector).length === 0) {
    throw new Error(appI18n.windowCaptureLab.errors.selectorRequired);
  }

  return selector;
}

function formatSelectorSummary(selectorDraft: SelectorDraft) {
  const summaryParts: string[] = [];
  const handle = trimSelectorValue(selectorDraft.handle);
  const processName = trimSelectorValue(selectorDraft.processName);
  const titleContains = trimSelectorValue(selectorDraft.titleContains);
  const titleExact = trimSelectorValue(selectorDraft.titleExact);
  const className = trimSelectorValue(selectorDraft.className);

  if (selectorDraft.foreground) {
    summaryParts.push('foreground=true');
  }
  if (handle) {
    summaryParts.push(
      `${appI18n.windowCaptureLab.fields.handle.label}=${handle}`,
    );
  }
  if (processName) {
    summaryParts.push(
      `${appI18n.windowCaptureLab.fields.processName.label}=${processName}`,
    );
  }
  if (titleContains) {
    summaryParts.push(
      `${appI18n.windowCaptureLab.fields.titleContains.label}=${titleContains}`,
    );
  }
  if (titleExact) {
    summaryParts.push(
      `${appI18n.windowCaptureLab.fields.titleExact.label}=${titleExact}`,
    );
  }
  if (className) {
    summaryParts.push(
      `${appI18n.windowCaptureLab.fields.className.label}=${className}`,
    );
  }

  return summaryParts.length > 0
    ? summaryParts.join(' + ')
    : appI18n.common.unknown;
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

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return appI18n.common.unknown;
  }

  return new Date(value).toLocaleString('zh-CN', {hour12: false});
}

function formatCaptureSize(result: WindowCaptureResult | null) {
  if (!result) {
    return appI18n.common.unknown;
  }

  return `${result.captureSize.width} x ${result.captureSize.height}`;
}

function formatCropBounds(result: WindowCaptureResult | null) {
  if (!result?.cropBounds) {
    return appI18n.common.unknown;
  }

  return `${result.cropBounds.width} x ${result.cropBounds.height}`;
}

function formatSourceItemSize(result: WindowCaptureResult | null) {
  if (!result?.sourceItemSize) {
    return appI18n.common.unknown;
  }

  return `${result.sourceItemSize.width} x ${result.sourceItemSize.height}`;
}

function resolveTargetWindow(
  matches: WindowCaptureWindowInfo[],
  selectorDraft: SelectorDraft,
  result: WindowCaptureResult | null,
) {
  return (
    findWindowByHandle(matches, selectorDraft.handle) ??
    result?.selectedWindow ??
    matches[0] ??
    null
  );
}

function upsertWindowMatch(
  matches: WindowCaptureWindowInfo[],
  selectedWindow: WindowCaptureWindowInfo,
) {
  const existingIndex = matches.findIndex(match =>
    matchesWindowHandle(match, selectedWindow.handleHex),
  );

  if (existingIndex < 0) {
    return [selectedWindow, ...matches];
  }

  const nextMatches = [...matches];
  nextMatches.splice(existingIndex, 1);
  return [selectedWindow, ...nextMatches];
}

export function WindowCaptureLabScreen({
  devSmokeScenario,
}: WindowCaptureLabScreenProps = {}) {
  const { palette } = useTheme();
  const styles = useMemo(() => createScreenStyles(palette), [palette]);
  const busyActionRef = useRef<BusyActionId>(null);
  const devSmokeRanRef = useRef(false);
  const openSurface = useOpenSurface();
  const currentWindowId = useCurrentWindowId();
  const currentWindowPolicy = useCurrentWindowPolicy();
  const hostBridgeReady =
    Platform.OS === 'windows' && isWindowCaptureBridgeAvailable();
  const [busyAction, setBusyAction] = useState<BusyActionId>(null);
  const [selectorDraft, setSelectorDraft] =
    useState<SelectorDraft>(defaultSelectorDraft);
  const [windowMatches, setWindowMatches] = useState<WindowCaptureWindowInfo[]>([]);
  const [lastResult, setLastResult] = useState<WindowCaptureResult | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectorEditorReady, setSelectorEditorReady] = useState(false);
  const selectorSummary = formatSelectorSummary(selectorDraft);
  const pinnedHandle = trimSelectorValue(selectorDraft.handle);
  const targetWindow = resolveTargetWindow(
    windowMatches,
    selectorDraft,
    lastResult,
  );

  useEffect(() => {
    busyActionRef.current = busyAction;
  }, [busyAction]);

  useEffect(() => {
    // Defer RNW TextInput creation until after the first commit. Mounting this
    // screen directly via current-window auto-open can otherwise stall before
    // the companion mounted/dev-smoke markers are emitted.
    setSelectorEditorReady(true);
  }, []);

  async function refreshForegroundWindow(
    options: RunOptions & {selector?: WindowCaptureSelector} = {},
  ) {
    if (!hostBridgeReady) {
      const unavailableError = new Error(
        'Window Capture requires the OpappWindowCapture host bridge.',
      );
      if (options.throwOnFailure) {
        throw unavailableError;
      }
      setErrorMessage(unavailableError.message);
      return [];
    }

    if (busyActionRef.current && !options.throwOnFailure) {
      return [];
    }

    busyActionRef.current = 'refresh';
    setBusyAction('refresh');
    setErrorMessage(null);
    if (!options.silentOnSuccess) {
      setStatusMessage(null);
    }

    try {
      const selector =
        options.selector ?? buildSelectorFromDraftOrThrow(selectorDraft);
      const matches = await listVisibleWindows(selector);
      setWindowMatches(matches);
      if (!options.silentOnSuccess) {
        setStatusMessage(appI18n.windowCaptureLab.messages.refreshed);
      }
      logInteraction('window-capture-lab.refresh', {
        count: matches.length,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
      return matches;
    } catch (error) {
      const normalizedError = normalizeThrownError(
        error,
        'Window Capture could not resolve the current foreground window.',
      );
      setErrorMessage(normalizedError.message);
      logException('window-capture-lab.refresh.failed', normalizedError, {
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
      if (options.throwOnFailure) {
        throw normalizedError;
      }
      return [];
    } finally {
      busyActionRef.current = null;
      setBusyAction(null);
    }
  }

  async function runCapture(
    actionId: Exclude<
      BusyActionId,
      'refresh' | 'return-main' | 'open-detached' | null
    >,
    region: WindowCaptureRegion,
    options: RunOptions & {selector?: WindowCaptureSelector} = {},
  ) {
    if (!hostBridgeReady) {
      const unavailableError = new Error(
        'Window Capture requires the OpappWindowCapture host bridge.',
      );
      if (options.throwOnFailure) {
        throw unavailableError;
      }
      setErrorMessage(unavailableError.message);
      return null;
    }

    if (busyActionRef.current && !options.throwOnFailure) {
      return null;
    }

    busyActionRef.current = actionId;
    setBusyAction(actionId);
    setErrorMessage(null);
    if (!options.silentOnSuccess) {
      setStatusMessage(null);
    }

    try {
      const selector =
        options.selector ?? buildSelectorFromDraftOrThrow(selectorDraft);
      const result = await captureWindow(selector, {
        backend: 'auto',
        region,
        format: 'png',
        timeoutMs: 5000,
      });
      setWindowMatches(current =>
        upsertWindowMatch(current, result.selectedWindow),
      );
      setLastResult(result);
      setLastUpdatedAt(new Date().toISOString());
      setPreviewUri(toRenderableImageUri(result.outputPath));
      if (!options.silentOnSuccess) {
        setStatusMessage(
          region === 'window'
            ? appI18n.windowCaptureLab.messages.capturedWindow
            : appI18n.windowCaptureLab.messages.capturedClient,
        );
      }
      logInteraction('window-capture-lab.capture.succeeded', {
        backend: result.backend,
        region: result.region,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
      return result;
    } catch (error) {
      const normalizedError = normalizeThrownError(
        error,
        'Window Capture failed.',
      );
      setErrorMessage(normalizedError.message);
      logException('window-capture-lab.capture.failed', normalizedError, {
        actionId,
        region,
        windowId: currentWindowId ?? appI18n.common.unknown,
      });
      if (options.throwOnFailure) {
        throw normalizedError;
      }
      return null;
    } finally {
      busyActionRef.current = null;
      setBusyAction(null);
    }
  }

  useEffect(() => {
    if (!hostBridgeReady) {
      return;
    }

    void refreshForegroundWindow({silentOnSuccess: true});
  }, [hostBridgeReady]);

  useEffect(() => {
    if (devSmokeScenario !== 'window-capture-basics' || devSmokeRanRef.current) {
      return;
    }

    if (!hostBridgeReady) {
      return;
    }

    devSmokeRanRef.current = true;

    void (async () => {
      try {
        console.log('[frontend-window-capture] dev-smoke-start');
        logInteraction('window-capture-lab.dev-smoke.start', {
          scenario: devSmokeScenario,
          windowId: currentWindowId ?? appI18n.common.unknown,
        });

        const matches = await refreshForegroundWindow({
          throwOnFailure: true,
          silentOnSuccess: true,
          selector: foregroundSelector,
        });
        const selectedWindow = matches[0];
        if (!selectedWindow) {
          throw new Error(
            'Window Capture dev smoke did not find the current foreground window.',
          );
        }

        console.log(
          `[frontend-window-capture] dev-smoke-list count=${matches.length} handle=${selectedWindow.handleHex} process=${selectedWindow.processName}`,
        );
        logInteraction('window-capture-lab.dev-smoke.list', {
          scenario: devSmokeScenario,
          count: matches.length,
          handle: selectedWindow.handleHex,
          processName: selectedWindow.processName,
        });

        const windowResult = await runCapture('capture-window', 'window', {
          throwOnFailure: true,
          silentOnSuccess: true,
          selector: foregroundSelector,
        });
        if (!windowResult) {
          throw new Error(
            'Window Capture dev smoke did not receive a window capture result.',
          );
        }
        if (windowResult.backend !== 'wgc') {
          throw new Error(
            `Window Capture dev smoke expected backend=wgc for region=window, received ${windowResult.backend}.`,
          );
        }
        if (
          windowResult.captureSize.width <= 0 ||
          windowResult.captureSize.height <= 0
        ) {
          throw new Error(
            'Window Capture dev smoke returned an invalid window capture size.',
          );
        }

        console.log(
          `[frontend-window-capture] dev-smoke-capture-window backend=${windowResult.backend} size=${windowResult.captureSize.width}x${windowResult.captureSize.height} path=${windowResult.outputPath}`,
        );
        logInteraction('window-capture-lab.dev-smoke.capture-window', {
          scenario: devSmokeScenario,
          backend: windowResult.backend,
          width: windowResult.captureSize.width,
          height: windowResult.captureSize.height,
        });

        const clientResult = await runCapture('capture-client', 'client', {
          throwOnFailure: true,
          silentOnSuccess: true,
          selector: foregroundSelector,
        });
        if (!clientResult) {
          throw new Error(
            'Window Capture dev smoke did not receive a client capture result.',
          );
        }
        if (clientResult.backend !== 'wgc') {
          throw new Error(
            `Window Capture dev smoke expected backend=wgc for region=client, received ${clientResult.backend}.`,
          );
        }
        if (
          !clientResult.cropBounds ||
          clientResult.cropBounds.width <= 0 ||
          clientResult.cropBounds.height <= 0
        ) {
          throw new Error(
            'Window Capture dev smoke did not receive valid client crop bounds.',
          );
        }
        if (
          clientResult.selectedWindow.handle !== windowResult.selectedWindow.handle
        ) {
          throw new Error(
            'Window Capture dev smoke switched target windows between window and client captures.',
          );
        }

        console.log(
          `[frontend-window-capture] dev-smoke-capture-client backend=${clientResult.backend} crop=${clientResult.cropBounds.width}x${clientResult.cropBounds.height} path=${clientResult.outputPath}`,
        );
        logInteraction('window-capture-lab.dev-smoke.capture-client', {
          scenario: devSmokeScenario,
          backend: clientResult.backend,
          width: clientResult.cropBounds.width,
          height: clientResult.cropBounds.height,
        });

        console.log('[frontend-window-capture] dev-smoke-complete');
        logInteraction('window-capture-lab.dev-smoke.complete', {
          scenario: devSmokeScenario,
          windowId: currentWindowId ?? appI18n.common.unknown,
        });
      } catch (error) {
        const normalizedError = normalizeThrownError(
          error,
          'Window Capture dev smoke failed.',
        );
        setErrorMessage(normalizedError.message);
        logException('window-capture-lab.dev-smoke.failed', normalizedError, {
          scenario: devSmokeScenario,
          windowId: currentWindowId ?? appI18n.common.unknown,
        });
      }
    })();
  }, [currentWindowId, devSmokeScenario, hostBridgeReady]);

  async function handleReturnMain() {
    if (busyAction) {
      return;
    }

    busyActionRef.current = 'return-main';
    setBusyAction('return-main');
    setErrorMessage(null);

    try {
      await openSurface({
        surfaceId: 'companion.main',
        presentation: 'current-window',
        initialProps: {
          skipStartupAutoOpen: true,
        },
      });
    } catch (error) {
      const normalizedError = normalizeThrownError(
        error,
        'Failed to switch back to the main surface.',
      );
      setErrorMessage(normalizedError.message);
      logException(
        'window-capture-lab.navigation.return-main.failed',
        normalizedError,
        {
          windowId: currentWindowId ?? appI18n.common.unknown,
        },
      );
    } finally {
      busyActionRef.current = null;
      setBusyAction(null);
    }
  }

  async function handleOpenDetachedLab() {
    if (busyAction) {
      return;
    }

    busyActionRef.current = 'open-detached';
    setBusyAction('open-detached');
    setErrorMessage(null);

    try {
      await openSurface({
        surfaceId: 'companion.window-capture',
        presentation: 'new-window',
      });
      setStatusMessage(appI18n.windowCaptureLab.messages.detachedOpened);
    } catch (error) {
      const normalizedError = normalizeThrownError(
        error,
        'Failed to open the detached Window Capture lab surface.',
      );
      setErrorMessage(normalizedError.message);
      logException(
        'window-capture-lab.navigation.open-detached.failed',
        normalizedError,
        {
          windowId: currentWindowId ?? appI18n.common.unknown,
        },
      );
    } finally {
      busyActionRef.current = null;
      setBusyAction(null);
    }
  }

  function handleUseForegroundDefaults() {
    setSelectorDraft(defaultSelectorDraft);
    setWindowMatches([]);
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handleClearManualSelectorFields() {
    setSelectorDraft(current => ({
      ...current,
      handle: '',
      processName: '',
      titleContains: '',
      titleExact: '',
      className: '',
    }));
    setWindowMatches([]);
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handlePinWindowMatch(match: WindowCaptureWindowInfo) {
    setSelectorDraft(current => ({
      ...current,
      handle: match.handleHex,
    }));
    setErrorMessage(null);
    setStatusMessage(appI18n.windowCaptureLab.messages.pinnedWindow);
  }

  function handleClearPinnedHandle() {
    setSelectorDraft(current => ({
      ...current,
      handle: '',
    }));
    setErrorMessage(null);
    setStatusMessage(appI18n.windowCaptureLab.messages.clearedPinnedHandle);
  }

  const hostStatusLabel = !hostBridgeReady
    ? appI18n.windowCaptureLab.status.hostUnavailable
    : busyAction === 'capture-window' || busyAction === 'capture-client'
      ? appI18n.windowCaptureLab.status.capturing
      : appI18n.windowCaptureLab.status.hostReady;

  const hostStatusTone = !hostBridgeReady
    ? 'warning'
    : busyAction === 'capture-window' || busyAction === 'capture-client'
      ? 'accent'
      : 'support';

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AppFrame
          eyebrow={appI18n.windowCaptureLab.frame.eyebrow}
          title={appI18n.windowCaptureLab.frame.title}
          description={appI18n.windowCaptureLab.frame.description}>
          <Stack>
            <SectionCard
              title={appI18n.windowCaptureLab.sections.selectorTitle}
              description={appI18n.windowCaptureLab.sections.selectorDescription}>
              <Stack>
                <View style={styles.choiceRow}>
                  <ChoiceChip
                    label={appI18n.windowCaptureLab.selectorModes.foreground.label}
                    detail={appI18n.windowCaptureLab.selectorModes.foreground.detail}
                    active={selectorDraft.foreground}
                    activeBadgeLabel={appI18n.common.choiceStatus.current}
                    inactiveBadgeLabel={appI18n.common.choiceStatus.switchTo}
                    onPress={() => {
                      setSelectorDraft(current => ({
                        ...current,
                        foreground: true,
                      }));
                    }}
                  />
                  <ChoiceChip
                    label={appI18n.windowCaptureLab.selectorModes.manual.label}
                    detail={appI18n.windowCaptureLab.selectorModes.manual.detail}
                    active={!selectorDraft.foreground}
                    activeBadgeLabel={appI18n.common.choiceStatus.current}
                    inactiveBadgeLabel={appI18n.common.choiceStatus.switchTo}
                    onPress={() => {
                      setSelectorDraft(current => ({
                        ...current,
                        foreground: false,
                      }));
                    }}
                  />
                </View>
                {selectorEditorReady ? (
                  <View style={styles.selectorGrid}>
                    <View style={styles.selectorField}>
                      <Text style={styles.selectorLabel}>
                        {appI18n.windowCaptureLab.fields.handle.label}
                      </Text>
                      <TextInput
                        value={selectorDraft.handle}
                        onChangeText={value => {
                          setSelectorDraft(current => ({
                            ...current,
                            handle: value,
                          }));
                        }}
                        placeholder={
                          appI18n.windowCaptureLab.fields.handle.placeholder
                        }
                        placeholderTextColor={palette.inkSoft}
                        style={styles.selectorInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <View style={styles.selectorField}>
                      <Text style={styles.selectorLabel}>
                        {appI18n.windowCaptureLab.fields.processName.label}
                      </Text>
                      <TextInput
                        value={selectorDraft.processName}
                        onChangeText={value => {
                          setSelectorDraft(current => ({
                            ...current,
                            processName: value,
                          }));
                        }}
                        placeholder={
                          appI18n.windowCaptureLab.fields.processName.placeholder
                        }
                        placeholderTextColor={palette.inkSoft}
                        style={styles.selectorInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <View style={styles.selectorField}>
                      <Text style={styles.selectorLabel}>
                        {appI18n.windowCaptureLab.fields.titleContains.label}
                      </Text>
                      <TextInput
                        value={selectorDraft.titleContains}
                        onChangeText={value => {
                          setSelectorDraft(current => ({
                            ...current,
                            titleContains: value,
                          }));
                        }}
                        placeholder={
                          appI18n.windowCaptureLab.fields.titleContains.placeholder
                        }
                        placeholderTextColor={palette.inkSoft}
                        style={styles.selectorInput}
                        autoCorrect={false}
                      />
                    </View>
                    <View style={styles.selectorField}>
                      <Text style={styles.selectorLabel}>
                        {appI18n.windowCaptureLab.fields.titleExact.label}
                      </Text>
                      <TextInput
                        value={selectorDraft.titleExact}
                        onChangeText={value => {
                          setSelectorDraft(current => ({
                            ...current,
                            titleExact: value,
                          }));
                        }}
                        placeholder={
                          appI18n.windowCaptureLab.fields.titleExact.placeholder
                        }
                        placeholderTextColor={palette.inkSoft}
                        style={styles.selectorInput}
                        autoCorrect={false}
                      />
                    </View>
                    <View style={styles.selectorField}>
                      <Text style={styles.selectorLabel}>
                        {appI18n.windowCaptureLab.fields.className.label}
                      </Text>
                      <TextInput
                        value={selectorDraft.className}
                        onChangeText={value => {
                          setSelectorDraft(current => ({
                            ...current,
                            className: value,
                          }));
                        }}
                        placeholder={
                          appI18n.windowCaptureLab.fields.className.placeholder
                        }
                        placeholderTextColor={palette.inkSoft}
                        style={styles.selectorInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                ) : null}
                <View style={styles.statusBlock}>
                  <MutedText>
                    {appI18n.windowCaptureLab.status.selectorSummary}：
                    {selectorSummary}
                  </MutedText>
                </View>
                <View style={styles.actionRow}>
                  <ActionButton
                    label={appI18n.windowCaptureLab.actions.useForegroundDefaults}
                    onPress={handleUseForegroundDefaults}
                    disabled={busyAction !== null}
                    tone="ghost"
                  />
                  <ActionButton
                    label={appI18n.windowCaptureLab.actions.clearManualFilters}
                    onPress={handleClearManualSelectorFields}
                    disabled={busyAction !== null}
                    tone="ghost"
                  />
                  <ActionButton
                    label={appI18n.windowCaptureLab.actions.clearPinnedHandle}
                    onPress={handleClearPinnedHandle}
                    disabled={busyAction !== null || !pinnedHandle}
                    tone="ghost"
                  />
                </View>
              </Stack>
            </SectionCard>

            <SectionCard
              title={appI18n.windowCaptureLab.sections.targetTitle}
              description={appI18n.windowCaptureLab.sections.targetDescription}>
              <Stack>
                <View style={styles.metricRow}>
                  <InlineMetric
                    label={appI18n.windowCaptureLab.status.foregroundMatches}
                    value={String(windowMatches.length)}
                  />
                  <InlineMetric
                    label={appI18n.windowCaptureLab.status.selectedProcess}
                    value={targetWindow?.processName ?? appI18n.common.unknown}
                  />
                  <InlineMetric
                    label={appI18n.viewShotLab.status.windowId}
                    value={currentWindowId ?? appI18n.common.unknown}
                  />
                  <InlineMetric
                    label={appI18n.viewShotLab.status.windowPolicy}
                    value={formatWindowTargetLabel(currentWindowPolicy)}
                  />
                </View>
                <View style={styles.statusBlock}>
                  <MutedText>
                    {appI18n.windowCaptureLab.status.selectedWindow}：
                    {targetWindow?.title ?? appI18n.common.unknown}
                  </MutedText>
                  <MutedText>
                    {appI18n.windowCaptureLab.status.selectedHandle}：
                    {targetWindow?.handleHex ?? appI18n.common.unknown}
                  </MutedText>
                  <MutedText>
                    {appI18n.windowCaptureLab.status.pinnedHandle}：
                    {pinnedHandle ?? appI18n.windowCaptureLab.status.pinnedHandleEmpty}
                  </MutedText>
                  <MutedText>
                    {appI18n.windowCaptureLab.status.candidateHint}
                  </MutedText>
                </View>
                {windowMatches.length > 0 ? (
                  <View style={styles.matchList}>
                    {windowMatches.map((match, index) => {
                      const isPinned = matchesWindowHandle(
                        match,
                        selectorDraft.handle,
                      );
                      const isCaptured =
                        lastResult?.selectedWindow
                          ? matchesWindowHandle(
                              match,
                              lastResult.selectedWindow.handleHex,
                            )
                          : false;

                      return (
                        <Pressable
                          key={`${match.handleHex}-${index}`}
                          onPress={() => {
                            handlePinWindowMatch(match);
                          }}
                          disabled={busyAction !== null}
                          style={({pressed}) => [
                            styles.matchCard,
                            isPinned ? styles.matchCardPinned : null,
                            pressed && busyAction === null
                              ? styles.matchCardPressed
                              : null,
                          ]}>
                          <View style={styles.matchCardHeader}>
                            <Text style={styles.matchCardTitle}>
                              {match.title || appI18n.common.unknown}
                            </Text>
                            <View style={styles.matchBadgeRow}>
                              {isPinned ? (
                                <SignalPill
                                  label={
                                    appI18n.windowCaptureLab.status.candidatePinned
                                  }
                                  tone="support"
                                  size="sm"
                                />
                              ) : null}
                              {!isPinned && index === 0 ? (
                                <SignalPill
                                  label={
                                    appI18n.windowCaptureLab.status.candidateDefault
                                  }
                                  tone="neutral"
                                  size="sm"
                                />
                              ) : null}
                              {isCaptured ? (
                                <SignalPill
                                  label={
                                    appI18n.windowCaptureLab.status.candidateCaptured
                                  }
                                  tone="accent"
                                  size="sm"
                                />
                              ) : null}
                              {match.isForeground ? (
                                <SignalPill
                                  label={
                                    appI18n.windowCaptureLab.status.candidateForeground
                                  }
                                  tone="support"
                                  size="sm"
                                />
                              ) : null}
                              {match.isMinimized ? (
                                <SignalPill
                                  label={
                                    appI18n.windowCaptureLab.status.candidateMinimized
                                  }
                                  tone="warning"
                                  size="sm"
                                />
                              ) : null}
                            </View>
                          </View>
                          <MutedText>
                            {match.handleHex} · {match.processName}
                          </MutedText>
                          <MutedText>{match.className}</MutedText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.statusBlock}>
                    <MutedText>
                      {appI18n.windowCaptureLab.status.candidateEmpty}
                    </MutedText>
                  </View>
                )}
                <View style={styles.actionRow}>
                  <ActionButton
                    label={appI18n.windowCaptureLab.actions.refreshForeground}
                    onPress={() => {
                      void refreshForegroundWindow();
                    }}
                    disabled={!hostBridgeReady || busyAction !== null}
                    tone="ghost"
                  />
                  <ActionButton
                    label={
                      busyAction === 'return-main'
                        ? appI18n.windowCaptureLab.actions.returnMainBusy
                        : appI18n.windowCaptureLab.actions.returnMain
                    }
                    onPress={() => {
                      void handleReturnMain();
                    }}
                    disabled={busyAction !== null}
                    tone="ghost"
                  />
                  <ActionButton
                    label={
                      busyAction === 'open-detached'
                        ? appI18n.windowCaptureLab.actions.openDetachedLabBusy
                        : appI18n.windowCaptureLab.actions.openDetachedLab
                    }
                    onPress={() => {
                      void handleOpenDetachedLab();
                    }}
                    disabled={busyAction !== null}
                  />
                </View>
              </Stack>
            </SectionCard>

            <SectionCard
              title={appI18n.windowCaptureLab.sections.actionTitle}
              description={appI18n.windowCaptureLab.sections.actionDescription}>
              <View style={styles.actionRow}>
                <ActionButton
                  label={appI18n.windowCaptureLab.actions.captureWindow}
                  onPress={() => {
                    void runCapture('capture-window', 'window');
                  }}
                  disabled={!hostBridgeReady || busyAction !== null}
                />
                <ActionButton
                  label={appI18n.windowCaptureLab.actions.captureClient}
                  onPress={() => {
                    void runCapture('capture-client', 'client');
                  }}
                  disabled={!hostBridgeReady || busyAction !== null}
                  tone="ghost"
                />
              </View>
            </SectionCard>

            {!hostBridgeReady ? (
              <InfoPanel
                title={appI18n.windowCaptureLab.status.hostUnavailable}
                tone="neutral">
                <MutedText>
                  {appI18n.windowCaptureLab.feedback.hostUnavailableBody}
                </MutedText>
              </InfoPanel>
            ) : null}

            <SectionCard
              title={appI18n.windowCaptureLab.sections.resultTitle}
              description={appI18n.windowCaptureLab.sections.resultDescription}>
              <Stack>
                <View style={styles.metricRow}>
                  <SignalPill
                    label={hostStatusLabel}
                    tone={hostStatusTone}
                    size="sm"
                  />
                  <InlineMetric
                    label={appI18n.windowCaptureLab.status.selectedBackend}
                    value={
                      lastResult?.backend ?? appI18n.windowCaptureLab.status.idle
                    }
                  />
                  <InlineMetric
                    label={appI18n.windowCaptureLab.status.latestRegion}
                    value={
                      lastResult?.region ?? appI18n.windowCaptureLab.status.idle
                    }
                  />
                  <InlineMetric
                    label={appI18n.windowCaptureLab.status.latestCaptureSize}
                    value={formatCaptureSize(lastResult)}
                  />
                  <InlineMetric
                    label={appI18n.windowCaptureLab.status.latestUpdatedAt}
                    value={formatUpdatedAt(lastUpdatedAt)}
                  />
                </View>
                {errorMessage ? (
                  <InfoPanel
                    title={appI18n.windowCaptureLab.feedback.captureFailedTitle}>
                    <MutedText>{errorMessage}</MutedText>
                  </InfoPanel>
                ) : null}
                {statusMessage ? (
                  <InfoPanel
                    title={appI18n.windowCaptureLab.feedback.hostStatusTitle}
                    tone="neutral">
                    <MutedText>{statusMessage}</MutedText>
                  </InfoPanel>
                ) : null}
                <View style={styles.resultShell}>
                  {previewUri ? (
                    <Image
                      source={{uri: previewUri}}
                      style={styles.preview}
                      resizeMode="contain"
                    />
                  ) : (
                    <MutedText>
                      {appI18n.windowCaptureLab.status.previewEmpty}
                    </MutedText>
                  )}
                </View>
                <View style={styles.statusBlock}>
                  <Text style={styles.resultLabel}>outputPath</Text>
                  <Text style={styles.resultValue}>
                    {lastResult?.outputPath ??
                      appI18n.windowCaptureLab.status.idle}
                  </Text>
                  <Text style={styles.resultLabel}>selectedWindow</Text>
                  <Text style={styles.resultValue}>
                    {lastResult
                      ? `${lastResult.selectedWindow.processName} · ${lastResult.selectedWindow.title}`
                      : appI18n.windowCaptureLab.status.idle}
                  </Text>
                  <Text style={styles.resultLabel}>cropBounds</Text>
                  <Text style={styles.resultValue}>
                    {formatCropBounds(lastResult)}
                  </Text>
                  <Text style={styles.resultLabel}>sourceItemSize</Text>
                  <Text style={styles.resultValue}>
                    {formatSourceItemSize(lastResult)}
                  </Text>
                  {lastResult?.visibilityWarning ? (
                    <>
                      <Text style={styles.resultLabel}>visibilityWarning</Text>
                      <Text style={styles.resultValue}>
                        {lastResult.visibilityWarning}
                      </Text>
                    </>
                  ) : null}
                </View>
              </Stack>
            </SectionCard>

            <SectionCard title={appI18n.windowCaptureLab.sections.notesTitle}>
              <Stack>
                <MutedText>
                  {appI18n.windowCaptureLab.notes.foregroundOnly}
                </MutedText>
                <MutedText>
                  {appI18n.windowCaptureLab.notes.selectorCombinator}
                </MutedText>
                <MutedText>
                  {appI18n.windowCaptureLab.notes.backendAuto}
                </MutedText>
                <MutedText>
                  {appI18n.windowCaptureLab.notes.cropSemantics}
                </MutedText>
                <MutedText>
                  {appI18n.windowCaptureLab.notes.outputLocation}
                </MutedText>
              </Stack>
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
    gap: 10,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorField: {
    minWidth: 220,
    flexGrow: 1,
    gap: 6,
    backgroundColor: palette.canvas,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorLabel: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  selectorInput: {
    color: palette.ink,
    minHeight: 40,
    borderRadius: appRadius.compact,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.panel,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...appTypography.body,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusBlock: {
    gap: 6,
    backgroundColor: palette.canvas,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  matchList: {
    gap: 10,
  },
  matchCard: {
    gap: 6,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.canvas,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  matchCardPinned: {
    borderColor: palette.accent,
    backgroundColor: palette.panel,
  },
  matchCardPressed: {
    borderColor: palette.borderStrong,
  },
  matchCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  matchCardTitle: {
    flex: 1,
    minWidth: 180,
    color: palette.ink,
    ...appTypography.bodyStrong,
  },
  matchBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultShell: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: appRadius.panel,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.canvas,
    padding: appSpacing.md,
  },
  preview: {
    width: '100%' as const,
    height: 320,
    borderRadius: appRadius.panel,
  },
  resultLabel: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  resultValue: {
    color: palette.ink,
    ...appTypography.body,
  },
  });
}
