import windowPolicyRegistryJson from './window-policy-registry.json';

export const coreWindowPolicyIds = [
  'main',
  'settings',
  'tool',
] as const;

export const windowPolicyIds = coreWindowPolicyIds;

export type CoreWindowPolicyId = (typeof coreWindowPolicyIds)[number];

export type WindowPolicyId = string;

export const legacyWindowPolicyIds = ['compact', 'wide'] as const;

export type LegacyWindowPolicyId = (typeof legacyWindowPolicyIds)[number];

export const windowSizeModes = ['balanced', 'compact', 'wide'] as const;

export type WindowSizeMode = (typeof windowSizeModes)[number];

export const windowPlacements = [
  'centered',
  'remember-last',
  'platform-default',
] as const;

export type WindowPlacement = (typeof windowPlacements)[number];

export const settingsSurfacePresentations = [
  'current-window',
  'new-window',
] as const;

export type SettingsSurfacePresentation =
  (typeof settingsSurfacePresentations)[number];

export const appearancePresets = ['classic', 'blossom'] as const;

export type AppearancePreset = (typeof appearancePresets)[number];

export type WindowPreferences = {
  mainWindowMode: WindowSizeMode;
  settingsWindowMode: WindowSizeMode;
  settingsPresentation: SettingsSurfacePresentation;
  appearancePreset: AppearancePreset;
};

export type WindowPolicyDefinition = {
  policyId: WindowPolicyId;
  defaultMode: WindowSizeMode;
  minWidth: number;
  minHeight: number;
  defaultPlacement: WindowPlacement;
  defaultMaximized?: boolean;
  rememberWindowRect: boolean;
  allowManualResize: boolean;
  geometry: Record<
    WindowSizeMode,
    {
      widthFactor: number;
      aspectRatio: number;
      minWidth: number;
      minHeight: number;
    }
  >;
};

export type WindowPolicyRegistry = Record<string, WindowPolicyDefinition>;

export const windowPolicyRegistry =
  windowPolicyRegistryJson as WindowPolicyRegistry;

export type ParsedWindowPolicyInput = {
  policyId: WindowPolicyId;
  legacyModeOverride?: WindowSizeMode;
};

export function isCoreWindowPolicyId(value: unknown): value is CoreWindowPolicyId {
  return value === 'main' || value === 'settings' || value === 'tool';
}

export function parseWindowPolicyInput(
  value: unknown,
): ParsedWindowPolicyInput | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue === "compact" || normalizedValue === "wide") {
    return {
      policyId: 'main',
      legacyModeOverride: normalizedValue,
    };
  }

  return {
    policyId: normalizedValue,
  };
}

export function normalizeWindowPolicyId(
  value: unknown,
  fallback: WindowPolicyId = 'main',
): WindowPolicyId {
  return parseWindowPolicyInput(value)?.policyId ?? fallback;
}

export type SurfaceId = string;

export const surfacePresentations = [
  'auto',
  'current-window',
  'tab',
  'new-window',
] as const;

export type SurfacePresentation = (typeof surfacePresentations)[number];

export const startupTargetPresentations = [
  'current-window',
  'tab',
  'new-window',
] as const;

export type StartupTargetPresentation =
  (typeof startupTargetPresentations)[number];

export const surfacePresentationPreferenceIds = ['settings-surface'] as const;

export type SurfacePresentationPreferenceId =
  (typeof surfacePresentationPreferenceIds)[number];

export type WindowDescriptor = {
  windowId: string;
  surfaceId: SurfaceId;
  policy?: WindowPolicyId;
  initialProps?: Record<string, unknown>;
  bundleId?: string;
};

export type SurfaceDescriptor = {
  surfaceId: SurfaceId;
  title?: string;
  capabilityId?: string;
  defaultPolicy?: WindowPolicyId;
  defaultPresentation?: SurfacePresentation;
  presentationPreference?: SurfacePresentationPreferenceId;
  acceptsInitialProps?: boolean;
};

export type BundleDescriptor = {
  bundleId: string;
  platform: 'windows' | 'macos' | 'android' | 'ios';
  version: string;
  surfaces: SurfaceId[];
};

export type WindowSessionTabDescriptor = {
  tabId: string;
  surfaceId: SurfaceId;
  title?: string;
  policy?: WindowPolicyId;
  initialProps?: Record<string, unknown>;
  bundleId?: string;
};

export type WindowSessionDescriptor = {
  windowId: string;
  tabs: WindowSessionTabDescriptor[];
  activeTabId: string;
};

export type OpenSurfaceRequest = {
  surfaceId: SurfaceId;
  initialProps?: Record<string, unknown>;
  policy?: WindowPolicyId;
  bundleId?: string;
  presentation?: SurfacePresentation;
  targetWindowId?: string;
};

export type StartupTargetPreference = {
  surfaceId: SurfaceId;
  bundleId: string;
  policy: WindowPolicyId;
  presentation: StartupTargetPresentation;
};

export type ResolvedSurfacePresentation = Exclude<SurfacePresentation, 'auto'>;

export type OpenSurfaceResult = {
  surfaceId: SurfaceId;
  presentation: ResolvedSurfacePresentation;
  windowId: string;
};

export type SurfaceLaunchProps = {
  windowId?: string;
  surfaceId?: SurfaceId;
  windowPolicy?: WindowPolicyId;
  initialProps?: Record<string, unknown>;
  initialSessionPayload?: string;
  bundleId?: string;
};


