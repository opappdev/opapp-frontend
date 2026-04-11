import React, {useEffect, useMemo, useState} from 'react';
import {StatusBar, StyleSheet, Text, View, useColorScheme} from 'react-native';
import type {SurfaceLaunchProps} from '@opapp/contracts-windowing';
import {
  describeSurfaceSession,
  registerSurfaceRegistry,
} from '@opapp/framework-surfaces';
import {
  CurrentWindowProvider,
  openSurface,
  useManagedSurfaceWindowSession,
  useWindowPreferences,
} from '@opapp/framework-windowing';
import {
  getDiagnosticsLogPath,
  installGlobalDiagnostics,
  logDiagnostic,
  logException,
} from '@opapp/framework-diagnostics';
import {
  SurfaceSessionChrome,
  ThemeProvider,
  DensityPreferenceProvider,
  useTheme,
  useDensityPreference,
  appPalette,
  type AppColorScheme,
} from '@opapp/ui-native-primitives';
import {appI18n} from '@opapp/framework-i18n';
import type {CompanionBundleConfig} from './bundle-config';
import {
  companionBundleIds,
  isCompanionSurfaceRequestAlreadyActive,
  resolveCompanionRestoredSessionAutoOpen,
  resolveCompanionStartupTargetAutoOpen,
  shouldCompanionStartupTargetWaitForBundleReload,
} from './companion-runtime';
import {useCompanionStartupTarget} from './useCompanionStartupTarget';

function useResolvedColorScheme(): AppColorScheme {
  const rnScheme = useColorScheme();
  return rnScheme === 'dark' ? 'dark' : 'light';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function resolveBootstrapSurfaceId(
  bundleConfig: CompanionBundleConfig,
  launchProps: SurfaceLaunchProps,
) {
  if (typeof launchProps.initialSessionPayload === 'string') {
    try {
      const parsedPayload = JSON.parse(launchProps.initialSessionPayload) as unknown;
      if (isRecord(parsedPayload) && Array.isArray(parsedPayload.tabs)) {
        const requestedActiveTabId =
          typeof parsedPayload.activeTabId === 'string'
            ? parsedPayload.activeTabId
            : undefined;
        const activeTab =
          parsedPayload.tabs.find(tab => {
            if (!isRecord(tab) || typeof tab.surfaceId !== 'string') {
              return false;
            }

            if (
              typeof requestedActiveTabId === 'string' &&
              typeof tab.tabId === 'string'
            ) {
              return tab.tabId === requestedActiveTabId;
            }

            return true;
          }) ?? null;

        if (
          isRecord(activeTab) &&
          typeof activeTab.surfaceId === 'string' &&
          bundleConfig.surfaceIds.includes(activeTab.surfaceId) &&
          (activeTab.bundleId === undefined || activeTab.bundleId === bundleConfig.bundleId)
        ) {
          return activeTab.surfaceId;
        }
      }
    } catch (error) {
      console.warn('Failed to resolve bootstrap surface from initial session', error);
    }
  }

  if (
    typeof launchProps.surfaceId === 'string' &&
    bundleConfig.surfaceIds.includes(launchProps.surfaceId)
  ) {
    return launchProps.surfaceId;
  }

  return bundleConfig.defaultSurfaceId;
}

type RootState = {
  error: Error | null;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootState> {
  state: RootState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RootState {
    return {error};
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logException('companion.render-fallback', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorEyebrow}>{appI18n.app.runtimeFallbackEyebrow}</Text>
        <Text style={styles.errorTitle}>{appI18n.app.runtimeFallbackTitle}</Text>
        <Text style={styles.errorBody}>
          {appI18n.app.runtimeFallbackPrefix}
          {this.state.error.message}
        </Text>
      </View>
    );
  }
}

export function createCompanionApp(bundleConfig: CompanionBundleConfig) {
  registerSurfaceRegistry(bundleConfig.surfaceRegistry);

  function RootContent(props: SurfaceLaunchProps) {
    const theme = useTheme();
    const launchProps = useMemo(
      () => ({
        ...props,
        surfaceId: props.surfaceId ?? bundleConfig.defaultSurfaceId,
        bundleId: props.bundleId ?? bundleConfig.bundleId,
      }),
      [props],
    );
    const {
      resolvedSession,
      activeTab,
      windowPolicy,
      hydratedStoredSession,
      initialAutoOpenRequest,
      consumeInitialAutoOpenRequest,
      selectTab,
      closeTab,
    } = useManagedSurfaceWindowSession(launchProps);
    const launchConfigAutoOpenRequested = useMemo(() => {
      if (!isRecord(launchProps.initialProps)) {
        return false;
      }

      return typeof launchProps.initialProps.autoOpenSurfaceId === 'string';
    }, [launchProps.initialProps]);
    const skipStartupAutoOpenRequested = useMemo(() => {
      if (!isRecord(activeTab.initialProps)) {
        return false;
      }

      return activeTab.initialProps.skipStartupAutoOpen === true;
    }, [activeTab.initialProps]);
    const {
      startupTarget: resolvedStartupTarget,
      loading: startupTargetLoading,
    } = useCompanionStartupTarget();
    const startupTargetLoaded = !startupTargetLoading;
    const activeSurfacePolicy = activeTab.policy;
    const startupTargetAutoOpenEnabled =
      bundleConfig.bundleId === companionBundleIds.main &&
      resolvedSession.windowId === 'window.main' &&
      !launchConfigAutoOpenRequested &&
      !skipStartupAutoOpenRequested;
    const startupTargetDecision = useMemo(
      () =>
        resolveCompanionStartupTargetAutoOpen({
          runtimeBundleId: bundleConfig.bundleId,
          windowId: resolvedSession.windowId,
          activeSurfaceId: activeTab.surfaceId,
          activeBundleId: activeTab.bundleId,
          startupTarget: resolvedStartupTarget,
          launchConfigAutoOpenRequested,
        }),
      [
        activeTab.bundleId,
        activeTab.surfaceId,
        bundleConfig.bundleId,
        launchConfigAutoOpenRequested,
        resolvedSession.windowId,
        resolvedStartupTarget,
      ],
    );
    const restoredSessionDecision = useMemo(
      () =>
        resolveCompanionRestoredSessionAutoOpen({
          runtimeBundleId: bundleConfig.bundleId,
          windowId: resolvedSession.windowId,
          activeSurfaceId: activeTab.surfaceId,
          activeBundleId: activeTab.bundleId,
          activePolicy: activeSurfacePolicy,
          startupTarget: resolvedStartupTarget,
          launchConfigAutoOpenRequested,
        }),
      [
        activeSurfacePolicy,
        activeTab.bundleId,
        activeTab.surfaceId,
        bundleConfig.bundleId,
        launchConfigAutoOpenRequested,
        resolvedSession.windowId,
        resolvedStartupTarget,
      ],
    );
    const [startupTargetPhase, setStartupTargetPhase] = useState<
      'booting' | 'pending' | 'ready'
    >(() => (startupTargetAutoOpenEnabled ? 'booting' : 'ready'));
    const fallbackSurfaceId =
      bundleConfig.surfaceRegistry.get(activeTab.surfaceId) === undefined
        ? bundleConfig.defaultSurfaceId
        : activeTab.surfaceId;
    const surface = bundleConfig.surfaceRegistry.resolve({
      windowId: resolvedSession.windowId,
      surfaceId: fallbackSurfaceId,
      windowPolicy: activeSurfacePolicy,
      initialProps: activeTab.initialProps,
      bundleId: activeTab.bundleId ?? bundleConfig.bundleId,
    });
    const SurfaceComponent = surface.Component as React.ComponentType<
      Record<string, unknown>
    >;
    const sessionSummary = useMemo(
      () => describeSurfaceSession(resolvedSession),
      [resolvedSession],
    );
    const shouldHoldInitialRender =
      startupTargetAutoOpenEnabled && startupTargetPhase !== 'ready';

    useEffect(() => {
      setStartupTargetPhase(startupTargetAutoOpenEnabled ? 'booting' : 'ready');
    }, [startupTargetAutoOpenEnabled]);

    useEffect(() => {
      if (shouldHoldInitialRender) {
        return;
      }

      console.log(
        `[frontend-companion] mounted bundle=${bundleConfig.bundleId} window=${resolvedSession.windowId} surface=${surface.surfaceId} policy=${activeSurfacePolicy}`,
      );
    }, [
      activeSurfacePolicy,
      resolvedSession.windowId,
      surface.surfaceId,
      shouldHoldInitialRender,
    ]);

    useEffect(() => {
      if (shouldHoldInitialRender) {
        return;
      }

      console.log(
        `[frontend-companion] session bundle=${bundleConfig.bundleId} window=${resolvedSession.windowId} tabs=${resolvedSession.tabs.length} active=${resolvedSession.activeTabId} entries=${sessionSummary}`,
      );
    }, [
      resolvedSession.activeTabId,
      resolvedSession.tabs.length,
      resolvedSession.windowId,
      sessionSummary,
      shouldHoldInitialRender,
    ]);

    useEffect(() => {
      if (shouldHoldInitialRender || activeTab.surfaceId === fallbackSurfaceId) {
        return;
      }

      console.log(
        `[frontend-companion] surface-fallback bundle=${bundleConfig.bundleId} requested=${activeTab.surfaceId} rendered=${fallbackSurfaceId}`,
      );
    }, [activeTab.surfaceId, fallbackSurfaceId, shouldHoldInitialRender]);

    useEffect(() => {
      if (!hydratedStoredSession || !initialAutoOpenRequest) {
        return;
      }

      if (
        isCompanionSurfaceRequestAlreadyActive({
          runtimeBundleId: bundleConfig.bundleId,
          activeSurfaceId: activeTab.surfaceId,
          activeBundleId: activeTab.bundleId,
          requestSurfaceId: initialAutoOpenRequest.surfaceId,
          requestBundleId: initialAutoOpenRequest.bundleId,
          requestPresentation: initialAutoOpenRequest.presentation,
        })
      ) {
        consumeInitialAutoOpenRequest();
        console.log(
          `[frontend-companion] auto-open-skipped bundle=${bundleConfig.bundleId} window=${resolvedSession.windowId} surface=${initialAutoOpenRequest.surfaceId} reason=already-active`,
        );
        return;
      }

      consumeInitialAutoOpenRequest();
      console.log(
        `[frontend-companion] auto-open bundle=${bundleConfig.bundleId} window=${resolvedSession.windowId} surface=${initialAutoOpenRequest.surfaceId} presentation=${initialAutoOpenRequest.presentation ?? 'auto'} targetBundle=${initialAutoOpenRequest.bundleId ?? bundleConfig.bundleId}`,
      );
      void openSurface(initialAutoOpenRequest).catch(error => {
        logException('companion.auto-open.failed', error, {
          bundleId: bundleConfig.bundleId,
          windowId: resolvedSession.windowId,
          surfaceId: initialAutoOpenRequest.surfaceId,
          presentation: initialAutoOpenRequest.presentation ?? 'auto',
          targetBundle: initialAutoOpenRequest.bundleId ?? bundleConfig.bundleId,
        });
      });
    }, [
      consumeInitialAutoOpenRequest,
      hydratedStoredSession,
      initialAutoOpenRequest,
      activeTab.bundleId,
      activeTab.surfaceId,
      resolvedSession.windowId,
    ]);

    useEffect(() => {
      if (!startupTargetAutoOpenEnabled || startupTargetPhase !== 'booting') {
        return;
      }

      if (!startupTargetLoaded) {
        return;
      }

      if (startupTargetDecision.kind === 'skip') {
        if (startupTargetDecision.reason === 'already-active') {
          console.log(
            `[frontend-companion] startup-target-skipped bundle=${bundleConfig.bundleId} window=${resolvedSession.windowId} surface=${activeTab.surfaceId} reason=already-active`,
          );
        }

        if (restoredSessionDecision.kind === 'open') {
          setStartupTargetPhase('pending');
          const waitsForCurrentWindowBundleReload =
            shouldCompanionStartupTargetWaitForBundleReload({
              runtimeBundleId: bundleConfig.bundleId,
              targetBundleId: restoredSessionDecision.request.bundleId,
              presentation: restoredSessionDecision.request.presentation,
            });
          console.log(
            `[frontend-companion] restored-session-auto-open bundle=${bundleConfig.bundleId} window=${resolvedSession.windowId} surface=${restoredSessionDecision.request.surfaceId} presentation=${restoredSessionDecision.request.presentation} targetBundle=${restoredSessionDecision.request.bundleId ?? bundleConfig.bundleId}`,
          );
          void openSurface(restoredSessionDecision.request)
            .then(() => {
              if (!waitsForCurrentWindowBundleReload) {
                setStartupTargetPhase('ready');
              }
            })
            .catch(error => {
              logException('companion.restored-session.failed', error, {
                bundleId: bundleConfig.bundleId,
                windowId: resolvedSession.windowId,
                surfaceId: restoredSessionDecision.request.surfaceId,
                presentation: restoredSessionDecision.request.presentation,
                targetBundle:
                  restoredSessionDecision.request.bundleId ?? bundleConfig.bundleId,
              });
              setStartupTargetPhase('ready');
            });
          return;
        }

        setStartupTargetPhase('ready');
        return;
      }

      setStartupTargetPhase('pending');
      const waitsForCurrentWindowBundleReload =
        shouldCompanionStartupTargetWaitForBundleReload({
          runtimeBundleId: bundleConfig.bundleId,
          targetBundleId: startupTargetDecision.request.bundleId,
          presentation: startupTargetDecision.request.presentation,
        });
      console.log(
        `[frontend-companion] startup-target-auto-open bundle=${bundleConfig.bundleId} window=${resolvedSession.windowId} surface=${startupTargetDecision.request.surfaceId} presentation=${startupTargetDecision.request.presentation} targetBundle=${startupTargetDecision.request.bundleId ?? bundleConfig.bundleId}`,
      );
      void openSurface(startupTargetDecision.request)
        .then(() => {
          if (!waitsForCurrentWindowBundleReload) {
            setStartupTargetPhase('ready');
          }
        })
        .catch(error => {
          logException('companion.startup-target.failed', error, {
            bundleId: bundleConfig.bundleId,
            windowId: resolvedSession.windowId,
            surfaceId: startupTargetDecision.request.surfaceId,
            presentation: startupTargetDecision.request.presentation,
            targetBundle:
              startupTargetDecision.request.bundleId ?? bundleConfig.bundleId,
          });
          setStartupTargetPhase('ready');
        });
    }, [
      activeTab.surfaceId,
      bundleConfig.bundleId,
      resolvedSession.windowId,
      restoredSessionDecision,
      startupTargetAutoOpenEnabled,
      startupTargetDecision,
      startupTargetLoaded,
      startupTargetPhase,
    ]);

    if (shouldHoldInitialRender) {
      return (
        <View style={[styles.container, {backgroundColor: theme.palette.canvas}]}>
          <StatusBar barStyle={theme.colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        </View>
      );
    }

    console.log(
      `[frontend-companion] render bundle=${bundleConfig.bundleId} window=${resolvedSession.windowId} surface=${surface.surfaceId} policy=${activeSurfacePolicy}`,
    );

    return (
      <View style={[styles.container, {backgroundColor: theme.palette.canvas}]}>
        <StatusBar barStyle={theme.colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <CurrentWindowProvider
          windowId={resolvedSession.windowId}
          windowPolicy={windowPolicy}>
          <SurfaceSessionChrome
            session={resolvedSession}
            onSelectTab={selectTab}
            onCloseTab={closeTab}
          />
          <SurfaceComponent {...(activeTab.initialProps ?? {})} />
        </CurrentWindowProvider>
      </View>
    );
  }

  function DensityAwareTheme({
    colorScheme,
    children,
  }: React.PropsWithChildren<{ colorScheme: AppColorScheme }>) {
    const {density} = useDensityPreference();
    const {preferences} = useWindowPreferences();
    return (
      <ThemeProvider
        colorScheme={colorScheme}
        appearancePreset={preferences.appearancePreset}
        density={density}>
        {children}
      </ThemeProvider>
    );
  }

  return function CompanionApp(props: SurfaceLaunchProps) {
    const resolvedColorScheme = useResolvedColorScheme();
    const launchProps = useMemo(
      () => ({
        ...props,
        surfaceId: props.surfaceId ?? bundleConfig.defaultSurfaceId,
        bundleId: props.bundleId ?? bundleConfig.bundleId,
      }),
      [props],
    );
    const bootstrapSurfaceId = useMemo(
      () => resolveBootstrapSurfaceId(bundleConfig, launchProps),
      [launchProps],
    );

    useEffect(() => {
      installGlobalDiagnostics();
      logDiagnostic('info', 'companion.bootstrap', {
        bundleId: bundleConfig.bundleId,
        surfaceId: bootstrapSurfaceId,
        windowId: launchProps.windowId ?? 'window.main',
      });

      void getDiagnosticsLogPath().then(logPath => {
        if (logPath) {
          logDiagnostic('info', 'diagnostics.log-path', {logPath});
        }
      });
    }, [bootstrapSurfaceId, launchProps.windowId]);

    return (
      <DensityPreferenceProvider>
        <DensityAwareTheme colorScheme={resolvedColorScheme}>
          <RootErrorBoundary>
            <RootContent {...launchProps} />
          </RootErrorBoundary>
        </DensityAwareTheme>
      </DensityPreferenceProvider>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appPalette.canvas,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: appPalette.canvas,
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12,
    justifyContent: 'center',
  },
  errorEyebrow: {
    color: appPalette.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  errorTitle: {
    color: appPalette.ink,
    fontSize: 28,
    fontWeight: '800',
  },
  errorBody: {
    color: appPalette.inkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
