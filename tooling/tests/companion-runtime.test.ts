import assert from 'node:assert/strict';
import {
  companionBundleIds,
  companionLaunchTargets,
  getCompanionRuntimeBundle,
  resolveCompanionRestoredSessionAutoOpen,
  resolveCompanionStartupTargetAutoOpen,
} from '../../apps/companion-app/src/companion-runtime';

export function run() {
  assert.deepEqual(getCompanionRuntimeBundle(companionBundleIds.chat), {
    bundleId: companionBundleIds.chat,
    defaultSurfaceId: 'companion.chat.main',
    entryFile: 'index.chat.js',
    bundleFile: 'index.chat.windows.bundle',
    platforms: ['windows'],
    surfaces: ['companion.chat.main'],
  });
  assert.equal(
    companionLaunchTargets.some(
      target =>
        target.bundleId === companionBundleIds.chat &&
        target.surfaceId === 'companion.chat.main',
    ),
    true,
  );

  const restoredSessionDecision = resolveCompanionRestoredSessionAutoOpen({
    runtimeBundleId: 'opapp.companion.main',
    windowId: 'window.main',
    activeSurfaceId: 'hbr.challenge-advisor',
    activeBundleId: 'opapp.hbr.workspace',
    activePolicy: 'main',
    startupTarget: null,
    launchConfigAutoOpenRequested: false,
  });

  assert.deepEqual(restoredSessionDecision, {
    kind: 'open',
    request: {
      surfaceId: 'hbr.challenge-advisor',
      bundleId: 'opapp.hbr.workspace',
      policy: 'main',
      presentation: 'current-window',
    },
  });

  assert.deepEqual(
    resolveCompanionRestoredSessionAutoOpen({
      runtimeBundleId: 'opapp.companion.main',
      windowId: 'window.main',
      activeSurfaceId: 'hbr.challenge-advisor',
      activeBundleId: 'opapp.hbr.workspace',
      activePolicy: 'main',
      startupTarget: {
        surfaceId: 'companion.settings',
        bundleId: 'opapp.companion.main',
        policy: 'settings',
        presentation: 'current-window',
      },
      launchConfigAutoOpenRequested: false,
    }),
    {
      kind: 'skip',
      reason: 'startup-target',
    },
  );

  assert.deepEqual(
    resolveCompanionRestoredSessionAutoOpen({
      runtimeBundleId: 'opapp.companion.main',
      windowId: 'window.main',
      activeSurfaceId: 'companion.main',
      activeBundleId: 'opapp.companion.main',
      activePolicy: 'main',
      startupTarget: null,
      launchConfigAutoOpenRequested: false,
    }),
    {
      kind: 'skip',
      reason: 'not-cross-bundle-session',
    },
  );

  const startupTargetDecision = resolveCompanionStartupTargetAutoOpen({
    runtimeBundleId: 'opapp.companion.main',
    windowId: 'window.main',
    activeSurfaceId: 'hbr.challenge-advisor',
    activeBundleId: 'opapp.hbr.workspace',
    startupTarget: {
      surfaceId: 'companion.settings',
      bundleId: 'opapp.companion.main',
      policy: 'settings',
      presentation: 'current-window',
    },
    launchConfigAutoOpenRequested: false,
  });

  assert.equal(startupTargetDecision.kind, 'open');
  if (startupTargetDecision.kind !== 'open') {
    throw new Error('Expected startup target auto-open decision to resolve open.');
  }

  assert.deepEqual(startupTargetDecision.request, {
    surfaceId: 'companion.settings',
    bundleId: undefined,
    policy: 'settings',
    presentation: 'current-window',
  });
}
