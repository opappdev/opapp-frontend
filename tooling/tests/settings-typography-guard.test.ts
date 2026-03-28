import {runTypographyGuard} from './typography-guard';

export function run() {
  runTypographyGuard({
    registryName: 'settingsTypographyExceptions',
    targetFilePath: 'capabilities/settings/src/index.tsx',
    targetLabel: 'settings',
  });
}
