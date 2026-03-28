import {
  parseWindowPolicyInput,
  normalizeWindowPolicyId,
  settingsSurfacePresentations,
  startupTargetPresentations,
  type StartupTargetPreference,
  type StartupTargetPresentation,
  windowSizeModes,
  type SettingsSurfacePresentation,
  type WindowPreferences,
  type WindowSessionDescriptor,
  type WindowSizeMode,
  type WindowPolicyId,
} from '@opapp/contracts-windowing';

const windowSizeModeSet = new Set<WindowSizeMode>(windowSizeModes);
const settingsSurfacePresentationSet = new Set<SettingsSurfacePresentation>(
  settingsSurfacePresentations,
);
const startupTargetPresentationSet = new Set<StartupTargetPresentation>(
  startupTargetPresentations,
);

export const defaultWindowPreferences: WindowPreferences = {
  mainWindowMode: 'balanced',
  settingsWindowMode: 'balanced',
  settingsPresentation: 'current-window',
};

function isWindowSizeMode(value: unknown): value is WindowSizeMode {
  return typeof value === 'string' && windowSizeModeSet.has(value as WindowSizeMode);
}

function isSettingsSurfacePresentation(
  value: unknown,
): value is SettingsSurfacePresentation {
  return (
    typeof value === 'string' &&
    settingsSurfacePresentationSet.has(value as SettingsSurfacePresentation)
  );
}

function isStartupTargetPresentation(
  value: unknown,
): value is StartupTargetPresentation {
  return (
    typeof value === 'string' &&
    startupTargetPresentationSet.has(value as StartupTargetPresentation)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeWindowPreferences(
  value: Partial<WindowPreferences> | null | undefined,
): WindowPreferences {
  return {
    mainWindowMode: isWindowSizeMode(value?.mainWindowMode)
      ? value.mainWindowMode
      : defaultWindowPreferences.mainWindowMode,
    settingsWindowMode: isWindowSizeMode(value?.settingsWindowMode)
      ? value.settingsWindowMode
      : defaultWindowPreferences.settingsWindowMode,
    settingsPresentation: isSettingsSurfacePresentation(value?.settingsPresentation)
      ? value.settingsPresentation
      : defaultWindowPreferences.settingsPresentation,
  };
}

export function parseWindowPreferencesPayload(payload: unknown): WindowPreferences {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as Partial<WindowPreferences>;
      return normalizeWindowPreferences(parsed);
    } catch (error) {
      console.warn('Failed to parse window preferences payload', error);
      return defaultWindowPreferences;
    }
  }

  if (payload && typeof payload === 'object') {
    return normalizeWindowPreferences(payload as Partial<WindowPreferences>);
  }

  return defaultWindowPreferences;
}

export function normalizeStartupTargetPreference(
  value: Partial<StartupTargetPreference> | null | undefined,
): StartupTargetPreference | null {
  if (typeof value?.surfaceId !== 'string' || !value.surfaceId.trim()) {
    return null;
  }

  if (typeof value.bundleId !== 'string' || !value.bundleId.trim()) {
    return null;
  }

  const parsedPolicy = parseWindowPolicyInput(value.policy);
  if (!parsedPolicy) {
    return null;
  }

  if (!isStartupTargetPresentation(value.presentation)) {
    return null;
  }

  return {
    surfaceId: value.surfaceId.trim(),
    bundleId: value.bundleId.trim(),
    policy: parsedPolicy.policyId,
    presentation: value.presentation,
  };
}

export function parseStartupTargetPreferencePayload(
  payload: unknown,
): StartupTargetPreference | null {
  if (!payload) {
    return null;
  }

  let parsedPayload: unknown = payload;

  if (typeof payload === 'string') {
    if (!payload.trim()) {
      return null;
    }

    try {
      parsedPayload = JSON.parse(payload) as unknown;
    } catch (error) {
      console.warn('Failed to parse startup target payload', error);
      return null;
    }
  }

  if (!isRecord(parsedPayload)) {
    return null;
  }

  return normalizeStartupTargetPreference(
    parsedPayload as Partial<StartupTargetPreference>,
  );
}

export function parseWindowSessionPayload(
  payload: unknown,
  fallbackWindowId: string,
): WindowSessionDescriptor | null {
  if (!payload) {
    return null;
  }

  let parsedPayload: unknown = payload;

  if (typeof payload === 'string') {
    if (!payload.trim()) {
      return null;
    }

    try {
      parsedPayload = JSON.parse(payload) as unknown;
    } catch (error) {
      console.warn('Failed to parse window session payload', error);
      return null;
    }
  }

  if (!isRecord(parsedPayload) || !Array.isArray(parsedPayload.tabs)) {
    return null;
  }

  const tabs: WindowSessionDescriptor['tabs'] = parsedPayload.tabs
    .map(tab => {
      if (!isRecord(tab)) {
        return null;
      }

      if (typeof tab.tabId !== 'string' || typeof tab.surfaceId !== 'string') {
        return null;
      }

      const policy: WindowPolicyId | undefined =
        typeof tab.policy === 'string' && tab.policy.trim()
          ? normalizeWindowPolicyId(tab.policy)
          : undefined;

      return {
        tabId: tab.tabId,
        surfaceId: tab.surfaceId,
        title: typeof tab.title === 'string' ? tab.title : undefined,
        policy,
        bundleId: typeof tab.bundleId === 'string' ? tab.bundleId : undefined,
        initialProps: isRecord(tab.initialProps)
          ? (tab.initialProps as Record<string, unknown>)
          : undefined,
      };
    })
    .filter((tab): tab is NonNullable<typeof tab> => tab !== null);

  if (tabs.length === 0) {
    return null;
  }

  const requestedActiveTabId =
    typeof parsedPayload.activeTabId === 'string' ? parsedPayload.activeTabId : tabs[0].tabId;
  const activeTabId = tabs.some(tab => tab.tabId === requestedActiveTabId)
    ? requestedActiveTabId
    : tabs[0].tabId;

  return {
    windowId:
      typeof parsedPayload.windowId === 'string'
        ? parsedPayload.windowId
        : fallbackWindowId,
    activeTabId,
    tabs,
  };
}

export function serializeWindowSessionPayload(session: WindowSessionDescriptor) {
  return JSON.stringify(session);
}

export function serializeStartupTargetPreference(
  preference: StartupTargetPreference,
) {
  return JSON.stringify(preference);
}
