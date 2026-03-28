import assert from 'node:assert/strict';
import {
  defaultWindowPreferences,
  normalizeWindowPreferences,
  parseWindowPreferencesPayload,
  parseWindowSessionPayload,
  serializeWindowSessionPayload,
} from '../../framework/windowing/src/model';

export function run() {
  const normalized = normalizeWindowPreferences({
    mainWindowMode: 'unknown' as never,
    settingsWindowMode: 'compact',
    settingsPresentation: 'side-panel' as never,
  });

  assert.deepEqual(normalized, {
    mainWindowMode: defaultWindowPreferences.mainWindowMode,
    settingsWindowMode: 'compact',
    settingsPresentation: defaultWindowPreferences.settingsPresentation,
  });

  const fromString = parseWindowPreferencesPayload('{"mainWindowMode":"wide","settingsWindowMode":"compact","settingsPresentation":"new-window"}');
  const fromObject = parseWindowPreferencesPayload({mainWindowMode: 'balanced'});

  assert.equal(fromString.mainWindowMode, 'wide');
  assert.equal(fromString.settingsPresentation, 'new-window');
  assert.equal(fromObject.settingsWindowMode, defaultWindowPreferences.settingsWindowMode);

  const parsed = parseWindowSessionPayload(
    JSON.stringify({
      activeTabId: 'tab:settings:1',
      tabs: [
        {tabId: 'tab:settings:1', surfaceId: 'companion.settings', policy: 'compact'},
        {surfaceId: 'broken'},
      ],
    }),
    'window.main',
  );

  assert.ok(parsed);
  assert.equal(parsed?.windowId, 'window.main');
  assert.equal(parsed?.tabs.length, 1);
  assert.equal(parsed?.tabs[0].policy, 'main');

  // parseWindowSessionPayload: uses windowId from payload when present
  const parsedWithWindowId = parseWindowSessionPayload(
    JSON.stringify({
      windowId: 'window.custom',
      activeTabId: 'tab:companion.main:1',
      tabs: [{tabId: 'tab:companion.main:1', surfaceId: 'companion.main'}],
    }),
    'window.fallback',
  );
  assert.ok(parsedWithWindowId);
  assert.equal(parsedWithWindowId.windowId, 'window.custom');

  // parseWindowSessionPayload: returns null for empty/blank/null input
  assert.equal(parseWindowSessionPayload('', 'window.x'), null);
  assert.equal(parseWindowSessionPayload('   ', 'window.x'), null);
  assert.equal(parseWindowSessionPayload(null, 'window.x'), null);

  // serializeWindowSessionPayload + roundtrip
  const originalSession = {
    windowId: 'window.main',
    activeTabId: 'tab:companion.main:1',
    tabs: [
      {tabId: 'tab:companion.main:1', surfaceId: 'companion.main'},
      {tabId: 'tab:companion.settings:1', surfaceId: 'companion.settings', policy: 'settings' as const},
    ],
  };
  const serialized = serializeWindowSessionPayload(originalSession);
  assert.equal(typeof serialized, 'string');
  const roundtripped = parseWindowSessionPayload(serialized, 'window.fallback');
  assert.ok(roundtripped);
  assert.equal(roundtripped.windowId, 'window.main');
  assert.equal(roundtripped.tabs.length, 2);
  assert.equal(roundtripped.activeTabId, 'tab:companion.main:1');
  assert.equal(roundtripped.tabs[1].surfaceId, 'companion.settings');
  assert.equal(roundtripped.tabs[1].policy, 'settings');
}
