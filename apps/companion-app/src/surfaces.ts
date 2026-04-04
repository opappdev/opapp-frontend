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
import {
  companionBundleIds,
  companionSurfaceIds,
  getCompanionRuntimeBundle,
  type CompanionBundleConfig,
} from '@opapp/framework-companion-runtime';
import {AgentWorkbenchScreen} from './AgentWorkbenchScreen';
import {BundleLauncherScreen} from './BundleLauncherScreen';
import {ViewShotLabScreen} from './ViewShotLabScreen';
import {WindowCaptureLabScreen} from './WindowCaptureLabScreen';

const launcherSurfaceComponent =
  BundleLauncherScreen as ComponentType<Record<string, unknown>>;
const agentWorkbenchSurfaceComponent =
  AgentWorkbenchScreen as ComponentType<Record<string, unknown>>;
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
    surfaceId: companionSurfaceIds.companionMain,
    title: appI18n.surfaces.launcher,
    capabilityId: 'bundle-launcher',
    defaultPolicy: 'main',
    defaultPresentation: 'current-window',
    acceptsInitialProps: true,
    Component: launcherSurfaceComponent,
  }),
  agentWorkbench: defineSurface<Record<string, unknown>>({
    surfaceId: companionSurfaceIds.companionAgentWorkbench,
    title: appI18n.surfaces.agentWorkbench,
    capabilityId: 'agent-workbench',
    defaultPolicy: 'main',
    defaultPresentation: 'current-window',
    acceptsInitialProps: true,
    Component: agentWorkbenchSurfaceComponent,
  }),
  settings: defineSurface<Record<string, unknown>>({
    surfaceId: companionSurfaceIds.companionSettings,
    title: appI18n.surfaces.settings,
    capabilityId: 'settings',
    defaultPolicy: 'settings',
    defaultPresentation: 'current-window',
    presentationPreference: 'settings-surface',
    acceptsInitialProps: true,
    Component: settingsSurfaceComponent,
  }),
  viewShotLab: defineSurface<Record<string, unknown>>({
    surfaceId: companionSurfaceIds.companionViewShot,
    title: appI18n.surfaces.viewShotLab,
    capabilityId: 'view-shot-lab',
    defaultPolicy: 'tool',
    defaultPresentation: 'current-window',
    acceptsInitialProps: true,
    Component: viewShotLabSurfaceComponent,
  }),
  windowCaptureLab: defineSurface<Record<string, unknown>>({
    surfaceId: companionSurfaceIds.companionWindowCapture,
    title: appI18n.surfaces.windowCaptureLab,
    capabilityId: 'window-capture-lab',
    defaultPolicy: 'tool',
    defaultPresentation: 'current-window',
    acceptsInitialProps: true,
    Component: windowCaptureLabSurfaceComponent,
  }),
  llmChat: defineSurface<Record<string, unknown>>({
    surfaceId: companionSurfaceIds.companionChatMain,
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
  'agentWorkbench',
  'settings',
  'viewShotLab',
  'windowCaptureLab',
]);

export const mainCompanionBundleConfig = createCompanionBundleConfig(
  companionBundleIds.main,
  companionSurfaceIds.companionMain,
  mainCompanionSurfaceRegistry,
);

export const chatCompanionSurfaceRegistry = createCompanionSurfaceRegistry([
  'llmChat',
]);

export const chatCompanionBundleConfig = createCompanionBundleConfig(
  companionBundleIds.chat,
  companionSurfaceIds.companionChatMain,
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
