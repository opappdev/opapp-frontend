export {createCompanionApp} from './createCompanionApp';
export {useCompanionStartupTarget} from './useCompanionStartupTarget';
export {
  areCompanionTargetsEqual,
  buildDiscoveredCompanionLaunchTargets,
  companionBundleIds,
  companionLaunchTargets,
  companionRuntimeBundleList,
  companionStartupTargetFile,
  createCompanionOpenSurfaceRequest,
  defaultCompanionStartupTarget,
  findCompanionLaunchTarget,
  getCompanionRuntimeBundle,
  isCompanionStartupTarget,
  isCompanionSurfaceRequestAlreadyActive,
  parseCompanionStartupTarget,
  resolveCompanionRestoredSessionAutoOpen,
  resolveCompanionStartupTargetAutoOpen,
  resolveCompanionStartupTargetMigration,
  shouldCompanionStartupTargetWaitForBundleReload,
} from './companion-runtime';
export {companionSurfaceIds} from './bundle-config';
export type {CompanionBundleConfig} from './bundle-config';
export type {
  CompanionBundleId,
  CompanionLaunchTarget,
  CompanionRestoredSessionAutoOpenDecision,
  CompanionRuntimeBundle,
  CompanionStartupAutoOpenDecision,
  CompanionStartupTarget,
  CompanionStartupTargetMigrationDecision,
} from './companion-runtime';
