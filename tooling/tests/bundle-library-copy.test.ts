import assert from 'node:assert/strict';
import {appI18n} from '../../framework/i18n/src/index';

export function run() {
  assert.equal(appI18n.surfaces.launcher, '应用库与更新');
  assert.equal(appI18n.bundleLauncher.frame.title, '应用库与更新');
  assert.equal(appI18n.bundleLauncher.groups.updates, '可更新');
  assert.equal(appI18n.bundleLauncher.details.bundleId, 'Bundle ID');

  const primaryCopy = [
    appI18n.bundleLauncher.frame.title,
    appI18n.bundleLauncher.sections.libraryTitle,
    appI18n.bundleLauncher.sections.detailTitle,
    appI18n.bundleLauncher.service.label,
    appI18n.bundleLauncher.library.states.installed,
    appI18n.bundleLauncher.library.states.installAvailable,
    appI18n.bundleLauncher.library.notes.localOnly,
  ].join(' ');

  assert.equal(primaryCopy.includes('对账'), false);
  assert.equal(primaryCopy.includes('staged'), false);
  assert.equal(primaryCopy.includes('sourceKind'), false);
}
