import assert from 'node:assert/strict';
import {
  createAgentTerminalTimelineEntry,
  createNativeAgentTerminalRuntime,
  type AgentTerminalSessionEvent,
  type NativeAgentTerminalBridge,
} from '../../framework/agent-runtime/src/terminal-core';

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return {promise, resolve, reject};
}

export async function run() {
  let subscriptionRemoved = 0;
  let openRequestJson = '';
  const cancelledSessionIds: string[] = [];
  const stdinWrites: Array<{sessionId: string; text: string}> = [];
  const surfacedEvents: AgentTerminalSessionEvent[] = [];
  const surfacedErrors: Array<Error & {code?: string}> = [];
  const openDeferred = createDeferredPromise<string>();

  const bridge: NativeAgentTerminalBridge = {
    openSession: async requestJson => {
      openRequestJson = requestJson;
      return openDeferred.promise;
    },
    cancelSession: async sessionId => {
      cancelledSessionIds.push(sessionId);
    },
    writeSessionInput: async (sessionId, text) => {
      stdinWrites.push({sessionId, text});
    },
    addListener() {},
    removeListeners() {},
  };

  const runtime = createNativeAgentTerminalRuntime({
    platformOs: 'windows',
    nativeAgentTerminalBridge: bridge,
    subscribeToNativeEvents() {
      return {
        remove() {
          subscriptionRemoved += 1;
        },
      };
    },
  });

  assert.equal(runtime.isRuntimeAvailable(), true);

  const handlePromise = runtime.openSession(
    {
      command: 'git status',
      cwd: 'opapp-frontend',
      env: {
        FOO: 'bar',
      },
    },
    {
      onEvent(event) {
        surfacedEvents.push(event);
      },
      onError(error) {
        surfacedErrors.push(error);
      },
    },
  );

  runtime.dispatchNativePayload({
    sessionId: 'terminal-1',
    type: 'event',
    event: 'started',
    cwd: 'D:/code/opappdev',
    command: 'git status',
    createdAt: '2026-04-02T12:00:00.000Z',
  });

  openDeferred.resolve('terminal-1');
  const handle = await handlePromise;
  assert.equal(handle.sessionId, 'terminal-1');

  assert.deepEqual(JSON.parse(openRequestJson), {
    command: 'git status',
    cwd: 'opapp-frontend',
    env: {
      FOO: 'bar',
    },
    shell: 'powershell',
  });

  await handle.sendInput('y\n');
  assert.deepEqual(stdinWrites, [{sessionId: 'terminal-1', text: 'y\n'}]);

  runtime.dispatchNativePayload({
    sessionId: 'terminal-1',
    type: 'event',
    event: 'stdout',
    text: 'working tree clean',
    cwd: 'D:/code/opappdev',
    command: 'git status',
    createdAt: '2026-04-02T12:00:01.000Z',
  });
  runtime.dispatchNativePayload({
    sessionId: 'terminal-1',
    type: 'event',
    event: 'exit',
    cwd: 'D:/code/opappdev',
    command: 'git status',
    exitCode: 0,
    createdAt: '2026-04-02T12:00:02.000Z',
  });

  assert.deepEqual(
    surfacedEvents.map(event => event.event),
    ['started', 'stdout', 'exit'],
  );
  assert.equal(surfacedEvents[1]?.text, 'working tree clean');
  assert.equal(surfacedEvents[2]?.exitCode, 0);
  assert.equal(subscriptionRemoved, 1);

  const timelineEntry = createAgentTerminalTimelineEntry({
    entryId: 'evt-1',
    runId: 'run-1',
    seq: 7,
    event: surfacedEvents[1]!,
  });
  assert.deepEqual(timelineEntry, {
    entryId: 'evt-1',
    runId: 'run-1',
    seq: 7,
    kind: 'terminal-event',
    sessionId: 'terminal-1',
    event: 'stdout',
    text: 'working tree clean',
    cwd: 'D:/code/opappdev',
    command: 'git status',
    exitCode: null,
    createdAt: '2026-04-02T12:00:01.000Z',
  });

  const errorBridge: NativeAgentTerminalBridge = {
    ...bridge,
    openSession: async () => 'terminal-2',
  };

  const errorRuntime = createNativeAgentTerminalRuntime({
    platformOs: 'windows',
    nativeAgentTerminalBridge: errorBridge,
    subscribeToNativeEvents() {
      return {
        remove() {},
      };
    },
  });

  const failingHandle = await errorRuntime.openSession(
    {
      command: 'git rev-parse --show-toplevel',
      shell: 'cmd',
    },
    {
      onError(error) {
        surfacedErrors.push(error);
      },
    },
  );

  errorRuntime.dispatchNativePayload({
    sessionId: 'terminal-2',
    type: 'error',
    error: 'native launch failed',
    code: 'ERR_AGENT_TERMINAL_NATIVE',
  });

  await failingHandle.cancel();
  assert.deepEqual(cancelledSessionIds, ['terminal-2']);

  const surfacedError = surfacedErrors.at(-1);
  assert.ok(surfacedError);
  assert.equal(surfacedError?.message, 'native launch failed');
  assert.equal(surfacedError?.code, 'ERR_AGENT_TERMINAL_NATIVE');

  await assert.rejects(
    runtime.openSession({command: '   '}),
    /command is required/i,
  );
}
