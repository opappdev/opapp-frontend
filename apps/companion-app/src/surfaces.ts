import type {ComponentType} from 'react';
import {
  LlmChatScreen,
} from '@opapp/capability-llm-chat';
import {
  createSurfaceRegistry,
  defineSurface,
  registerSurfaceRegistry,
  type SurfaceRegistry,
} from '@opapp/framework-surfaces';
import {appI18n} from '@opapp/framework-i18n';
import {SettingsScreen} from '@opapp/capability-settings';
import {BundleLauncherScreen} from './BundleLauncherScreen';
import {
  companionBundleIds,
  getCompanionRuntimeBundle,
} from './companion-runtime';
import surfaceIds from './surface-ids.json';
import {ViewShotLabScreen} from './ViewShotLabScreen';
import {WindowCaptureLabScreen} from './WindowCaptureLabScreen';

type CompanionBundleConfig = {
  bundleId: string;
  defaultSurfaceId: string;
  surfaceIds: string[];
  surfaceRegistry: SurfaceRegistry;
};

const launcherSurfaceComponent =
  BundleLauncherScreen as ComponentType<Record<string, unknown>>;
const settingsSurfaceComponent =
  SettingsScreen as ComponentType<Record<string, unknown>>;
const viewShotLabSurfaceComponent =
  ViewShotLabScreen as ComponentType<Record<string, unknown>>;
const windowCaptureLabSurfaceComponent =
  WindowCaptureLabScreen as ComponentType<Record<string, unknown>>;
const llmChatSurfaceComponent =
  LlmChatScreen as ComponentType<Record<string, unknown>>;

const companionSurfaceDefinitions = {
  launcher: defineSurface<Record<string, unknown>>({
    surfaceId: surfaceIds.companionMain,
    title: appI18n.surfaces.launcher,
    capabilityId: 'bundle-launcher',
    defaultPolicy: 'main',
    defaultPresentation: 'current-window',
    acceptsInitialProps: true,
    Component: launcherSurfaceComponent,
  }),
  settings: defineSurface<Record<string, unknown>>({
    surfaceId: surfaceIds.companionSettings,
    title: appI18n.surfaces.settings,
    capabilityId: 'settings',
    defaultPolicy: 'settings',
    defaultPresentation: 'current-window',
    presentationPreference: 'settings-surface',
    acceptsInitialProps: true,
    Component: settingsSurfaceComponent,
  }),
  viewShotLab: defineSurface<Record<string, unknown>>({
    surfaceId: surfaceIds.companionViewShot,
    title: appI18n.surfaces.viewShotLab,
    capabilityId: 'view-shot-lab',
    defaultPolicy: 'tool',
    defaultPresentation: 'current-window',
    acceptsInitialProps: true,
    Component: viewShotLabSurfaceComponent,
  }),
  windowCaptureLab: defineSurface<Record<string, unknown>>({
    surfaceId: surfaceIds.companionWindowCapture,
    title: appI18n.surfaces.windowCaptureLab,
    capabilityId: 'window-capture-lab',
    defaultPolicy: 'tool',
    defaultPresentation: 'current-window',
    acceptsInitialProps: true,
    Component: windowCaptureLabSurfaceComponent,
  }),
  llmChat: defineSurface<Record<string, unknown>>({
    surfaceId: surfaceIds.companionChatMain,
    title: appI18n.surfaces.llmChat,
    capabilityId: 'llm-chat',
    defaultPolicy: 'main',
    defaultPresentation: 'current-window',
    acceptsInitialProps: true,
    Component: llmChatSurfaceComponent,
  }),
} as const;

function createCompanionSurfaceRegistry(
  surfaceKeys: ReadonlyArray<keyof typeof companionSurfaceDefinitions>,
) {
  return createSurfaceRegistry(
    surfaceKeys.map(surfaceKey => companionSurfaceDefinitions[surfaceKey]),
  );
}

function createCompanionBundleConfig(
  bundleId: string,
  defaultSurfaceId: string,
  surfaceRegistry: SurfaceRegistry,
): CompanionBundleConfig {
  const runtimeBundle = getCompanionRuntimeBundle(bundleId as typeof companionBundleIds.main);

  return {
    bundleId,
    defaultSurfaceId,
    surfaceIds: runtimeBundle?.surfaces ?? surfaceRegistry.list().map(surface => surface.surfaceId),
    surfaceRegistry,
  };
}

export const mainCompanionSurfaceRegistry = createCompanionSurfaceRegistry([
  'launcher',
  'settings',
  'viewShotLab',
  'windowCaptureLab',
]);

export const mainCompanionBundleConfig = createCompanionBundleConfig(
  companionBundleIds.main,
  surfaceIds.companionMain,
  mainCompanionSurfaceRegistry,
);

export const chatCompanionSurfaceRegistry = createCompanionSurfaceRegistry([
  'llmChat',
]);

export const chatCompanionBundleConfig = createCompanionBundleConfig(
  companionBundleIds.chat,
  surfaceIds.companionChatMain,
  chatCompanionSurfaceRegistry,
);

export function registerCompanionBundleRegistry(
  bundleConfig: CompanionBundleConfig,
) {
  return registerSurfaceRegistry(bundleConfig.surfaceRegistry);
}

export function resolveCompanionBundleConfig(bundleId?: string | null) {
  if (!bundleId || bundleId === companionBundleIds.main) {
    return mainCompanionBundleConfig;
  }

  if (bundleId === companionBundleIds.chat) {
    return chatCompanionBundleConfig;
  }

  return null;
}

export type {CompanionBundleConfig};
