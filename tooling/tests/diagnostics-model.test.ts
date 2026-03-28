import assert from 'node:assert/strict';
import {
  createDiagnosticPayload,
  getDiagnosticContext,
  inferDiagnosticCategory,
  resetDiagnosticContext,
  setDiagnosticContext,
} from '../../framework/diagnostics/src/model';

export function run() {
  resetDiagnosticContext();
  setDiagnosticContext({windowId: 'window.main', surfaceId: 'companion.main'});
  setDiagnosticContext({sessionId: 'window.main:tab:main:1', transient: ''});

  assert.deepEqual(getDiagnosticContext(), {
    windowId: 'window.main',
    surfaceId: 'companion.main',
    sessionId: 'window.main:tab:main:1',
  });

  const payload = createDiagnosticPayload({
    level: 'error',
    event: 'tactical.settings.open.failed',
    platform: 'windows',
    fields: {attempt: 2},
    error: new Error('boom'),
  });

  assert.equal(payload.category, 'interaction');
  assert.equal(payload.context?.windowId, 'window.main');
  assert.equal(payload.attempt, 2);
  assert.equal(payload.error?.message, 'boom');

  assert.equal(inferDiagnosticCategory('global.js-error', 'fatal'), 'exception');
  assert.equal(inferDiagnosticCategory('tactical.style.toggle.press', 'info'), 'interaction');

  resetDiagnosticContext();
}
