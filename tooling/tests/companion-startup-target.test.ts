import assert from 'node:assert/strict';
import {
  areCompanionTargetsEqual,
  buildDiscoveredCompanionLaunchTargets,
  companionBundleIds,
  defaultCompanionStartupTarget,
  isCompanionSurfaceRequestAlreadyActive,
  parseCompanionStartupTarget,
  resolveCompanionStartupTargetMigration,
  resolveCompanionStartupTargetAutoOpen,
  shouldCompanionStartupTargetWaitForBundleReload,
} from '../../framework/companion-runtime/src/companion-runtime';

export function run() {
  const privateSurfaceId = 'private.surface';
  const privateBundleId = 'opapp.private.bundle';
  const privateTarget = {
    ...defaultCompanionStartupTarget,
    surfaceId: privateSurfaceId,
    bundleId: privateBundleId,
  };

  assert.equal(
    isCompanionSurfaceRequestAlreadyActive({
      runtimeBundleId: companionBundleIds.main,
      activeSurfaceId: 'companion.main',
      activeBundleId: companionBundleIds.main,
      requestSurfaceId: 'companion.main',
      requestBundleId: companionBundleIds.main,
      requestPresentation: 'current-window',
    }),
    true,
  );

  assert.equal(
    isCompanionSurfaceRequestAlreadyActive({
      runtimeBundleId: companionBundleIds.main,
      activeSurfaceId: privateSurfaceId,
      activeBundleId: privateBundleId,
      requestSurfaceId: privateSurfaceId,
      requestBundleId: privateBundleId,
      requestPresentation: 'current-window',
    }),
    false,
  );

  assert.equal(
    isCompanionSurfaceRequestAlreadyActive({
      runtimeBundleId: companionBundleIds.main,
      activeSurfaceId: 'companion.settings',
      activeBundleId: companionBundleIds.main,
      requestSurfaceId: 'companion.settings',
      requestBundleId: companionBundleIds.main,
      requestPresentation: 'new-window',
    }),
    false,
  );

  const launcherOverrideDecision = resolveCompanionStartupTargetAutoOpen({
    runtimeBundleId: companionBundleIds.main,
    windowId: 'window.main',
    activeSurfaceId: 'companion.settings',
    activeBundleId: companionBundleIds.main,
    startupTarget: defaultCompanionStartupTarget,
    launchConfigAutoOpenRequested: false,
  });
  assert.deepEqual(launcherOverrideDecision, {
    kind: 'open',
    request: {
      surfaceId: 'companion.main',
      bundleId: undefined,
      policy: 'main',
      presentation: 'current-window',
    },
  });

  const alreadyActiveDecision = resolveCompanionStartupTargetAutoOpen({
    runtimeBundleId: companionBundleIds.main,
    windowId: 'window.main',
    activeSurfaceId: 'companion.main',
    activeBundleId: companionBundleIds.main,
    startupTarget: defaultCompanionStartupTarget,
    launchConfigAutoOpenRequested: false,
  });
  assert.deepEqual(alreadyActiveDecision, {
    kind: 'skip',
    reason: 'already-active',
  });

  const launchConfigDecision = resolveCompanionStartupTargetAutoOpen({
    runtimeBundleId: companionBundleIds.main,
    windowId: 'window.main',
    activeSurfaceId: 'companion.settings',
    activeBundleId: companionBundleIds.main,
    startupTarget: defaultCompanionStartupTarget,
    launchConfigAutoOpenRequested: true,
  });
  assert.deepEqual(launchConfigDecision, {
    kind: 'skip',
    reason: 'launch-config',
  });

  assert.equal(
    areCompanionTargetsEqual(privateTarget, defaultCompanionStartupTarget),
    false,
  );
  assert.deepEqual(
    buildDiscoveredCompanionLaunchTargets([
      {
        bundleId: privateBundleId,
        surfaceIds: [privateSurfaceId, '', privateSurfaceId],
      },
      {
        bundleId: companionBundleIds.main,
        surfaceIds: ['companion.main'],
      },
    ]),
    [
      {
        targetId: `discovered:${privateBundleId}:${privateSurfaceId}`,
        title: privateSurfaceId,
        description:
          '这是从远端应用清单里发现的入口；当本机已经具备这个应用时，可以把它设为默认启动。',
        surfaceId: privateSurfaceId,
        bundleId: privateBundleId,
        policy: 'main',
        presentation: 'current-window',
      },
    ],
  );
  assert.deepEqual(
    parseCompanionStartupTarget(JSON.stringify(privateTarget)),
    privateTarget,
  );
  assert.deepEqual(
    resolveCompanionStartupTargetMigration({
      storedStartupTarget: null,
      legacyStartupTarget: defaultCompanionStartupTarget,
    }),
    {
      kind: 'migrate-legacy',
      target: defaultCompanionStartupTarget,
    },
  );
  assert.deepEqual(
    resolveCompanionStartupTargetMigration({
      storedStartupTarget: null,
      legacyStartupTarget: privateTarget,
    }),
    {
      kind: 'migrate-legacy',
      target: privateTarget,
    },
  );
  assert.deepEqual(
    resolveCompanionStartupTargetMigration({
      storedStartupTarget: privateTarget,
      legacyStartupTarget: defaultCompanionStartupTarget,
    }),
    {
      kind: 'cleanup-legacy',
    },
  );
  assert.equal(
    shouldCompanionStartupTargetWaitForBundleReload({
      runtimeBundleId: companionBundleIds.main,
      targetBundleId: undefined,
      presentation: 'current-window',
    }),
    false,
  );
  assert.equal(
    shouldCompanionStartupTargetWaitForBundleReload({
      runtimeBundleId: companionBundleIds.main,
      targetBundleId: privateBundleId,
      presentation: 'current-window',
    }),
    true,
  );
  assert.equal(
    shouldCompanionStartupTargetWaitForBundleReload({
      runtimeBundleId: companionBundleIds.main,
      targetBundleId: privateBundleId,
      presentation: 'new-window',
    }),
    false,
  );
}
