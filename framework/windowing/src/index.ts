import React, {
  PropsWithChildren,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
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
  getCachedOtaRemoteCatalog?(): Promise<string>;
  getStagedBundles?(): Promise<string>;
  getBundleUpdateStatuses?(bundleIdsPayload?: string): Promise<string>;
  runBundleUpdate?(bundleId: string): Promise<string>;
  getStagedBundleIds?(): Promise<string>;
  getTitleBarMetrics?(): Promise<string>;
  setTitleBarPassthroughRects?(
    windowId: string,
    rectsPayload: string,
  ): Promise<void>;
  getCurrentWindow(): Promise<string>;
  getWindowSession(windowId: string): Promise<string>;
  getWindowPreferences(): Promise<string>;
  setWindowPreferences(
    mainWindowMode: string,
    settingsWindowMode: string,
    settingsPresentation: string,
    appearancePreset: string,
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
  runtimeBundleId?: string | null;
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

export type StagedBundleRecord = {
  bundleId: string;
  version: string | null;
  sourceKind: string | null;
  provenanceKind: string | null;
  provenanceStatus: string | null;
  provenanceStagedAt: string | null;
};

export type CachedOtaRemoteCatalogSnapshot = {
  remoteUrl: string | null;
  index: unknown | null;
  manifests: Record<string, Record<string, unknown>>;
};

export type BundleUpdateStatus = {
  bundleId: string;
  remoteUrl: string | null;
  channel: string | null;
  currentVersion: string | null;
  latestVersion: string | null;
  version: string | null;
  previousVersion: string | null;
  hasUpdate: boolean | null;
  inRollout: boolean | null;
  rolloutPercent: number | null;
  status: string;
  stagedAt: string | null;
  recordedAt: string | null;
  channels: Record<string, string> | null;
  errorMessage: string | null;
};

export type BundleUpdateRunResult = BundleUpdateStatus;

export type TitleBarMetrics = {
  extendsContentIntoTitleBar: boolean;
  height: number;
  leftInset: number;
  rightInset: number;
};

export type TitleBarPassthroughRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const lastTitleBarPassthroughPayloadByWindowId = new Map<string, string>();
let lastKnownTitleBarMetrics: TitleBarMetrics | null = null;

type TitleBarPassthroughTarget = {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
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

function parseOptionalTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function parseStagedBundlePayload(raw: string): StagedBundleRecord[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const bundles = new Map<string, StagedBundleRecord>();
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        continue;
      }

      const record = entry as Record<string, unknown>;
      const bundleId = parseOptionalTrimmedString(record.bundleId);
      if (!bundleId) {
        continue;
      }

      const previous = bundles.get(bundleId);
      bundles.set(bundleId, {
        bundleId,
        version: previous?.version ?? parseOptionalTrimmedString(record.version),
        sourceKind:
          previous?.sourceKind ?? parseOptionalTrimmedString(record.sourceKind),
        provenanceKind:
          previous?.provenanceKind ??
          parseOptionalTrimmedString(record.provenanceKind),
        provenanceStatus:
          previous?.provenanceStatus ??
          parseOptionalTrimmedString(record.provenanceStatus),
        provenanceStagedAt:
          previous?.provenanceStagedAt ??
          parseOptionalTrimmedString(record.provenanceStagedAt),
      });
    }

    return [...bundles.values()].sort((left, right) =>
      left.bundleId.localeCompare(right.bundleId),
    );
  } catch {
    return [];
  }
}

function parseCachedOtaRemoteCatalogPayload(
  raw: string,
): CachedOtaRemoteCatalogSnapshot {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        remoteUrl: null,
        index: null,
        manifests: {},
      };
    }

    const record = parsed as Record<string, unknown>;
    const manifests: Record<string, Record<string, unknown>> = {};
    const rawManifests =
      record.manifests &&
      typeof record.manifests === 'object' &&
      !Array.isArray(record.manifests)
        ? (record.manifests as Record<string, unknown>)
        : {};

    for (const [bundleId, versionsValue] of Object.entries(rawManifests)) {
      if (
        !versionsValue ||
        typeof versionsValue !== 'object' ||
        Array.isArray(versionsValue)
      ) {
        continue;
      }

      const versionEntries: Record<string, unknown> = {};
      for (const [version, manifestValue] of Object.entries(
        versionsValue as Record<string, unknown>,
      )) {
        if (
          manifestValue &&
          typeof manifestValue === 'object' &&
          !Array.isArray(manifestValue)
        ) {
          versionEntries[version] = manifestValue;
        }
      }

      manifests[bundleId] = versionEntries;
    }

    return {
      remoteUrl: parseOptionalTrimmedString(record.remoteUrl),
      index:
        record.index && typeof record.index === 'object' && !Array.isArray(record.index)
          ? record.index
          : null,
      manifests,
    };
  } catch {
    return {
      remoteUrl: null,
      index: null,
      manifests: {},
    };
  }
}

function parseOptionalBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function parseOptionalRoundedNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value);
}

function parseBundleUpdateChannels(
  value: unknown,
): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const channels = Object.entries(value)
    .flatMap(([channel, version]) => {
      const normalizedChannel = channel.trim();
      const normalizedVersion = parseOptionalTrimmedString(version);
      if (!normalizedChannel || !normalizedVersion) {
        return [];
      }

      return [[normalizedChannel, normalizedVersion] as const];
    })
    .sort(([left], [right]) => left.localeCompare(right));

  return channels.length > 0 ? Object.fromEntries(channels) : null;
}

function parseBundleUpdateStatusRecord(
  value: unknown,
): BundleUpdateStatus | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const bundleId = parseOptionalTrimmedString(record.bundleId);
  const status = parseOptionalTrimmedString(record.status);
  if (!bundleId || !status) {
    return null;
  }

  return {
    bundleId,
    remoteUrl: parseOptionalTrimmedString(record.remoteUrl),
    channel: parseOptionalTrimmedString(record.channel),
    currentVersion: parseOptionalTrimmedString(record.currentVersion),
    latestVersion: parseOptionalTrimmedString(record.latestVersion),
    version: parseOptionalTrimmedString(record.version),
    previousVersion: parseOptionalTrimmedString(record.previousVersion),
    hasUpdate: parseOptionalBoolean(record.hasUpdate),
    inRollout: parseOptionalBoolean(record.inRollout),
    rolloutPercent: parseOptionalRoundedNumber(record.rolloutPercent),
    status,
    stagedAt: parseOptionalTrimmedString(record.stagedAt),
    recordedAt: parseOptionalTrimmedString(record.recordedAt),
    channels: parseBundleUpdateChannels(record.channels),
    errorMessage: parseOptionalTrimmedString(record.errorMessage),
  };
}

function parseBundleUpdateStatusesPayload(raw: string): BundleUpdateStatus[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const statuses = new Map<string, BundleUpdateStatus>();
    for (const entry of parsed) {
      const status = parseBundleUpdateStatusRecord(entry);
      if (!status) {
        continue;
      }

      statuses.set(status.bundleId, status);
    }

    return [...statuses.values()].sort((left, right) =>
      left.bundleId.localeCompare(right.bundleId),
    );
  } catch {
    return [];
  }
}

function parseBundleUpdateStatusPayload(raw: string): BundleUpdateStatus | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseBundleUpdateStatusRecord(parsed);
  } catch {
    return null;
  }
}

function parseTitleBarMetricsPayload(raw: string): TitleBarMetrics | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    return {
      extendsContentIntoTitleBar:
        typeof record.extendsContentIntoTitleBar === 'boolean'
          ? record.extendsContentIntoTitleBar
          : false,
      height:
        typeof record.height === 'number' && Number.isFinite(record.height)
          ? Math.max(0, Math.round(record.height))
          : 0,
      leftInset:
        typeof record.leftInset === 'number' && Number.isFinite(record.leftInset)
          ? Math.max(0, Math.round(record.leftInset))
          : 0,
      rightInset:
        typeof record.rightInset === 'number' && Number.isFinite(record.rightInset)
          ? Math.max(0, Math.round(record.rightInset))
          : 0,
    };
  } catch {
    return null;
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

function shouldSkipStoredWindowSessionHydration(
  initialProps: Record<string, unknown> | undefined,
) {
  return createInitialAutoOpenRequest(initialProps)?.presentation === 'current-window';
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
  const skipStoredSessionHydration = useMemo(
    () => shouldSkipStoredWindowSessionHydration(props.initialProps),
    [props.initialProps],
  );

  const resolvedSession = useMemo(
    () => resolveSurfaceSession(hostState.session, hostState.windowPolicy),
    [hostState.session, hostState.windowPolicy],
  );
  const activeTab = resolvedSession.activeTab;

  useEffect(() => {
    let cancelled = false;
    setHydratedStoredSession(false);

    if (skipStoredSessionHydration) {
      // Launch-config current-window auto-open should win over any persisted
      // session snapshot instead of waiting for native session hydration.
      setHydratedStoredSession(true);
      return () => {
        cancelled = true;
      };
    }

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
  }, [hostState.session.windowId, skipStoredSessionHydration]);

  useEffect(() => {
    if (!hydratedStoredSession) {
      return;
    }

    void persistWindowSessionState(hostState.session).catch(error => {
      console.warn('Failed to persist window session', error);
    });
  }, [hydratedStoredSession, hostState.session]);

  useLayoutEffect(() => {
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
          runtimeBundleId: props.bundleId ?? null,
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

export function canManageBundleUpdates() {
  const nativeWindowManager = getNativeWindowManager();
  return Boolean(
    nativeWindowManager?.getBundleUpdateStatuses &&
      nativeWindowManager?.runBundleUpdate,
  );
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

export async function getCachedOtaRemoteCatalog() {
  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.getCachedOtaRemoteCatalog) {
    return null;
  }

  try {
    const payload = await nativeWindowManager.getCachedOtaRemoteCatalog();
    if (!payload.trim()) {
      return null;
    }

    return parseCachedOtaRemoteCatalogPayload(payload);
  } catch (error) {
    console.warn('Failed to read cached OTA remote catalog', error);
    return null;
  }
}

export async function getStagedBundles() {
  const nativeWindowManager = getNativeWindowManager();
  if (nativeWindowManager?.getStagedBundles) {
    try {
      return parseStagedBundlePayload(await nativeWindowManager.getStagedBundles());
    } catch (error) {
      console.warn('Failed to read staged bundles', error);
      return [];
    }
  }

  if (!nativeWindowManager?.getStagedBundleIds) {
    return [];
  }

  try {
    return parseStringArrayPayload(await nativeWindowManager.getStagedBundleIds()).map(
      bundleId => ({
        bundleId,
        version: null,
        sourceKind: null,
        provenanceKind: null,
        provenanceStatus: null,
        provenanceStagedAt: null,
      }),
    );
  } catch (error) {
    console.warn('Failed to read staged bundle IDs', error);
    return [];
  }
}

export async function getStagedBundleIds() {
  const stagedBundles = await getStagedBundles();
  return stagedBundles.map(bundle => bundle.bundleId);
}

export async function getTitleBarMetrics() {
  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.getTitleBarMetrics) {
    return null;
  }

  try {
    const nextMetrics = parseTitleBarMetricsPayload(
      await nativeWindowManager.getTitleBarMetrics(),
    );
    lastKnownTitleBarMetrics = nextMetrics;
    return nextMetrics;
  } catch (error) {
    console.warn('Failed to read title bar metrics', error);
    return lastKnownTitleBarMetrics;
  }
}

export function useTitleBarMetrics(refreshKey?: unknown) {
  const [metrics, setMetrics] = useState<TitleBarMetrics | null>(
    () => lastKnownTitleBarMetrics,
  );

  useEffect(() => {
    let cancelled = false;

    void getTitleBarMetrics().then(nextMetrics => {
      if (!cancelled) {
        setMetrics(nextMetrics);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return metrics;
}

export function resolveTitleBarContentInset(
  metrics: TitleBarMetrics | null,
) {
  if (!metrics?.extendsContentIntoTitleBar) {
    return 0;
  }

  return Math.max(0, metrics.height);
}

async function measureTitleBarPassthroughTarget(
  targetRef: RefObject<TitleBarPassthroughTarget | null>,
) {
  const target = targetRef.current;
  if (!target?.measureInWindow) {
    return null;
  }

  return new Promise<TitleBarPassthroughRect | null>(resolve => {
    try {
      target.measureInWindow?.((x, y, width, height) => {
        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height) ||
          width <= 0 ||
          height <= 0
        ) {
          resolve(null);
          return;
        }

        resolve({
          x,
          y,
          width,
          height,
        });
      });
    } catch (error) {
      console.warn('Failed to measure title bar passthrough target', error);
      resolve(null);
    }
  });
}

export async function setTitleBarPassthroughRects(
  windowId: string,
  rects: ReadonlyArray<TitleBarPassthroughRect>,
  options: {force?: boolean} = {},
) {
  const normalizedWindowId = windowId.trim();
  if (!normalizedWindowId) {
    return;
  }

  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.setTitleBarPassthroughRects) {
    return;
  }

  const payload = rects
    .filter(
      rect =>
        Number.isFinite(rect.x) &&
        Number.isFinite(rect.y) &&
        Number.isFinite(rect.width) &&
        Number.isFinite(rect.height) &&
        rect.width > 0 &&
        rect.height > 0,
    )
    .map(rect => ({
      x: rect.x,
      y: rect.y,
        width: rect.width,
        height: rect.height,
      }));
  const serializedPayload = JSON.stringify(payload);
  if (
    !options.force &&
    lastTitleBarPassthroughPayloadByWindowId.get(normalizedWindowId) ===
      serializedPayload
  ) {
    return;
  }

  try {
    await nativeWindowManager.setTitleBarPassthroughRects(
      normalizedWindowId,
      serializedPayload,
    );
    lastTitleBarPassthroughPayloadByWindowId.set(
      normalizedWindowId,
      serializedPayload,
    );
  } catch (error) {
    console.warn('Failed to set title bar passthrough rects', error);
  }
}

export function useTitleBarPassthroughTargets({
  windowId,
  enabled,
  targets,
  refreshKey,
}: {
  windowId: string | null;
  enabled: boolean;
  targets: ReadonlyArray<RefObject<TitleBarPassthroughTarget | null>>;
  refreshKey?: unknown;
}) {
  useEffect(() => {
    if (!windowId) {
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      void (async () => {
        if (!enabled) {
          await setTitleBarPassthroughRects(windowId, []);
          return;
        }

        const rects = (
          await Promise.all(
            targets.map(target => measureTitleBarPassthroughTarget(target)),
          )
        ).filter(
          (rect): rect is TitleBarPassthroughRect => rect !== null,
        );

        if (cancelled) {
          return;
        }

        await setTitleBarPassthroughRects(windowId, rects);
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [enabled, refreshKey, targets, windowId]);

  useEffect(() => {
    if (!windowId) {
      return;
    }

    return () => {
      void setTitleBarPassthroughRects(windowId, [], {force: true});
    };
  }, [windowId]);
}

export async function getBundleUpdateStatuses(bundleIds?: string[]) {
  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.getBundleUpdateStatuses) {
    return [];
  }

  try {
    return parseBundleUpdateStatusesPayload(
      await nativeWindowManager.getBundleUpdateStatuses(
        JSON.stringify(bundleIds ?? []),
      ),
    );
  } catch (error) {
    console.warn('Failed to read bundle update statuses', error);
    return [];
  }
}

export async function runBundleUpdate(bundleId: string) {
  const normalizedBundleId = bundleId.trim();
  if (!normalizedBundleId) {
    throw new Error('Bundle ID is required.');
  }

  const nativeWindowManager = getNativeWindowManager();
  if (!nativeWindowManager?.runBundleUpdate) {
    throw new Error('Native window manager does not support bundle updates.');
  }

  const payload = await nativeWindowManager.runBundleUpdate(normalizedBundleId);
  const parsed = parseBundleUpdateStatusPayload(payload);
  if (!parsed) {
    throw new Error('Native window manager returned an invalid bundle update payload.');
  }

  return parsed;
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
    normalized.appearancePreset,
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
  const currentRuntimeBundleId =
    currentWindow.runtimeBundleId ?? activeSessionTab.bundleId ?? undefined;

  if (
    normalizedRequest.presentation !== 'current-window' ||
    currentRuntimeBundleId === normalizedRequest.bundleId
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

function isCrossBundleCurrentWindowRequest(
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
  const currentRuntimeBundleId =
    currentWindow.runtimeBundleId ?? activeSessionTab.bundleId ?? undefined;

  return (
    normalizedRequest.presentation === 'current-window' &&
    Boolean(currentRuntimeBundleId) &&
    currentRuntimeBundleId !== normalizedRequest.bundleId
  );
}

export async function openSurface(request: OpenSurfaceRequest): Promise<OpenSurfaceResult> {
  const normalizedRequest = await normalizeOpenSurfaceRequest(request);
  const presentation = normalizedRequest.presentation ?? 'auto';
  const currentWindowController = getRegisteredCurrentWindowController(normalizedRequest);
  const nativeWindowManager = getNativeWindowManager();
  const shouldPreferCurrentWindow =
    presentation === 'current-window' || presentation === 'auto';
  const currentWindowSwitchRequest =
    shouldPreferCurrentWindow && currentWindowController
      ? {
          ...normalizedRequest,
          presentation:
            presentation === 'auto' ? 'current-window' : presentation,
        }
      : null;
  const crossBundleCurrentWindowRequest =
    currentWindowSwitchRequest && currentWindowController
      ? isCrossBundleCurrentWindowRequest(
          currentWindowSwitchRequest,
          currentWindowController,
        )
      : false;

  if (
    currentWindowSwitchRequest &&
    currentWindowController &&
    nativeWindowManager?.switchCurrentWindowBundle
  ) {
    try {
      const switched = await switchCurrentWindowBundle(
        nativeWindowManager,
        currentWindowSwitchRequest,
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
      if (crossBundleCurrentWindowRequest) {
        throw bundleSwitchError;
      }
    }
  }

  if (
    (presentation === 'current-window' ||
      presentation === 'tab' ||
      presentation === 'auto') &&
    currentWindowController &&
    !crossBundleCurrentWindowRequest
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







