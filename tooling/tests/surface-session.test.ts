import assert from 'node:assert/strict';
import {
  applyOpenSurfaceToSingleSurfaceSession,
  closeSessionTab,
  createSingleSurfaceSession,
  createSurfaceRegistry,
  defineSurface,
  registerSurfaceRegistry,
  resolveSurfaceSession,
  setActiveSessionTab,
} from '../../framework/surfaces/src/index';

export function run() {
  const registry = createSurfaceRegistry([
    defineSurface({surfaceId: 'companion.main', title: '主界面', defaultPolicy: 'main', Component: () => null}),
    defineSurface({surfaceId: 'companion.settings', title: '设置', defaultPolicy: 'settings', Component: () => null}),
  ]);
  const dispose = registerSurfaceRegistry(registry);

  try {
    const initialSession = createSingleSurfaceSession({
      windowId: 'window.main',
      surfaceId: 'companion.main',
      windowPolicy: 'main',
    });

    const withSettingsTab = applyOpenSurfaceToSingleSurfaceSession(initialSession, {
      surfaceId: 'companion.settings',
      presentation: 'tab',
    });
    const reopenedSettings = applyOpenSurfaceToSingleSurfaceSession(withSettingsTab, {
      surfaceId: 'companion.settings',
      presentation: 'tab',
    });

    assert.equal(withSettingsTab.tabs.length, 2);
    assert.equal(reopenedSettings.tabs.length, 2);
    assert.equal(reopenedSettings.activeTabId, 'tab:companion.settings:1');

    const resolved = resolveSurfaceSession(reopenedSettings);
    assert.equal(resolved.activeTab.title, '设置');
    assert.equal(resolved.activeTab.policy, 'settings');

    const afterClose = closeSessionTab(withSettingsTab, 'tab:companion.settings:1');
    assert.equal(afterClose.tabs.length, 1);
    assert.equal(afterClose.activeTabId, 'tab:companion.main:1');

    // setActiveSessionTab: switch to existing tab
    const switchedToSettings = setActiveSessionTab(withSettingsTab, 'tab:companion.settings:1');
    assert.equal(switchedToSettings.activeTabId, 'tab:companion.settings:1');

    // setActiveSessionTab: no-op when target is already active
    const noOp = setActiveSessionTab(withSettingsTab, withSettingsTab.activeTabId);
    assert.equal(noOp, withSettingsTab);

    // setActiveSessionTab: no-op when tabId does not exist
    const noOpMissing = setActiveSessionTab(withSettingsTab, 'tab:nonexistent:1');
    assert.equal(noOpMissing, withSettingsTab);

    // applyOpenSurfaceToSingleSurfaceSession: current-window replaces active tab in-place
    const navigatedInWindow = applyOpenSurfaceToSingleSurfaceSession(initialSession, {
      surfaceId: 'companion.settings',
      presentation: 'current-window',
    });
    assert.equal(navigatedInWindow.tabs.length, 1);
    assert.equal(navigatedInWindow.tabs[0].surfaceId, 'companion.settings');
    assert.equal(navigatedInWindow.tabs[0].tabId, 'tab:companion.main:1');
    assert.equal(navigatedInWindow.activeTabId, 'tab:companion.main:1');

    // applyOpenSurfaceToSingleSurfaceSession: re-activates existing tab when presentation=tab
    const withSettingsAgain = applyOpenSurfaceToSingleSurfaceSession(withSettingsTab, {
      surfaceId: 'companion.settings',
      presentation: 'tab',
    });
    assert.equal(withSettingsAgain.tabs.length, 2);
    assert.equal(withSettingsAgain.activeTabId, 'tab:companion.settings:1');
  } finally {
    dispose();
  }
}
