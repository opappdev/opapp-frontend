import type {
  OpenSurfaceRequest,
  StartupTargetPreference,
  StartupTargetPresentation,
  SurfacePresentation,
  WindowPolicyId,
} from '@opapp/contracts-windowing';
import {appI18n} from '@opapp/framework-i18n';
import runtimeBundles from './runtime-bundles.json';
import surfaceIds from './surface-ids.json';

export const companionBundleIds = {
  main: runtimeBundles.mainBundleId,
  chat: 'opapp.companion.chat',
} as const;

export type CompanionBundleId = string;

export type CompanionRuntimeBundle = {
  bundleId: string;
  defaultSurfaceId: string;
  entryFile?: string;
  bundleFile?: string;
  platforms?: string[];
  minHostVersion?: string;
  maxHostVersion?: string;
  surfaces: string[];
};

export type CompanionLaunchTarget = {
  targetId: string;
  title: string;
  description: string;
  surfaceId: string;
  bundleId: CompanionBundleId;
  policy: WindowPolicyId;
  presentation: StartupTargetPresentation;
};

export type CompanionStartupTarget = StartupTargetPreference;

export type CompanionStartupAutoOpenDecision =
  | {
      kind: 'skip';
      reason:
        | 'not-main-bundle'
        | 'not-main-window'
        | 'launch-config'
        | 'no-target'
        | 'already-active';
    }
  | {
      kind: 'open';
      request: OpenSurfaceRequest;
    };

export type CompanionRestoredSessionAutoOpenDecision =
  | {
      kind: 'skip';
      reason:
        | 'not-main-bundle'
        | 'not-main-window'
        | 'launch-config'
        | 'startup-target'
        | 'not-cross-bundle-session';
    }
  | {
      kind: 'open';
      request: OpenSurfaceRequest;
    };

export type CompanionStartupTargetMigrationDecision =
  | {
      kind: 'noop';
    }
  | {
      kind: 'cleanup-legacy';
    }
  | {
      kind: 'migrate-legacy';
      target: CompanionStartupTarget;
    };

type CompanionDiscoveredBundleTargetRecord = {
  bundleId: string;
  surfaceIds: ReadonlyArray<string>;
};

const runtimeBundleList = runtimeBundles.bundles as CompanionRuntimeBundle[];
const allowedStartupPresentations = new Set<SurfacePresentation>([
  'current-window',
  'new-window',
  'tab',
]);

export const companionRuntimeBundleList = runtimeBundleList;
// Legacy migration fallback for startup targets saved before the host-owned
// startup target preference protocol existed.
export const companionStartupTargetFile = 'startup/companion-startup-target.json';

export const defaultCompanionStartupTarget: CompanionStartupTarget = {
  surfaceId: surfaceIds.companionMain,
  bundleId: companionBundleIds.main,
  policy: 'main',
  presentation: 'current-window',
};

export const companionLaunchTargets: CompanionLaunchTarget[] = [
  {
    targetId: 'main-launcher',
    title: appI18n.surfaces.launcher,
    description: appI18n.bundleLauncher.targets.mainLauncher,
    surfaceId: surfaceIds.companionMain,
    bundleId: companionBundleIds.main,
    policy: 'main',
    presentation: 'current-window',
  },
  {
    targetId: 'agent-workbench',
    title: appI18n.surfaces.agentWorkbench,
    description: appI18n.bundleLauncher.targets.agentWorkbench,
    surfaceId: surfaceIds.companionAgentWorkbench,
    bundleId: companionBundleIds.main,
    policy: 'main',
    presentation: 'current-window',
  },
  {
    targetId: 'settings',
    title: appI18n.surfaces.settings,
    description: appI18n.bundleLauncher.targets.settings,
    surfaceId: surfaceIds.companionSettings,
    bundleId: companionBundleIds.main,
    policy: 'settings',
    presentation: 'current-window',
  },
  {
    targetId: 'view-shot',
    title: appI18n.surfaces.viewShotLab,
    description: appI18n.bundleLauncher.targets.viewShotLab,
    surfaceId: surfaceIds.companionViewShot,
    bundleId: companionBundleIds.main,
    policy: 'tool',
    presentation: 'current-window',
  },
  {
    targetId: 'window-capture',
    title: appI18n.surfaces.windowCaptureLab,
    description: appI18n.bundleLauncher.targets.windowCaptureLab,
    surfaceId: surfaceIds.companionWindowCapture,
    bundleId: companionBundleIds.main,
    policy: 'tool',
    presentation: 'current-window',
  },
  {
    targetId: 'llm-chat',
    title: appI18n.surfaces.llmChat,
    description: appI18n.bundleLauncher.targets.llmChat,
    surfaceId: surfaceIds.companionChatMain,
    bundleId: companionBundleIds.chat,
    policy: 'main',
    presentation: 'current-window',
  },
];

export function buildDiscoveredCompanionLaunchTargets(
  bundles: ReadonlyArray<CompanionDiscoveredBundleTargetRecord>,
) {
  const discoveredTargets: CompanionLaunchTarget[] = [];
  const seenTargets = new Set(
    companionLaunchTargets.map(target => `${target.bundleId}::${target.surfaceId}`),
  );

  for (const bundle of bundles) {
    const bundleId = bundle.bundleId.trim();
    if (!bundleId || bundleId === companionBundleIds.main) {
      continue;
    }

    const surfaceIds = [...new Set(bundle.surfaceIds.map(surfaceId => surfaceId.trim()).filter(Boolean))].sort();
    for (const surfaceId of surfaceIds) {
      const targetKey = `${bundleId}::${surfaceId}`;
      if (seenTargets.has(targetKey)) {
        continue;
      }

      seenTargets.add(targetKey);
      discoveredTargets.push({
        targetId: `discovered:${bundleId}:${surfaceId}`,
        title: surfaceId,
        description: appI18n.bundleLauncher.targets.discoveredBundle,
        surfaceId,
        bundleId,
        policy: 'main',
        presentation: 'current-window',
      });
    }
  }

  return discoveredTargets.sort((left, right) => {
    if (left.bundleId !== right.bundleId) {
      return left.bundleId.localeCompare(right.bundleId);
    }

    return left.surfaceId.localeCompare(right.surfaceId);
  });
}

export function getCompanionRuntimeBundle(bundleId: CompanionBundleId) {
  return (
    companionRuntimeBundleList.find(bundle => bundle.bundleId === bundleId) ?? null
  );
}

export function isCompanionStartupTarget(
  value: Partial<CompanionStartupTarget> | null | undefined,
): value is CompanionStartupTarget {
  return (
    typeof value?.surfaceId === 'string' &&
    value.surfaceId.length > 0 &&
    typeof value.bundleId === 'string' &&
    value.bundleId.length > 0 &&
    typeof value.policy === 'string' &&
    value.policy.length > 0 &&
    typeof value.presentation === 'string' &&
    allowedStartupPresentations.has(value.presentation)
  );
}

export function parseCompanionStartupTarget(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Partial<CompanionStartupTarget>;
    return isCompanionStartupTarget(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function findCompanionLaunchTarget(
  target: Partial<CompanionStartupTarget> | null | undefined,
  launchTargets: ReadonlyArray<CompanionLaunchTarget> = companionLaunchTargets,
) {
  if (!target) {
    return null;
  }

  return (
    launchTargets.find(
      candidate =>
        candidate.surfaceId === target.surfaceId &&
        candidate.bundleId === target.bundleId,
    ) ?? null
  );
}

export function areCompanionTargetsEqual(
  left: Partial<CompanionStartupTarget> | null | undefined,
  right: Partial<CompanionStartupTarget> | null | undefined,
) {
  return (
    left?.surfaceId === right?.surfaceId &&
    left?.bundleId === right?.bundleId &&
    left?.policy === right?.policy &&
    left?.presentation === right?.presentation
  );
}

export function resolveCompanionStartupTargetMigration({
  storedStartupTarget,
  legacyStartupTarget,
}: {
  storedStartupTarget: CompanionStartupTarget | null;
  legacyStartupTarget: CompanionStartupTarget | null;
}): CompanionStartupTargetMigrationDecision {
  if (!legacyStartupTarget) {
    return {kind: 'noop'};
  }

  if (storedStartupTarget) {
    return {kind: 'cleanup-legacy'};
  }

  return {
    kind: 'migrate-legacy',
    target: legacyStartupTarget,
  };
}

export function createCompanionOpenSurfaceRequest(
  target: CompanionStartupTarget,
): OpenSurfaceRequest {
  return {
    surfaceId: target.surfaceId,
    bundleId:
      target.bundleId === companionBundleIds.main ? undefined : target.bundleId,
    policy: target.policy,
    presentation: target.presentation,
  };
}

export function shouldCompanionStartupTargetWaitForBundleReload({
  runtimeBundleId,
  targetBundleId,
  presentation,
}: {
  runtimeBundleId: string;
  targetBundleId?: string | null;
  presentation?: SurfacePresentation | null;
}) {
  if (presentation !== 'current-window') {
    return false;
  }

  const resolvedTargetBundleId = targetBundleId ?? companionBundleIds.main;
  return resolvedTargetBundleId !== runtimeBundleId;
}

export function isCompanionSurfaceRequestAlreadyActive({
  runtimeBundleId,
  activeSurfaceId,
  activeBundleId,
  requestSurfaceId,
  requestBundleId,
  requestPresentation,
}: {
  runtimeBundleId: string;
  activeSurfaceId: string;
  activeBundleId?: string | null;
  requestSurfaceId: string;
  requestBundleId?: string | null;
  requestPresentation?: SurfacePresentation | null;
}) {
  if (requestPresentation === 'new-window') {
    return false;
  }

  const resolvedRequestBundleId = requestBundleId ?? companionBundleIds.main;
  const resolvedActiveBundleId = activeBundleId ?? runtimeBundleId;

  return (
    requestSurfaceId === activeSurfaceId &&
    resolvedRequestBundleId === resolvedActiveBundleId &&
    resolvedRequestBundleId === runtimeBundleId
  );
}

export function resolveCompanionStartupTargetAutoOpen({
  runtimeBundleId,
  windowId,
  activeSurfaceId,
  activeBundleId,
  startupTarget,
  launchConfigAutoOpenRequested,
}: {
  runtimeBundleId: string;
  windowId: string;
  activeSurfaceId: string;
  activeBundleId?: string | null;
  startupTarget: CompanionStartupTarget | null;
  launchConfigAutoOpenRequested: boolean;
}): CompanionStartupAutoOpenDecision {
  if (runtimeBundleId !== companionBundleIds.main) {
    return {
      kind: 'skip',
      reason: 'not-main-bundle',
    };
  }

  if (windowId !== 'window.main') {
    return {
      kind: 'skip',
      reason: 'not-main-window',
    };
  }

  if (launchConfigAutoOpenRequested) {
    return {
      kind: 'skip',
      reason: 'launch-config',
    };
  }

  if (!startupTarget) {
    return {
      kind: 'skip',
      reason: 'no-target',
    };
  }

  if (
    isCompanionSurfaceRequestAlreadyActive({
      runtimeBundleId,
      activeSurfaceId,
      activeBundleId,
      requestSurfaceId: startupTarget.surfaceId,
      requestBundleId: startupTarget.bundleId,
      requestPresentation: startupTarget.presentation,
    })
  ) {
    return {
      kind: 'skip',
      reason: 'already-active',
    };
  }

  return {
    kind: 'open',
    request: createCompanionOpenSurfaceRequest(startupTarget),
  };
}

export function resolveCompanionRestoredSessionAutoOpen({
  runtimeBundleId,
  windowId,
  activeSurfaceId,
  activeBundleId,
  activePolicy,
  startupTarget,
  launchConfigAutoOpenRequested,
}: {
  runtimeBundleId: string;
  windowId: string;
  activeSurfaceId: string;
  activeBundleId?: string | null;
  activePolicy?: WindowPolicyId;
  startupTarget: CompanionStartupTarget | null;
  launchConfigAutoOpenRequested: boolean;
}): CompanionRestoredSessionAutoOpenDecision {
  if (runtimeBundleId !== companionBundleIds.main) {
    return {
      kind: 'skip',
      reason: 'not-main-bundle',
    };
  }

  if (windowId !== 'window.main') {
    return {
      kind: 'skip',
      reason: 'not-main-window',
    };
  }

  if (launchConfigAutoOpenRequested) {
    return {
      kind: 'skip',
      reason: 'launch-config',
    };
  }

  if (startupTarget) {
    return {
      kind: 'skip',
      reason: 'startup-target',
    };
  }

  if (
    typeof activeBundleId !== 'string' ||
    !activeBundleId ||
    activeBundleId === runtimeBundleId
  ) {
    return {
      kind: 'skip',
      reason: 'not-cross-bundle-session',
    };
  }

  return {
    kind: 'open',
    request: {
      surfaceId: activeSurfaceId,
      bundleId: activeBundleId,
      policy: activePolicy ?? 'main',
      presentation: 'current-window',
    },
  };
}
