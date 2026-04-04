import type {SurfaceRegistry} from '@opapp/framework-surfaces';
import rawSurfaceIds from './surface-ids.json';

export type CompanionBundleConfig = {
  bundleId: string;
  defaultSurfaceId: string;
  surfaceIds: string[];
  surfaceRegistry: SurfaceRegistry;
};

export const companionSurfaceIds = rawSurfaceIds as Record<string, string>;
