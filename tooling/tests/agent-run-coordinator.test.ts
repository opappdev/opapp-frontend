import assert from 'node:assert/strict';
import {
  parsePersistedAgentRunDocument,
  parsePersistedAgentThreadDocument,
  parsePersistedAgentThreadIndex,
} from '../../framework/agent-runtime/src/model';
import {
  createPersistedAgentTerminalRuntime,
} from '../../framework/agent-runtime/src/run-coordinator';
import {
  type AgentTerminalSessionEvent,
} from '../../framework/agent-runtime/src/terminal-core';
import {
  agentThreadIndexPath,
  buildAgentRunDocumentPath,
  buildAgentThreadDocumentPath,
} from '../../framework/agent-runtime/src/storage';

function createIdFactory(values: string[]) {
  let index = 0;
  return function nextId() {
    const value = values[index];
    index += 1;
    if (!value) {
      throw new Error('Test id factory exhausted.');
    }

    return value;
  };
}

function createClock(values: string[]) {
  let index = 0;
  return function nextTimestamp() {
    const value = values[index];
    index += 1;
    if (!value) {
      throw new Error('Test clock exhausted.');
    }

    return value;
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

export async function run() {
  const files = new Map<string, string>();
  let listener:
    | {
        onEvent?: (event: AgentTerminalSessionEvent) => void;
        onError?: (error: Error & {code?: string}) => void;
      }
    | undefined;
  let cancelCount = 0;
  let stdinWrites: string[] = [];

  const runtime = createPersistedAgentTerminalRuntime({
    readUserFile: async path => files.get(path) ?? null,
    writeUserFile: async (path, content) => {
      files.set(path, content);
      return true;
    },
    getTrustedWorkspaceTarget: async () => ({
      rootPath: 'D:/code/opappdev',
      displayName: 'opappdev',
      trusted: true,
    }),
    openAgentTerminalSession: async (_options, nextListener) => {
      listener = nextListener;
      return {
        sessionId: 'terminal-1',
        async cancel() {
          cancelCount += 1;
        },
        async sendInput(text) {
          stdinWrites.push(text);
        },
      };
    },
    now: createClock([
      '2026-04-03T01:00:00.000Z',
      '2026-04-03T01:00:00.050Z',
    ]),
    createId: createIdFactory([
      'thread-1',
      'run-1',
      'entry-1',
      'entry-2',
      'entry-3',
      'entry-4',
    ]),
  });

  const handle = await runtime.openRun({
    title: 'Git Status',
    goal: 'Inspect frontend repo state',
    command: 'git status',
    cwd: 'opapp-frontend',
  });

  await flushMicrotasks();
  assert.equal(handle.threadId, 'thread-1');
  assert.equal(handle.runId, 'run-1');
  assert.equal(handle.sessionId, 'terminal-1');

  listener?.onEvent?.({
    sessionId: 'terminal-1',
    event: 'started',
    cwd: 'D:/code/opappdev/opapp-frontend',
    command: 'git status',
    exitCode: null,
    text: null,
    createdAt: '2026-04-03T01:00:01.000Z',
  });
  listener?.onEvent?.({
    sessionId: 'terminal-1',
    event: 'stdout',
    cwd: 'D:/code/opappdev/opapp-frontend',
    command: 'git status',
    text: 'working tree clean\n',
    exitCode: null,
    createdAt: '2026-04-03T01:00:02.000Z',
  });

  await handle.sendInput('q\n');
  listener?.onEvent?.({
    sessionId: 'terminal-1',
    event: 'exit',
    cwd: 'D:/code/opappdev/opapp-frontend',
    command: 'git status',
    exitCode: 0,
    text: null,
    createdAt: '2026-04-03T01:00:03.000Z',
  });

  const settledDocument = await handle.whenSettled;
  await flushMicrotasks();

  assert.deepEqual(stdinWrites, ['q\n']);

  const threadIndex = parsePersistedAgentThreadIndex(
    files.get(agentThreadIndexPath) ?? '',
  );
  assert.ok(threadIndex);
  assert.equal(threadIndex?.threads.length, 1);
  assert.deepEqual(threadIndex?.threads[0], {
    threadId: 'thread-1',
    title: 'Git Status',
    createdAt: '2026-04-03T01:00:00.000Z',
    updatedAt: '2026-04-03T01:00:03.000Z',
    archivedAt: null,
    lastRunId: 'run-1',
    lastRunStatus: 'completed',
  });

  const threadDocument = parsePersistedAgentThreadDocument(
    files.get(buildAgentThreadDocumentPath('thread-1')) ?? '',
  );
  assert.ok(threadDocument);
  assert.deepEqual(threadDocument?.runIds, ['run-1']);

  const runDocument = parsePersistedAgentRunDocument(
    files.get(buildAgentRunDocumentPath('run-1')) ?? '',
  );
  assert.ok(runDocument);
  assert.equal(runDocument?.run.status, 'completed');
  assert.equal(runDocument?.run.sessionId, 'terminal-1');
  assert.equal(runDocument?.run.startedAt, '2026-04-03T01:00:01.000Z');
  assert.equal(runDocument?.run.completedAt, '2026-04-03T01:00:03.000Z');
  assert.deepEqual(
    runDocument?.run.settings.workspace,
    {
      rootPath: 'D:/code/opappdev',
      displayName: 'opappdev',
      trusted: true,
    },
  );
  assert.deepEqual(
    runDocument?.timeline.map(entry => entry.kind === 'terminal-event' ? entry.event : entry.kind),
    ['started', 'stdout', 'exit'],
  );
  assert.equal(
    settledDocument.timeline.at(-1)?.kind,
    'terminal-event',
  );

  const failureFiles = new Map<string, string>();
  const failingRuntime = createPersistedAgentTerminalRuntime({
    readUserFile: async path => failureFiles.get(path) ?? null,
    writeUserFile: async (path, content) => {
      failureFiles.set(path, content);
      return true;
    },
    getTrustedWorkspaceTarget: async () => null,
    openAgentTerminalSession: async () => {
      const error = new Error('native open failed') as Error & {code?: string};
      error.code = 'ERR_OPEN_FAILED';
      throw error;
    },
    now: createClock([
      '2026-04-03T01:10:00.000Z',
      '2026-04-03T01:10:00.050Z',
    ]),
    createId: createIdFactory([
      'thread-2',
      'run-2',
      'entry-5',
    ]),
  });

  await assert.rejects(
    failingRuntime.openRun({
      command: 'git status',
      cwd: 'opapp-desktop',
    }),
    /native open failed/i,
  );
  await flushMicrotasks();

  const failedRunDocument = parsePersistedAgentRunDocument(
    failureFiles.get(buildAgentRunDocumentPath('run-2')) ?? '',
  );
  assert.ok(failedRunDocument);
  assert.equal(failedRunDocument?.run.status, 'failed');
  assert.equal(failedRunDocument?.run.completedAt, '2026-04-03T01:10:00.050Z');
  assert.equal(failedRunDocument?.timeline.at(-1)?.kind, 'error');

  await handle.cancel();
  assert.equal(cancelCount, 1);
}
