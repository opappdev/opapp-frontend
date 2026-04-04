import assert from 'node:assert/strict';
import {
  agentWorkbenchArtifactKindEnvVar,
  agentWorkbenchArtifactPathEnvVar,
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
  let sessionOpenCount = 0;

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
      sessionOpenCount += 1;
      return {
        sessionId: `terminal-${sessionOpenCount}`,
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
      '2026-04-03T01:05:00.000Z',
      '2026-04-03T01:05:00.050Z',
    ]),
    createId: createIdFactory([
      'thread-1',
      'run-1',
      'entry-1',
      'entry-2',
      'entry-3',
      'run-2',
      'entry-4',
      'entry-5',
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
  assert.deepEqual(runDocument?.run.request, {
    command: 'git status',
    cwd: 'opapp-frontend',
    shell: null,
    env: {},
  });
  assert.deepEqual(
    runDocument?.timeline.map(entry =>
      entry.kind === 'terminal-event' ? entry.event : entry.kind,
    ),
    ['message', 'plan', 'tool-call', 'started', 'stdout', 'exit', 'tool-result'],
  );
  if (runDocument?.timeline[0]?.kind === 'message') {
    assert.equal(runDocument.timeline[0].role, 'user');
    assert.equal(runDocument.timeline[0].content, 'Inspect frontend repo state');
  }
  if (runDocument?.timeline[1]?.kind === 'plan') {
    assert.equal(runDocument.timeline[1].steps.length, 1);
    assert.equal(runDocument.timeline[1].steps[0]?.status, 'completed');
    assert.equal(runDocument.timeline[1].steps[0]?.title, 'Inspect frontend repo state');
  }
  if (runDocument?.timeline[2]?.kind === 'tool-call') {
    assert.equal(runDocument.timeline[2].toolName, 'shell_command');
    assert.equal(runDocument.timeline[2].status, 'completed');
    assert.equal(runDocument.timeline[2].inputText, 'git status');
  }
  if (runDocument?.timeline[6]?.kind === 'tool-result') {
    assert.equal(runDocument.timeline[6].status, 'success');
    assert.equal(runDocument.timeline[6].exitCode, 0);
    assert.match(runDocument.timeline[6].outputText, /\$ git status/);
    assert.match(runDocument.timeline[6].outputText, /\[exit 0\]/);
  }
  assert.equal(settledDocument.timeline.at(-1)?.kind, 'tool-result');

  const continuedHandle = await runtime.openRun({
    threadId: 'thread-1',
    goal: 'Continue current thread',
    command: 'git status --short',
    cwd: 'opapp-frontend',
  });

  await flushMicrotasks();
  assert.equal(continuedHandle.threadId, 'thread-1');
  assert.equal(continuedHandle.runId, 'run-2');
  assert.equal(continuedHandle.sessionId, 'terminal-2');

  listener?.onEvent?.({
    sessionId: 'terminal-2',
    event: 'started',
    cwd: 'D:/code/opappdev/opapp-frontend',
    command: 'git status --short',
    exitCode: null,
    text: null,
    createdAt: '2026-04-03T01:05:01.000Z',
  });
  listener?.onEvent?.({
    sessionId: 'terminal-2',
    event: 'exit',
    cwd: 'D:/code/opappdev/opapp-frontend',
    command: 'git status --short',
    exitCode: 0,
    text: null,
    createdAt: '2026-04-03T01:05:02.000Z',
  });

  const continuedDocument = await continuedHandle.whenSettled;
  await flushMicrotasks();

  assert.equal(continuedDocument.run.threadId, 'thread-1');
  assert.equal(continuedDocument.run.resumedFromRunId, 'run-1');

  const continuedThreadDocument = parsePersistedAgentThreadDocument(
    files.get(buildAgentThreadDocumentPath('thread-1')) ?? '',
  );
  assert.ok(continuedThreadDocument);
  assert.deepEqual(continuedThreadDocument?.runIds, ['run-1', 'run-2']);

  const continuedRunDocument = parsePersistedAgentRunDocument(
    files.get(buildAgentRunDocumentPath('run-2')) ?? '',
  );
  assert.ok(continuedRunDocument);
  assert.equal(continuedRunDocument?.run.threadId, 'thread-1');
  assert.equal(continuedRunDocument?.run.resumedFromRunId, 'run-1');

  const approvalFiles = new Map<string, string>();
  let approvalListener:
    | {
        onEvent?: (event: AgentTerminalSessionEvent) => void;
        onError?: (error: Error & {code?: string}) => void;
      }
    | undefined;

  const approvalRuntime = createPersistedAgentTerminalRuntime({
    readUserFile: async path => approvalFiles.get(path) ?? null,
    writeUserFile: async (path, content) => {
      approvalFiles.set(path, content);
      return true;
    },
    getTrustedWorkspaceTarget: async () => ({
      rootPath: 'D:/code/opappdev',
      displayName: 'opappdev',
      trusted: true,
    }),
    openAgentTerminalSession: async (_options, nextListener) => {
      approvalListener = nextListener;
      return {
        sessionId: 'terminal-2',
        async cancel() {},
        async sendInput() {},
      };
    },
    now: createClock([
      '2026-04-03T02:00:00.000Z',
      '2026-04-03T02:00:01.000Z',
      '2026-04-03T02:00:01.050Z',
    ]),
    createId: createIdFactory([
      'thread-2',
      'run-2',
      'approval-1',
      'entry-5',
      'entry-6',
      'entry-7',
      'entry-8',
      'entry-9',
      'artifact-1',
      'entry-10',
      'artifact-2',
    ]),
  });

  const pendingHandle = await approvalRuntime.openRun({
    title: 'Workspace Write Smoke',
    goal: 'Create approval smoke file',
    command: 'Set-Content .tmp/approval-smoke.txt ready',
    cwd: '',
    env: {
      [agentWorkbenchArtifactPathEnvVar]: '.tmp/approval-smoke.txt',
      [agentWorkbenchArtifactKindEnvVar]: 'diff',
    },
    requiresApproval: true,
    approvalTitle: 'Allow workspace write smoke',
    approvalDetails: 'Need to write a temporary file inside the trusted workspace.',
  });

  await flushMicrotasks();
  assert.equal(pendingHandle.threadId, 'thread-2');
  assert.equal(pendingHandle.runId, 'run-2');
  assert.equal(pendingHandle.sessionId, null);
  await assert.rejects(
    pendingHandle.sendInput('nope'),
    /waiting for approval/i,
  );

  const pendingRunDocument = parsePersistedAgentRunDocument(
    approvalFiles.get(buildAgentRunDocumentPath('run-2')) ?? '',
  );
  assert.ok(pendingRunDocument);
  assert.equal(pendingRunDocument?.run.status, 'needs-approval');
  assert.equal(pendingRunDocument?.run.request?.command, 'Set-Content .tmp/approval-smoke.txt ready');
  assert.deepEqual(
    pendingRunDocument?.timeline.map(entry =>
      entry.kind === 'terminal-event' ? entry.event : entry.kind,
    ),
    ['message', 'plan', 'tool-call', 'approval'],
  );
  if (pendingRunDocument?.timeline[1]?.kind === 'plan') {
    assert.equal(pendingRunDocument.timeline[1].steps[0]?.status, 'pending');
  }
  if (pendingRunDocument?.timeline[2]?.kind === 'tool-call') {
    assert.equal(pendingRunDocument.timeline[2].status, 'queued');
    assert.equal(
      pendingRunDocument.timeline[2].inputText,
      'Set-Content .tmp/approval-smoke.txt ready',
    );
  }
  if (pendingRunDocument?.timeline[3]?.kind === 'approval') {
    assert.equal(pendingRunDocument.timeline[3].status, 'pending');
    assert.equal(pendingRunDocument.timeline[3].approvalId, 'approval-1');
  }

  const approvedHandle = await approvalRuntime.approveRun({
    runId: 'run-2',
  });
  await flushMicrotasks();
  assert.equal(approvedHandle.sessionId, 'terminal-2');

  approvalListener?.onEvent?.({
    sessionId: 'terminal-2',
    event: 'started',
    cwd: 'D:/code/opappdev',
    command: 'Set-Content .tmp/approval-smoke.txt ready',
    exitCode: null,
    text: null,
    createdAt: '2026-04-03T02:00:02.000Z',
  });
  approvalListener?.onEvent?.({
    sessionId: 'terminal-2',
    event: 'stdout',
    cwd: 'D:/code/opappdev',
    command: 'Set-Content .tmp/approval-smoke.txt ready',
    exitCode: null,
    text: 'approval path ran\n',
    createdAt: '2026-04-03T02:00:03.000Z',
  });
  approvalListener?.onEvent?.({
    sessionId: 'terminal-2',
    event: 'exit',
    cwd: 'D:/code/opappdev',
    command: 'Set-Content .tmp/approval-smoke.txt ready',
    exitCode: 0,
    text: null,
    createdAt: '2026-04-03T02:00:04.000Z',
  });

  const approvedDocument = await approvedHandle.whenSettled;
  const pendingDocumentAfterApproval = await pendingHandle.whenSettled;
  await flushMicrotasks();

  assert.equal(approvedDocument.run.status, 'completed');
  assert.equal(pendingDocumentAfterApproval.run.status, 'completed');
  assert.equal(approvedDocument.run.sessionId, 'terminal-2');
  assert.deepEqual(
    approvedDocument.timeline.map(entry =>
      entry.kind === 'terminal-event' ? entry.event : entry.kind,
    ),
    [
      'message',
      'plan',
      'tool-call',
      'approval',
      'started',
      'stdout',
      'exit',
      'tool-result',
      'artifact',
    ],
  );
  if (approvedDocument.timeline[1]?.kind === 'plan') {
    assert.equal(approvedDocument.timeline[1].steps[0]?.status, 'completed');
  }
  if (approvedDocument.timeline[2]?.kind === 'tool-call') {
    assert.equal(approvedDocument.timeline[2].status, 'completed');
  }
  if (approvedDocument.timeline[3]?.kind === 'approval') {
    assert.equal(approvedDocument.timeline[3].status, 'approved');
  }
  if (approvedDocument.timeline[7]?.kind === 'tool-result') {
    assert.equal(approvedDocument.timeline[7].status, 'success');
    assert.equal(approvedDocument.timeline[7].exitCode, 0);
    assert.match(approvedDocument.timeline[7].outputText, /\$ Set-Content/);
    assert.match(approvedDocument.timeline[7].outputText, /\[exit 0\]/);
  }
  if (approvedDocument.timeline[8]?.kind === 'artifact') {
    assert.equal(approvedDocument.timeline[8].artifactKind, 'diff');
    assert.equal(approvedDocument.timeline[8].path, '.tmp/approval-smoke.txt');
    assert.equal(approvedDocument.timeline[8].label, 'approval-smoke.txt');
  }

  approvalFiles.set(
    buildAgentRunDocumentPath('run-2'),
    JSON.stringify({
      ...approvedDocument,
      timeline: approvedDocument.timeline.filter(entry => entry.kind !== 'artifact'),
    }),
  );
  const artifactReconciliation =
    await approvalRuntime.reconcileRequestedRunArtifacts();
  assert.deepEqual(artifactReconciliation.reconciledRunIds, ['run-2']);
  const reconciledApprovedDocument = parsePersistedAgentRunDocument(
    approvalFiles.get(buildAgentRunDocumentPath('run-2')) ?? '',
  );
  assert.equal(
    reconciledApprovedDocument?.timeline.filter(entry => entry.kind === 'artifact')
      .length,
    1,
  );

  const rejectedFiles = new Map<string, string>();
  const rejectedRuntime = createPersistedAgentTerminalRuntime({
    readUserFile: async path => rejectedFiles.get(path) ?? null,
    writeUserFile: async (path, content) => {
      rejectedFiles.set(path, content);
      return true;
    },
    getTrustedWorkspaceTarget: async () => ({
      rootPath: 'D:/code/opappdev',
      displayName: 'opappdev',
      trusted: true,
    }),
    openAgentTerminalSession: async () => {
      throw new Error('approval rejection should not open a terminal session');
    },
    now: createClock([
      '2026-04-03T03:00:00.000Z',
      '2026-04-03T03:00:01.000Z',
    ]),
    createId: createIdFactory([
      'thread-3',
      'run-3',
      'approval-2',
      'entry-9',
    ]),
  });

  const rejectedHandle = await rejectedRuntime.openRun({
    title: 'Rejected Write Smoke',
    goal: 'Create approval smoke file',
    command: 'Set-Content .tmp/rejected-approval-smoke.txt nope',
    requiresApproval: true,
    approvalTitle: 'Allow rejected workspace write smoke',
  });

  const rejectedDocument = await rejectedRuntime.rejectRun({
    runId: 'run-3',
  });
  const rejectedSettledDocument = await rejectedHandle.whenSettled;
  await flushMicrotasks();

  assert.equal(rejectedDocument.run.status, 'cancelled');
  assert.equal(rejectedSettledDocument.run.status, 'cancelled');
  assert.deepEqual(
    rejectedDocument.timeline.map(entry =>
      entry.kind === 'terminal-event' ? entry.event : entry.kind,
    ),
    ['message', 'plan', 'tool-call', 'approval', 'tool-result'],
  );
  if (rejectedDocument.timeline[1]?.kind === 'plan') {
    assert.equal(rejectedDocument.timeline[1].steps[0]?.status, 'completed');
  }
  if (rejectedDocument.timeline[2]?.kind === 'tool-call') {
    assert.equal(rejectedDocument.timeline[2].status, 'cancelled');
  }
  if (rejectedDocument.timeline[3]?.kind === 'approval') {
    assert.equal(rejectedDocument.timeline[3].status, 'rejected');
  }
  if (rejectedDocument.timeline[4]?.kind === 'tool-result') {
    assert.equal(rejectedDocument.timeline[4].status, 'cancelled');
    assert.equal(rejectedDocument.timeline[4].exitCode, null);
  }
  assert.equal(
    rejectedDocument.timeline.some(entry => entry.kind === 'artifact'),
    false,
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
      'thread-4',
      'run-4',
      'entry-10',
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
    failureFiles.get(buildAgentRunDocumentPath('run-4')) ?? '',
  );
  assert.ok(failedRunDocument);
  assert.equal(failedRunDocument?.run.status, 'failed');
  assert.equal(failedRunDocument?.run.completedAt, '2026-04-03T01:10:00.050Z');
  assert.deepEqual(
    failedRunDocument?.timeline.map(entry =>
      entry.kind === 'terminal-event' ? entry.event : entry.kind,
    ),
    ['message', 'plan', 'tool-call', 'tool-result', 'error'],
  );
  if (failedRunDocument?.timeline[2]?.kind === 'tool-call') {
    assert.equal(failedRunDocument.timeline[2].status, 'failed');
  }
  if (failedRunDocument?.timeline[3]?.kind === 'tool-result') {
    assert.equal(failedRunDocument.timeline[3].status, 'error');
    assert.equal(failedRunDocument.timeline[3].exitCode, null);
    assert.equal(failedRunDocument.timeline[3].outputText, 'native open failed');
  }
  assert.equal(failedRunDocument?.timeline.at(-1)?.kind, 'error');

  const fallbackFiles = new Map<string, string>();
  let fallbackListener:
    | {
        onEvent?: (event: AgentTerminalSessionEvent) => void;
        onError?: (error: Error & {code?: string}) => void;
      }
    | undefined;

  const fallbackRuntime = createPersistedAgentTerminalRuntime({
    readUserFile: async path => fallbackFiles.get(path) ?? null,
    writeUserFile: async (path, content) => {
      fallbackFiles.set(path, content);
      return true;
    },
    getTrustedWorkspaceTarget: async () => ({
      rootPath: 'D:/code/opappdev',
      displayName: 'opappdev',
      trusted: true,
    }),
    openAgentTerminalSession: async (_options, nextListener) => {
      fallbackListener = nextListener;
      return {
        sessionId: 'terminal-5',
        async cancel() {},
        async sendInput() {},
      };
    },
    now: createClock([
      '2026-04-03T01:20:00.000Z',
      '2026-04-03T01:20:00.050Z',
    ]),
    createId: createIdFactory([
      'thread-5',
      'run-5',
      'entry-11',
      'entry-12',
    ]),
  });

  const fallbackHandle = await fallbackRuntime.openRun({
    title: 'Fallback command header',
    goal: 'Capture command header without started event',
    command:
      "$targetPath = '.tmp/fallback-header.txt'; Set-Content -LiteralPath $targetPath -Value 'ready'; Get-Content -LiteralPath $targetPath",
    cwd: '',
  });
  await flushMicrotasks();
  fallbackListener?.onEvent?.({
    sessionId: 'terminal-5',
    event: 'stdout',
    cwd: 'D:/code/opappdev',
    command:
      "$targetPath = '.tmp/fallback-header.txt'; Set-Content -LiteralPath $targetPath -Value 'ready'; Get-Content -LiteralPath $targetPath",
    exitCode: null,
    text: 'saved\n',
    createdAt: '2026-04-03T01:20:01.000Z',
  });
  fallbackListener?.onEvent?.({
    sessionId: 'terminal-5',
    event: 'exit',
    cwd: 'D:/code/opappdev',
    command:
      "$targetPath = '.tmp/fallback-header.txt'; Set-Content -LiteralPath $targetPath -Value 'ready'; Get-Content -LiteralPath $targetPath",
    exitCode: 0,
    text: null,
    createdAt: '2026-04-03T01:20:02.000Z',
  });

  const fallbackDocument = await fallbackHandle.whenSettled;
  await flushMicrotasks();

  assert.equal(fallbackDocument.run.status, 'completed');
  assert.deepEqual(
    fallbackDocument.timeline.map(entry =>
      entry.kind === 'terminal-event' ? entry.event : entry.kind,
    ),
    ['message', 'plan', 'tool-call', 'stdout', 'exit', 'tool-result'],
  );
  const fallbackToolResult = fallbackDocument.timeline.at(-1);
  if (fallbackToolResult?.kind === 'tool-result') {
    assert.equal(fallbackToolResult.status, 'success');
    assert.equal(fallbackToolResult.exitCode, 0);
    assert.match(fallbackToolResult.outputText, /\$ Set-Content/);
    assert.match(fallbackToolResult.outputText, /\$ Get-Content/);
    assert.match(fallbackToolResult.outputText, /\[exit 0\]/);
  }

  const interruptedFiles = new Map<string, string>();
  let interruptedListener:
    | {
        onEvent?: (event: AgentTerminalSessionEvent) => void;
        onError?: (error: Error & {code?: string}) => void;
      }
    | undefined;

  const runningRuntime = createPersistedAgentTerminalRuntime({
    readUserFile: async path => interruptedFiles.get(path) ?? null,
    writeUserFile: async (path, content) => {
      interruptedFiles.set(path, content);
      return true;
    },
    getTrustedWorkspaceTarget: async () => ({
      rootPath: 'D:/code/opappdev',
      displayName: 'opappdev',
      trusted: true,
    }),
    openAgentTerminalSession: async (_options, nextListener) => {
      interruptedListener = nextListener;
      return {
        sessionId: 'terminal-9',
        async cancel() {},
        async sendInput() {},
      };
    },
    now: createClock([
      '2026-04-03T04:00:00.000Z',
      '2026-04-03T04:00:00.050Z',
    ]),
    createId: createIdFactory([
      'thread-9',
      'run-9',
      'entry-11',
    ]),
  });

  await runningRuntime.openRun({
    title: 'Interrupted run',
    goal: 'Repro interrupted recovery',
    command: 'git status',
    cwd: 'opapp-frontend',
  });
  await flushMicrotasks();

  interruptedListener?.onEvent?.({
    sessionId: 'terminal-9',
    event: 'started',
    cwd: 'D:/code/opappdev/opapp-frontend',
    command: 'git status',
    exitCode: null,
    text: null,
    createdAt: '2026-04-03T04:00:01.000Z',
  });
  await flushMicrotasks();

  const recoveryRuntime = createPersistedAgentTerminalRuntime({
    readUserFile: async path => interruptedFiles.get(path) ?? null,
    writeUserFile: async (path, content) => {
      interruptedFiles.set(path, content);
      return true;
    },
    now: createClock([
      '2026-04-03T04:05:00.000Z',
    ]),
  });

  const interruptedResult = await recoveryRuntime.reconcileInterruptedRuns();
  assert.deepEqual(interruptedResult, {
    interruptedRunIds: ['run-9'],
  });

  const interruptedRunDocument = parsePersistedAgentRunDocument(
    interruptedFiles.get(buildAgentRunDocumentPath('run-9')) ?? '',
  );
  assert.ok(interruptedRunDocument);
  assert.equal(interruptedRunDocument?.run.status, 'interrupted');
  assert.equal(
    interruptedRunDocument?.run.completedAt,
    '2026-04-03T04:05:00.000Z',
  );
  assert.deepEqual(
    interruptedRunDocument?.timeline
      .filter(entry => entry.kind !== 'terminal-event')
      .map(entry => entry.kind),
    ['message', 'plan', 'tool-call', 'tool-result'],
  );
  if (interruptedRunDocument?.timeline[1]?.kind === 'plan') {
    assert.equal(interruptedRunDocument.timeline[1].steps[0]?.status, 'completed');
  }
  if (interruptedRunDocument?.timeline[2]?.kind === 'tool-call') {
    assert.equal(interruptedRunDocument.timeline[2].status, 'cancelled');
  }
  const interruptedToolResult = interruptedRunDocument?.timeline.find(
    entry => entry.kind === 'tool-result',
  );
  if (interruptedToolResult?.kind === 'tool-result') {
    assert.equal(interruptedToolResult.status, 'cancelled');
    assert.equal(interruptedToolResult.exitCode, null);
    if (interruptedToolResult.outputText) {
      assert.match(interruptedToolResult.outputText, /\$ git status/);
    }
  }

  const interruptedThreadIndex = parsePersistedAgentThreadIndex(
    interruptedFiles.get(agentThreadIndexPath) ?? '',
  );
  assert.ok(interruptedThreadIndex);
  assert.equal(interruptedThreadIndex?.threads[0]?.lastRunStatus, 'interrupted');

  await handle.cancel();
  assert.equal(cancelCount, 1);
}
