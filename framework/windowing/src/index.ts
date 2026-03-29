import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {NativeModules} from 'react-native';
import {
  normalizeWindowPolicyId,
  type OpenSurfaceRequest,
  OpenSurfaceResult,
  ResolvedSurfacePresentation,
  SettingsSurfacePresentation,
  StartupTargetPreference,
  SurfaceId,
  SurfaceLaunchProps,
  SurfacePresentation,
  SurfacePresentationPreferenceId,
  WindowPolicyId,
  WindowPreferences,
  WindowSessionDescriptor,
  WindowSizeMode,
} from '@opapp/contracts-windowing';
import {
  applyOpenSurfaceToSingleSurfaceSession,
  closeSessionTab,
  createSingleSurfaceSession,
  getActiveSessionTab,
  getRegisteredSurfaceDescriptor,
  resolveSurfaceSession,
  resolveSurfaceWindowPolicy,
  setActiveSessionTab,
} from '@opapp/framework-surfaces';
import {
  defaultWindowPreferences,
  normalizeStartupTargetPreference,
  normalizeWindowPreferences,
  parseStartupTargetPreferencePayload,
  parseWindowPreferencesPayload,
  parseWindowSessionPayload,
  serializeStartupTargetPreference,
  serializeWindowSessionPayload,
} from './model';

type NativeWindowManager = {
  openWindow(surfaceId: string, windowPolicy: string): Promise<string>;
  focusWindow(windowId: string): Promise<void>;
  closeWindow(windowId: string): Promise<void>;
  canOpenBundle(bundleId: string): Promise<boolean>;
  getOtaRemoteUrl(): Promise<string>;
  getStagedBundleIds(): Promise<string>;
  getCurrentWindow(): Promise<string>;
  getWindowSession(windowId: string): Promise<string>;
  getWindowPreferences(): Promise<string>;
  setWindowPreferences(
    mainWindowMode: string,
    settingsWindowMode: string,
    settingsPresentation: string,
    currentWindowId?: string | null,
  ): Promise<string>;
  getStartupTargetPreference(): Promise<string>;
  setStartupTargetPreference(
    surfaceId: string,
    bundleId: string,
    windowPolicy: string,
    presentation: string,
  ): Promise<string>;
  clearStartupTargetPreference(): Promise<void>;
  switchCurrentWindowBundle(
    windowId: string,
    bundleId: string,
    sessionPayload: string,
  ): Promise<void>;
  getWindowSessionState(windowId: string): Promise<string>;
  setWindowSessionState(windowId: string, sessionPayload: string): Promise<void>;
};

type CurrentWindowDescriptor = {
  windowId: string;
  activeSurfaceId: SurfaceId;
  windowPolicy: WindowPolicyId | null;
};

type CurrentWindowController = {
  openSurface(request: OpenSurfaceRequest): boolean | Promise<boolean>;
  getCurrentWindow(): CurrentWindowDescriptor | null;
  getWindowSession(windowId?: string): WindowSessionDescriptor | null;
};

export type OpenWindowRequest = {
  surfaceId: SurfaceId;
  policy?: WindowPolicyId;
};

type SurfaceWindowHostState = {
  session: WindowSessionDescriptor;
  windowPolicy: WindowPolicyId;
};

export type ManagedSurfaceWindowSession = {
  session: WindowSessionDescriptor;
  resolvedSession: ReturnType<typeof resolveSurfaceSession>;
  activeTab: ReturnType<typeof resolveSurfaceSession>['activeTab'];
  windowId: string;
  windowPolicy: WindowPolicyId;
  hydratedStoredSession: boolean;
  initialAutoOpenRequest: OpenSurfaceRequest | null;
  consumeInitialAutoOpenRequest: () => void;
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
};

type CurrentWindowContextValue = {
  windowId: string | null;
  windowPolicy: WindowPolicyId | null;
};

const CurrentWindowContext = React.createContext<CurrentWindowContextValue>({
  windowId: null,
  windowPolicy: null,
});
const currentWindowControllers = new Map<string, CurrentWindowController>();
const windowPreferencesListeners = new Set<(preferences: WindowPreferences) => void>();
const startupTargetPreferenceListeners = new Set<
  (preference: StartupTargetPreference | null) => void
>();

let cachedWindowPreferences: WindowPreferences | null = null;
let windowPreferencesLoadPromise: Promise<WindowPreferences> | null = null;
let cachedStartupTargetPreference: StartupTargetPreference | null | undefined;
let startupTargetPreferenceLoadPromise: Promise<StartupTargetPreference | null> | null =
  null;

function getNativeWindowManager(): NativeWindowManager | null {
  const nativeModule = NativeModules.OpappWindowManager as
    | NativeWindowManager
    | undefined;

  return nativeModule ?? null;
}

function broadcastWindowPreferences(preferences: WindowPreferences) {
  cachedWindowPreferences = preferences;

  for (const listener of windowPreferencesListeners) {
    listener(preferences);
  }
}

function broadcastStartupTargetPreference(
  preference: StartupTargetPreference | null,
) {
  cachedStartupTargetPreference = preference;

  for (const listener of startupTargetPreferenceListeners) {
    listener(preference);
  }
}

async function loadWindowPreferencesFromNative() {
  const nativeWindowManager = getNativeWindowManager();

  if (!nativeWindowManager?.getWindowPreferences) {
    return defaultWindowPreferences;
  }

  const payload = await nativeWindowManager.getWindowPreferences();
  return parseWindowPreferencesPayload(payload);
}

async function loadStartupTargetPreferenceFromNative() {
  const nativeWindowManager = getNativeWindowManager();

  if (!nativeWindowManager?.getStartupTargetPreference) {
    return null;
  }

  const payload = await nativeWindowManager.getStartupTargetPreference();
  return parseStartupTargetPreferencePayload(payload);
}

async function loadStoredWindowSessionState(windowId: string) {
  const nativeWindowManager = getNativeWindowManager();

  if (!nativeWindowManager?.getWindowSessionState) {
    return null;
  }

  const payload = await nativeWindowManager.getWindowSessionState(windowId);
  return parseWindowSessionPayload(payload, windowId);
}

async function persistWindowSessionState(session: WindowSessionDescriptor) {
  const nativeWindowManager = getNativeWindowManager();

  if (!nativeWindowManager?.setWindowSessionState) {
    return;
  }

  await nativeWindowManager.setWindowSessionState(
    session.windowId,
    serializeWindowSessionPayload(session),
  );
}

function getRegisteredCurrentWindowController(
  request: OpenSurfaceRequest,
): CurrentWindowController | null {
  if (request.targetWindowId) {
    return currentWindowControllers.get(request.targetWindowId) ?? null;
  }

  if (currentWindowControllers.size === 1) {
    return currentWindowControllers.values().next().value ?? null;
  }

  return null;
}

function resolvePresentationPreference(
  preferenceId: SurfacePresentationPreferenceId | undefined,
  preferences: WindowPreferences,
): SurfacePresentation | undefined {
  if (preferenceId === 'settings-surface') {
    return preferences.settingsPresentation;
  }

  return undefined;
}

function readInitialString(
  initialProps: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = initialProps?.[key];
  return typeof value === 'string' ? value : undefined;
}

function readInitialObject(
  initialProps: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | undefined {
  const value = initialProps?.[key];

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

function parseStringArrayPayload(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map(entry => entry.trim())
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}

function createInitialAutoOpenRequest(
  initialProps: Record<string, unknown> | undefined,
): OpenSurfaceRequest | null {
  const surfaceId = readInitialString(initialProps, 'autoOpenSurfaceId');

  if (!surfaceId) {
    return null;
  }

  const requestedPolicy = readInitialString(initialProps, 'autoOpenWindowPolicy');
  const policy = requestedPolicy ? normalizeWindowPolicyId(requestedPolicy) : undefined;
  const presentation = readInitialString(
    initialProps,
    'autoOpenPresentation',
  ) as SurfacePresentation | undefined;
  const autoOpenInitialProps = readInitialObject(
    initialProps,
    'autoOpenInitialProps',
  );
  const bundleId = readInitialString(initialProps, 'autoOpenBundleId');

  return {
    surfaceId,
    policy,
    bundleId,
    presentation,
    initialProps: autoOpenInitialProps,
  };
}

const launchOnlyInitialPropKeys = new Set([
  'autoOpenSurfaceId',
  'autoOpenBundleId',
  'autoOpenWindowPolicy',
  'autoOpenPresentation',
  'autoOpenInitialProps',
]);

function stripLaunchOnlyInitialProps(
  initialProps: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!initialProps) {
    return undefined;
  }

  const nextInitialProps = {...initialProps};

  for (const key of launchOnlyInitialPropKeys) {
    delete nextInitialProps[key];
  }

  return Object.keys(nextInitialProps).length > 0 ? nextInitialProps : undefined;
}

function createInitialSurfaceWindowHostState(
  props: SurfaceLaunchProps,
): SurfaceWindowHostState {
  const initialSurfaceId = props.surfaceId ?? 'companion.main';
  const initialWindowPolicy = normalizeWindowPolicyId(props.windowPolicy);
  const initialWindowId = props.windowId ?? 'window.main';
  const initialSession = parseWindowSessionPayload(
    props.initialSessionPayload,
    initialWindowId,
  );

  return {
    session:
      initialSession ??
      createSingleSurfaceSession({
        ...props,
        windowId: initialWindowId,
        surfaceId: initialSurfaceId,
        initialProps: stripLaunchOnlyInitialProps(props.initialProps),
      }),
    windowPolicy: initialWindowPolicy,
  };
}

async function normalizeOpenSurfaceRequest(
  request: OpenSurfaceRequest,
): Promise<OpenSurfaceRequest> {
  const surfaceDescriptor = getRegisteredSurfaceDescriptor(request.surfaceId);
  const policy = resolveSurfaceWindowPolicy(request.surfaceId, request.policy);
  const requestedPresentation = request.presentation;

  if (
    requestedPresentation !== undefined &&
    requestedPresentation !== 'auto'
  ) {
    return {
      ...request,
      policy,
    };
  }

  if (surfaceDescriptor?.presentationPreference) {
    const preferences = await getWindowPreferences();
    const preferredPresentation = resolvePresentationPreference(
      surfaceDescriptor.presentationPreference,
      preferences,
    );

    if (preferredPresentation) {
      return {
        ...request,
        policy,
        presentation: preferredPresentation,
      };
    }
  }

  return {
    ...request,
    policy,
    presentation: surfaceDescriptor?.defaultPresentation ?? requestedPresentation,
  };
}

export function CurrentWindowProvider({
  windowId,
  windowPolicy = null,
  children,
}: PropsWithChildren<{windowId: string; windowPolicy?: WindowPolicyId | null}>) {
  return React.createElement(CurrentWindowContext.Provider, {
    value: {
      windowId,
      windowPolicy,
    },
    children,
  });
}

export function useCurrentWindowId() {
  return useContext(CurrentWindowContext).windowId;
}

export function useCurrentWindowPolicy() {
  return useContext(CurrentWindowContext).windowPolicy;
}

export function useManagedSurfaceWindowSession(
  props: SurfaceLaunchProps,
): ManagedSurfaceWindowSession {
  const [hostState, setHostState] = useState(() =>
    createInitialSurfaceWindowHostState(props),
  );
  const [hydratedStoredSession, setHydratedStoredSession] = useState(false);
  const [initialAutoOpenRequest, setInitialAutoOpenRequest] = useState<
    OpenSurfaceRequest | null
  >(() => createInitialAutoOpenRequest(props.initialProps));

  const resolvedSession = useMemo(
    () => resolveSurfaceSession(hostState.session, hostState.windowPolicy),
    [hostState.session, hostState.windowPolicy],
  );
  const activeTab = resolvedSession.activeTab;

  useEffect(() => {
    let cancelled = false;
    setHydratedStoredSession(false);

    void loadStoredWindowSessionState(hostState.session.windowId)
      .then(storedSession => {
        if (cancelled || !storedSession) {
          return;
        }

        setHostState(current =>
          current.session.windowId === storedSession.windowId
            ? {
                ...current,
                session: storedSession,
              }
            : current,
        );
      })
      .catch(error => {
        console.warn('Failed to restore stored window session', error);
      })
      .finally(() => {
        if (!cancelled) {
          setHydratedStoredSession(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hostState.session.windowId]);

  useEffect(() => {
    if (!hydratedStoredSession) {
      return;
    }

    void persistWindowSessionState(hostState.session).catch(error => {
      console.warn('Failed to persist window session', error);
    });
  }, [hydratedStoredSession, hostState.session]);

  useEffect(() => {
    const unregister = registerCurrentWindowController(resolvedSession.windowId, {
      async openSurface(request: OpenSurfaceRequest) {
        if (
          request.targetWindowId &&
          request.targetWindowId !== resolvedSession.windowId
        ) {
          return false;
        }

        if (
          request.presentation === 'new-window' ||
          request.presentation === 'auto'
        ) {
          return false;
        }

        setHostState(current => ({
          session: applyOpenSurfaceToSingleSurfaceSession(
            current.session,
            request,
          ),
          windowPolicy: current.windowPolicy,
        }));

        return true;
      },
      getCurrentWindow() {
        return {
          windowId: resolvedSession.windowId,
          activeSurfaceId: resolvedSession.activeTab.surfaceId,
          windowPolicy: hostState.windowPolicy,
        };
      },
      getWindowSession(windowId) {
        if (windowId && windowId !== resolvedSession.windowId) {
          return null;
        }

        return hostState.session;
      },
    });

    return unregister;
  }, [hostState.session, resolvedSession.activeTab.surfaceId, resolvedSession.windowId]);

  const consumeInitialAutoOpenRequest = useCallback(() => {
    setInitialAutoOpenRequest(null);
  }, []);

  const selectTab = useCallback((tabId: string) => {
    setHostState(current => ({
      ...current,
      session: setActiveSessionTab(current.session, tabId),
    }));
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setHostState(current => ({
      ...current,
      session: closeSessionTab(current.session, tabId),
    }));
  }, []);

  return useMemo(
    () => ({
      session: hostState.session,
      resolvedSession,
      activeTab,
      windowId: resolvedSession.windowId,
      windowPolicy: hostState.windowPolicy,
      hydratedStoredSession,
      initialAutoOpenRequest,
      consumeInitialAutoOpenRequest,
      selectTab,
      closeTab,
    }),
    [
      activeTab,
      closeTab,
      consumeInitialAutoOpenRequest,
      hostState.session,
      hostState.windowPolicy,
      hydratedStoredSession,
      initialAutoOpenRequest,
      resolvedSession,
      selectTab,
    ],
  );
}

export function useOpenSurface() {
  const currentWindowId = useCurrentWindowId();

  return useCallback(
    (request: OpenSurfaceRequest) => {
      if (currentWindowId && !request.targetWindowId) {
        return openSurface({...request, targetWindowId: currentWindowId});
      }

      return openSurface(request);
    },
    [currentWindowId],
  );
}

export function useWindowPreferences() {
  const currentWindowId = useCurrentWindowId();
  const [preferences, setPreferences] = useState<WindowPreferences>(
    cachedWindowPreferences ?? defaultWindowPreferences,
  );
  const [loading, setLoading] = useState(cachedWindowPreferences === null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    windowPreferencesListeners.add(setPreferences);

    return () => {
      windowPreferencesListeners.delete(setPreferences);
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextPreferences = await getWindowPreferences({forceRefresh: true});
      setPreferences(nextPreferences);
      return nextPreferences;
    } catch (reloadError) {
      const message =
        reloadError instanceof Error
          ? reloadError.message
          : 'Failed to load window preferences.';
      setError(message);
      throw reloadError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (nextPreferences: WindowPreferences) => {
      setSaving(true);
      setError(null);

      try {
        const savedPreferences = await setWindowPreferences(nextPreferences, {
          currentWindowId,
        });
        setPreferences(savedPreferences);
        return savedPreferences;
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : 'Failed to save window preferences.';
        setError(message);
        throw saveError;
      } finally {
        setSaving(false);
      }
    },
    [currentWindowId],
  );

  return useMemo(
    () => ({
      preferences,
      loading,
      saving,
      error,
      reload,
      save,
      defaults: defaultWindowPreferences,
    }),
    [error, loading, preferences, reload, save, saving],
  );
}

export function useStartupTargetPreference() {
  const [startupTarget, setStartupTarget] =
    useState<StartupTargetPreference | null>(
      cachedStartupTargetPreference ?? null,
    );
  const [loading, setLoading] = useState(
    cachedStartupTargetPreference === undefined,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startupTargetPreferenceListeners.add(setStartupTarget);

    return () => {
      startupTargetPreferenceListeners.delete(setStartupTarget);
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextStartupTarget = await getStartupTargetPreference({
        forceRefresh: true,
      });
      setStartupTarget(nextStartupTarget);
      return nextStartupTarget;
    } catch (reloadError) {
      const message =
        reloadError instanceof Error
          ? reloadError.message
          : 'Failed to load startup target preference.';
      setError(message);
      throw reloadError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (nextStartupTarget: StartupTargetPreference) => {
    setSaving(true);
    setError(null);

    try {
      const savedStartupTarget = await setStartupTargetPreference(nextStartupTarget);
      setStartupTarget(savedStartupTarget);
      return savedStartupTarget;
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save startup target preference.';
      setError(message);
      throw saveError;
    } finally {
      setSaving(false);
    }
  }, []);

  const clear = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      await clearStartupTargetPreference();
      setStartupTarget(null);
      return null;
    } catch (clearError) {
      const message =
        clearError instanceof Error
          ? clearError.message
          : 'Failed to clear startup target preference.';
      setError(message);
      throw clearError;
    } finally {
      setSaving(false);
    }
  }, []);

  return useMemo(
    () => ({
      startupTarget,
      loading,
      saving,
      error,
      reload,
      save,
      clear,
    }),
    [clear, error, loading, reload, save, saving, startupTarget],
  );
}

export function registerCurrentWindowController(
  windowId: string,
  controller: CurrentWindowController,
) {
  currentWindowControllers.set(windowId, controller);

  return () => {
    if (currentWindowControllers.get(windowId) === controller) {
      currentWindowControllers.delete(windowId);
    }
  };
}

export function canOpenNativeWindows() {
  return getNativeWindowManager() !== null;
}

export async function canOpenBundleTarget(bundleId: string) {
  const normalizedBundleId = bundleId.trim();
  if (!normalizedBundleId) {
    return true;
  }

  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.canOpenBundle) {
    return true;
  }

  try {
    return Boolean(await nativeWindowManager.canOpenBundle(normalizedBundleId));
  } catch (error) {
    console.warn('Failed to query bundle availability', error);
    return true;
  }
}

export async function getOtaRemoteUrl() {
  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.getOtaRemoteUrl) {
    return null;
  }

  try {
    const remoteUrl = (await nativeWindowManager.getOtaRemoteUrl()).trim();
    return remoteUrl || null;
  } catch (error) {
    console.warn('Failed to read OTA remote URL', error);
    return null;
  }
}

export async function getStagedBundleIds() {
  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.getStagedBundleIds) {
    return [];
  }

  try {
    return parseStringArrayPayload(await nativeWindowManager.getStagedBundleIds());
  } catch (error) {
    console.warn('Failed to read staged bundle IDs', error);
    return [];
  }
}

export async function getWindowPreferences({
  forceRefresh = false,
}: {forceRefresh?: boolean} = {}) {
  if (!forceRefresh && cachedWindowPreferences) {
    return cachedWindowPreferences;
  }

  if (!forceRefresh && windowPreferencesLoadPromise) {
    return windowPreferencesLoadPromise;
  }

  const loadPromise = loadWindowPreferencesFromNative()
    .then(preferences => {
      const normalized = normalizeWindowPreferences(preferences);
      broadcastWindowPreferences(normalized);
      return normalized;
    })
    .finally(() => {
      windowPreferencesLoadPromise = null;
    });

  windowPreferencesLoadPromise = loadPromise;
  return loadPromise;
}

export async function setWindowPreferences(
  preferences: WindowPreferences,
  options: {currentWindowId?: string | null} = {},
) {
  const normalized = normalizeWindowPreferences(preferences);
  const nativeWindowManager = getNativeWindowManager();

  if (!nativeWindowManager?.setWindowPreferences) {
    broadcastWindowPreferences(normalized);
    return normalized;
  }

  const payload = await nativeWindowManager.setWindowPreferences(
    normalized.mainWindowMode,
    normalized.settingsWindowMode,
    normalized.settingsPresentation,
    options.currentWindowId ?? '',
  );
  const savedPreferences = parseWindowPreferencesPayload(payload);
  broadcastWindowPreferences(savedPreferences);
  return savedPreferences;
}

export async function getStartupTargetPreference({
  forceRefresh = false,
}: {forceRefresh?: boolean} = {}) {
  if (!forceRefresh && cachedStartupTargetPreference !== undefined) {
    return cachedStartupTargetPreference;
  }

  if (!forceRefresh && startupTargetPreferenceLoadPromise) {
    return startupTargetPreferenceLoadPromise;
  }

  const loadPromise = loadStartupTargetPreferenceFromNative()
    .then(startupTargetPreference => {
      broadcastStartupTargetPreference(startupTargetPreference);
      return startupTargetPreference;
    })
    .finally(() => {
      startupTargetPreferenceLoadPromise = null;
    });

  startupTargetPreferenceLoadPromise = loadPromise;
  return loadPromise;
}

export async function setStartupTargetPreference(
  startupTargetPreference: StartupTargetPreference,
) {
  const normalized = normalizeStartupTargetPreference(startupTargetPreference);
  if (!normalized) {
    throw new Error('Invalid startup target preference.');
  }

  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.setStartupTargetPreference) {
    throw new Error(
      'Native window manager does not support startup target preferences.',
    );
  }

  const payload = await nativeWindowManager.setStartupTargetPreference(
    normalized.surfaceId,
    normalized.bundleId,
    normalized.policy,
    normalized.presentation,
  );
  const savedStartupTarget =
    parseStartupTargetPreferencePayload(payload) ??
    parseStartupTargetPreferencePayload(
      serializeStartupTargetPreference(normalized),
    ) ??
    normalized;
  broadcastStartupTargetPreference(savedStartupTarget);
  return savedStartupTarget;
}

export async function clearStartupTargetPreference() {
  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.clearStartupTargetPreference) {
    throw new Error(
      'Native window manager does not support clearing startup target preferences.',
    );
  }

  await nativeWindowManager.clearStartupTargetPreference();
  broadcastStartupTargetPreference(null);
  return null;
}

export function getCurrentWindow(windowId?: string) {
  if (windowId) {
    return currentWindowControllers.get(windowId)?.getCurrentWindow() ?? null;
  }

  if (currentWindowControllers.size === 1) {
    return currentWindowControllers.values().next().value?.getCurrentWindow() ?? null;
  }

  return null;
}

export function getWindowSession(windowId?: string) {
  if (windowId) {
    return currentWindowControllers.get(windowId)?.getWindowSession(windowId) ?? null;
  }

  if (currentWindowControllers.size === 1) {
    return currentWindowControllers.values().next().value?.getWindowSession() ?? null;
  }

  return null;
}

function buildOpenSurfaceResult(
  surfaceId: SurfaceId,
  presentation: ResolvedSurfacePresentation,
  windowId: string,
): OpenSurfaceResult {
  return {
    surfaceId,
    presentation,
    windowId,
  };
}

async function switchCurrentWindowBundle(
  nativeWindowManager: NativeWindowManager,
  normalizedRequest: OpenSurfaceRequest,
  currentWindowController: CurrentWindowController,
) {
  const currentWindow = currentWindowController.getCurrentWindow();
  const currentSession = currentWindowController.getWindowSession(
    normalizedRequest.targetWindowId,
  );

  if (!currentWindow || !currentSession || !normalizedRequest.bundleId) {
    return false;
  }

  const activeSessionTab = getActiveSessionTab(currentSession);
  const currentBundleId = activeSessionTab.bundleId ?? undefined;

  if (
    normalizedRequest.presentation !== 'current-window' ||
    currentBundleId === normalizedRequest.bundleId
  ) {
    return false;
  }

  const nextSession = createSingleSurfaceSession({
    windowId: currentWindow.windowId,
    surfaceId: normalizedRequest.surfaceId,
    windowPolicy: normalizedRequest.policy,
    initialProps: normalizedRequest.initialProps,
    bundleId: normalizedRequest.bundleId,
  });

  await nativeWindowManager.switchCurrentWindowBundle(
    currentWindow.windowId,
    normalizedRequest.bundleId,
    serializeWindowSessionPayload(nextSession),
  );

  return true;
}

export async function openSurface(request: OpenSurfaceRequest): Promise<OpenSurfaceResult> {
  const normalizedRequest = await normalizeOpenSurfaceRequest(request);
  const presentation = normalizedRequest.presentation ?? 'auto';
  const currentWindowController = getRegisteredCurrentWindowController(normalizedRequest);
  const nativeWindowManager = getNativeWindowManager();

  if (
    (presentation === 'current-window' || presentation === 'auto') &&
    currentWindowController &&
    nativeWindowManager?.switchCurrentWindowBundle
  ) {
    try {
      const switched = await switchCurrentWindowBundle(
        nativeWindowManager,
        {
          ...normalizedRequest,
          presentation:
            presentation === 'auto' ? 'current-window' : presentation,
        },
        currentWindowController,
      );

      if (switched) {
        const currentWindow = currentWindowController.getCurrentWindow();
        if (!currentWindow) {
          throw new Error('Current window controller did not expose an active window.');
        }

        return buildOpenSurfaceResult(
          normalizedRequest.surfaceId,
          'current-window',
          currentWindow.windowId,
        );
      }
    } catch (bundleSwitchError) {
      console.warn('Failed to switch the current window bundle', bundleSwitchError);
    }
  }

  if (
    (presentation === 'current-window' ||
      presentation === 'tab' ||
      presentation === 'auto') &&
    currentWindowController
  ) {
    const resolvedPresentation: ResolvedSurfacePresentation =
      presentation === 'auto' ? 'current-window' : presentation;
    const handled = await currentWindowController.openSurface({
      ...normalizedRequest,
      presentation: resolvedPresentation,
    });

    if (handled) {
      const currentWindow = currentWindowController.getCurrentWindow();
      if (!currentWindow) {
        throw new Error('Current window controller did not expose an active window.');
      }

      return buildOpenSurfaceResult(
        normalizedRequest.surfaceId,
        resolvedPresentation,
        currentWindow.windowId,
      );
    }
  }

  if (
    (presentation === 'new-window' || presentation === 'auto') &&
    canOpenNativeWindows()
  ) {
    if (!nativeWindowManager) {
      throw new Error('Native window manager became unavailable.');
    }

    const windowId = await nativeWindowManager.openWindow(
      normalizedRequest.surfaceId,
      normalizedRequest.policy ?? 'main',
    );

    return buildOpenSurfaceResult(
      normalizedRequest.surfaceId,
      'new-window',
      windowId,
    );
  }

  throw new Error(
    `Unable to open surface ${normalizedRequest.surfaceId} with presentation ${presentation}.`,
  );
}

export async function openWindow({surfaceId, policy}: OpenWindowRequest) {
  const result = await openSurface({
    surfaceId,
    policy,
    presentation: 'new-window',
  });

  return result.windowId;
}

export async function focusWindow(windowId: string) {
  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.focusWindow) {
    throw new Error('Native window manager does not support focusWindow.');
  }

  await nativeWindowManager.focusWindow(windowId);
}

export async function closeWindow(windowId: string) {
  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.closeWindow) {
    throw new Error('Native window manager does not support closeWindow.');
  }

  await nativeWindowManager.closeWindow(windowId);
}

export {defaultWindowPreferences, normalizeWindowPolicyId};







