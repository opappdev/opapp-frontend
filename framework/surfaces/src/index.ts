import React from 'react';
import type {
  OpenSurfaceRequest,
  SurfaceDescriptor,
  SurfaceId,
  SurfaceLaunchProps,
  WindowPolicyId,
  WindowSessionDescriptor,
  WindowSessionTabDescriptor,
} from '@opapp/contracts-windowing';

export type SurfaceComponent<Props extends object = Record<string, unknown>> =
  React.ComponentType<Props>;

export type RegisteredSurface<Props extends object = Record<string, unknown>> =
  SurfaceDescriptor & {
    Component: SurfaceComponent<Props>;
  };

export type ResolvedSurfaceSessionTab = WindowSessionTabDescriptor & {
  title: string;
  policy: WindowPolicyId;
  isActive: boolean;
};

export type ResolvedSurfaceSession = {
  windowId: string;
  activeTabId: string;
  tabs: ResolvedSurfaceSessionTab[];
  activeTab: ResolvedSurfaceSessionTab;
};

export function describeSurfaceSession(session: ResolvedSurfaceSession) {
  return session.tabs.map(tab => `${tab.tabId}:${tab.surfaceId}`).join(',');
}

export function defineSurface<Props extends object = Record<string, unknown>>(
  surface: RegisteredSurface<Props>,
): RegisteredSurface<Props> {
  return surface;
}

export type SurfaceRegistry = ReturnType<typeof createSurfaceRegistry>;

const DEFAULT_WINDOW_ID = 'window.current';
const registeredSurfacesById = new Map<SurfaceId, SurfaceDescriptor>();

type SessionTabOptions = Pick<
  WindowSessionTabDescriptor,
  'initialProps' | 'bundleId' | 'policy' | 'title'
> &
  Partial<Pick<WindowSessionTabDescriptor, 'tabId'>>;

function createSessionTab(
  surfaceId: SurfaceId,
  options?: SessionTabOptions,
): WindowSessionTabDescriptor {
  return {
    tabId: options?.tabId ?? `tab:${surfaceId}:1`,
    surfaceId,
    title: options?.title ?? resolveSurfaceTitle(surfaceId),
    policy: options?.policy,
    initialProps: options?.initialProps,
    bundleId: options?.bundleId,
  };
}

function createNextTabId(
  session: WindowSessionDescriptor,
  surfaceId: SurfaceId,
) {
  const nextIndex =
    session.tabs.filter(tab => tab.surfaceId === surfaceId).length + 1;

  return `tab:${surfaceId}:${nextIndex}`;
}

function findExistingSessionTab(
  session: WindowSessionDescriptor,
  request: OpenSurfaceRequest,
) {
  return session.tabs.find(tab => {
    if (tab.surfaceId !== request.surfaceId) {
      return false;
    }

    if ((tab.bundleId ?? undefined) !== (request.bundleId ?? undefined)) {
      return false;
    }

    if ((tab.policy ?? undefined) !== (request.policy ?? undefined)) {
      return false;
    }

    return true;
  });
}

export function createSurfaceRegistry(
  surfaces: readonly RegisteredSurface[],
) {
  const byId = new Map<SurfaceId, RegisteredSurface>();

  for (const surface of surfaces) {
    if (byId.has(surface.surfaceId)) {
      throw new Error(`Duplicate surface registration: ${surface.surfaceId}`);
    }

    byId.set(surface.surfaceId, surface);
  }

  return {
    list(): RegisteredSurface[] {
      return [...byId.values()];
    },
    get(surfaceId: SurfaceId) {
      return byId.get(surfaceId);
    },
    resolve(launchProps: SurfaceLaunchProps) {
      const requestedSurfaceId = launchProps.surfaceId ?? surfaces[0]?.surfaceId;

      if (!requestedSurfaceId) {
        throw new Error('Surface registry has no registered surfaces.');
      }

      const surface = byId.get(requestedSurfaceId);

      if (!surface) {
        throw new Error(`Unknown surface: ${requestedSurfaceId}`);
      }

      return surface;
    },
  };
}

export function registerSurfaceRegistry(surfaceRegistry: SurfaceRegistry) {
  const surfaces = surfaceRegistry.list();

  for (const surface of surfaces) {
    registeredSurfacesById.set(surface.surfaceId, surface);
  }

  return () => {
    for (const surface of surfaces) {
      if (registeredSurfacesById.get(surface.surfaceId) === surface) {
        registeredSurfacesById.delete(surface.surfaceId);
      }
    }
  };
}

export function getRegisteredSurfaceDescriptor(surfaceId: SurfaceId) {
  return registeredSurfacesById.get(surfaceId);
}

export function resolveSurfaceTitle(surfaceId: SurfaceId, fallback?: string) {
  return getRegisteredSurfaceDescriptor(surfaceId)?.title ?? fallback ?? surfaceId;
}

export function resolveSurfaceWindowPolicy(
  surfaceId: SurfaceId,
  requestedPolicy?: WindowPolicyId,
  fallbackPolicy: WindowPolicyId = 'main',
): WindowPolicyId {
  return (
    requestedPolicy ??
    getRegisteredSurfaceDescriptor(surfaceId)?.defaultPolicy ??
    fallbackPolicy
  );
}

export function resolveSurfaceSession(
  session: WindowSessionDescriptor,
  fallbackPolicy: WindowPolicyId = 'main',
): ResolvedSurfaceSession {
  const tabs = session.tabs.map(tab => ({
    ...tab,
    title: resolveSurfaceTitle(tab.surfaceId, tab.title),
    policy: resolveSurfaceWindowPolicy(
      tab.surfaceId,
      tab.policy,
      fallbackPolicy,
    ),
    isActive: tab.tabId === session.activeTabId,
  }));

  const activeTab = tabs.find(tab => tab.isActive);

  if (!activeTab) {
    throw new Error(`Window session ${session.windowId} has no active tab.`);
  }

  return {
    windowId: session.windowId,
    activeTabId: session.activeTabId,
    tabs,
    activeTab,
  };
}

export function createSingleSurfaceSession(
  launchProps: SurfaceLaunchProps,
): WindowSessionDescriptor {
  const surfaceId = launchProps.surfaceId;

  if (!surfaceId) {
    throw new Error('Single surface session requires an initial surfaceId.');
  }

  const activeTab = createSessionTab(surfaceId, {
    tabId: `tab:${surfaceId}:1`,
    policy: launchProps.windowPolicy,
    initialProps: launchProps.initialProps,
    bundleId: launchProps.bundleId,
  });

  return {
    windowId: launchProps.windowId ?? DEFAULT_WINDOW_ID,
    tabs: [activeTab],
    activeTabId: activeTab.tabId,
  };
}

export function getActiveSessionTab(
  session: WindowSessionDescriptor,
): WindowSessionTabDescriptor {
  const activeTab = session.tabs.find(tab => tab.tabId === session.activeTabId);

  if (!activeTab) {
    throw new Error(`Window session ${session.windowId} has no active tab.`);
  }

  return activeTab;
}

export function setActiveSessionTab(
  session: WindowSessionDescriptor,
  tabId: string,
): WindowSessionDescriptor {
  const hasRequestedTab = session.tabs.some(tab => tab.tabId === tabId);

  if (!hasRequestedTab || session.activeTabId === tabId) {
    return session;
  }

  return {
    ...session,
    activeTabId: tabId,
  };
}

export function closeSessionTab(
  session: WindowSessionDescriptor,
  tabId: string,
): WindowSessionDescriptor {
  if (session.tabs.length <= 1) {
    return session;
  }

  const closingIndex = session.tabs.findIndex(tab => tab.tabId === tabId);

  if (closingIndex === -1) {
    return session;
  }

  const remainingTabs = session.tabs.filter(tab => tab.tabId !== tabId);

  if (remainingTabs.length === 0) {
    return session;
  }

  if (session.activeTabId !== tabId) {
    return {
      ...session,
      tabs: remainingTabs,
    };
  }

  const nextActiveTab =
    remainingTabs[closingIndex] ?? remainingTabs[closingIndex - 1] ?? remainingTabs[0];

  return {
    ...session,
    tabs: remainingTabs,
    activeTabId: nextActiveTab.tabId,
  };
}

export function applyOpenSurfaceToSingleSurfaceSession(
  session: WindowSessionDescriptor,
  request: OpenSurfaceRequest,
): WindowSessionDescriptor {
  if (request.presentation === 'tab') {
    const existingTab = findExistingSessionTab(session, request);

    if (existingTab) {
      return {
        ...session,
        activeTabId: existingTab.tabId,
        tabs: session.tabs.map(tab =>
          tab.tabId === existingTab.tabId
            ? {
                ...tab,
                title:
                  request.surfaceId === tab.surfaceId
                    ? tab.title
                    : resolveSurfaceTitle(request.surfaceId),
                policy: request.policy ?? tab.policy,
                initialProps: request.initialProps ?? tab.initialProps,
                bundleId: request.bundleId ?? tab.bundleId,
              }
            : tab,
        ),
      };
    }

    const nextTab = createSessionTab(request.surfaceId, {
      tabId: createNextTabId(session, request.surfaceId),
      policy: request.policy,
      initialProps: request.initialProps,
      bundleId: request.bundleId,
    });

    return {
      ...session,
      tabs: [...session.tabs, nextTab],
      activeTabId: nextTab.tabId,
    };
  }

  const activeTab = getActiveSessionTab(session);
  const nextTab = createSessionTab(request.surfaceId, {
    tabId: activeTab.tabId,
    title: resolveSurfaceTitle(request.surfaceId, activeTab.title),
    policy: request.policy,
    initialProps: request.initialProps,
    bundleId: request.bundleId,
  });

  return {
    ...session,
    tabs: session.tabs.map(tab => (tab.tabId === activeTab.tabId ? nextTab : tab)),
    activeTabId: nextTab.tabId,
  };
}
