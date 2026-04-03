import assert from 'node:assert/strict';
import {
  createDefaultAgentProviderProfile,
  createDefaultAgentRunSettings,
  createDefaultAgentThreadIndex,
  normalizeAgentStorageId,
  parsePersistedAgentRunDocument,
  parsePersistedAgentThreadDocument,
  parsePersistedAgentThreadIndex,
  serializePersistedAgentRunDocument,
  serializePersistedAgentThreadDocument,
  serializePersistedAgentThreadIndex,
} from '../../framework/agent-runtime/src/model';
import {
  agentRunDocumentsDir,
  agentRuntimeStorageRoot,
  agentThreadDocumentsDir,
  agentThreadIndexPath,
  agentWorkspaceTargetPath,
  buildAgentRunDocumentPath,
  buildAgentThreadDocumentPath,
} from '../../framework/agent-runtime/src/storage';

export function run() {
  assert.deepEqual(createDefaultAgentProviderProfile(), {
    providerId: 'custom-openai-compatible',
    label: null,
    apiFamily: 'chat-completions',
    baseUrl: null,
    model: null,
  });

  assert.deepEqual(createDefaultAgentRunSettings(), {
    workspace: {
      rootPath: null,
      displayName: null,
      trusted: false,
    },
    provider: createDefaultAgentProviderProfile(),
    permissionMode: 'workspace-write',
    approvalMode: 'manual',
  });

  assert.deepEqual(createDefaultAgentThreadIndex(), {
    updatedAt: null,
    threads: [],
  });

  assert.equal(normalizeAgentStorageId('  run-1  '), 'run-1');
  assert.throws(() => normalizeAgentStorageId('../escape'), /invalid/i);

  const threadIndex = parsePersistedAgentThreadIndex(
    JSON.stringify({
      updatedAt: '2026-04-02T15:00:00.000Z',
      threads: [
        {
          threadId: 'thread-2',
          title: 'Second task',
          createdAt: '2026-04-02T12:00:00.000Z',
          updatedAt: '2026-04-02T13:00:00.000Z',
          lastRunStatus: 'completed',
        },
        {
          threadId: 'thread-1',
          title: 'First task',
          createdAt: '2026-04-02T11:00:00.000Z',
          updatedAt: '2026-04-02T14:00:00.000Z',
          lastRunId: 'run-1',
          lastRunStatus: 'running',
        },
        {
          threadId: 'thread-2',
          title: 'Duplicate newer record should win',
          createdAt: '2026-04-02T12:00:00.000Z',
          updatedAt: '2026-04-02T12:30:00.000Z',
          lastRunStatus: 'failed',
        },
        {
          nope: true,
        },
      ],
    }),
  );

  assert.deepEqual(threadIndex, {
    updatedAt: '2026-04-02T15:00:00.000Z',
    threads: [
      {
        threadId: 'thread-1',
        title: 'First task',
        createdAt: '2026-04-02T11:00:00.000Z',
        updatedAt: '2026-04-02T14:00:00.000Z',
        archivedAt: null,
        lastRunId: 'run-1',
        lastRunStatus: 'running',
      },
      {
        threadId: 'thread-2',
        title: 'Duplicate newer record should win',
        createdAt: '2026-04-02T12:00:00.000Z',
        updatedAt: '2026-04-02T12:30:00.000Z',
        archivedAt: null,
        lastRunId: null,
        lastRunStatus: 'failed',
      },
    ],
  });

  assert.equal(
    serializePersistedAgentThreadIndex(threadIndex!),
    JSON.stringify(threadIndex),
  );

  const threadDocument = parsePersistedAgentThreadDocument(
    JSON.stringify({
      thread: {
        threadId: 'thread-1',
        title: 'First task',
        createdAt: '2026-04-02T11:00:00.000Z',
        updatedAt: '2026-04-02T14:00:00.000Z',
      },
      runIds: ['run-2', 'run-1', 'run-2', '../bad'],
    }),
  );

  assert.deepEqual(threadDocument, {
    thread: {
      threadId: 'thread-1',
      title: 'First task',
      createdAt: '2026-04-02T11:00:00.000Z',
      updatedAt: '2026-04-02T14:00:00.000Z',
      archivedAt: null,
      lastRunId: null,
      lastRunStatus: null,
    },
    runIds: ['run-1', 'run-2'],
  });

  assert.equal(
    serializePersistedAgentThreadDocument(threadDocument!),
    JSON.stringify(threadDocument),
  );

  const runDocument = parsePersistedAgentRunDocument(
    JSON.stringify({
      run: {
        runId: 'run-1',
        threadId: 'thread-1',
        sessionId: 'session-1',
        goal: 'Build the first local coding loop',
        status: 'needs-approval',
        createdAt: '2026-04-02T11:05:00.000Z',
        updatedAt: '2026-04-02T11:10:00.000Z',
        startedAt: '2026-04-02T11:06:00.000Z',
        settings: {
          workspace: {
            rootPath: 'D:/code/opappdev',
            displayName: 'opappdev',
            trusted: true,
          },
          provider: {
            providerId: 'custom-openai-compatible',
            label: 'LM Studio',
            apiFamily: 'chat-completions',
            baseUrl: 'http://127.0.0.1:1234',
            model: 'gpt-4.1-mini',
          },
          permissionMode: 'workspace-write',
          approvalMode: 'manual',
        },
        request: {
          command: 'corepack pnpm commit:check',
          cwd: 'opapp-frontend',
          shell: 'powershell',
          env: {
            NODE_ENV: 'test',
          },
        },
      },
      timeline: [
        {
          entryId: 'evt-5',
          runId: 'run-1',
          seq: 5,
          createdAt: '2026-04-02T11:06:05.000Z',
          kind: 'approval',
          approvalId: 'approval-1',
          status: 'pending',
          title: 'Allow shell execution',
          details: 'Need to run git status inside trusted workspace.',
          permissionMode: 'danger-full-access',
        },
        {
          entryId: 'evt-2',
          runId: 'run-1',
          seq: 2,
          createdAt: '2026-04-02T11:06:02.000Z',
          kind: 'plan',
          steps: [
            {
              stepId: 'step-1',
              title: 'Read AGENT.md',
              status: 'completed',
            },
            {
              stepId: 'step-2',
              title: 'Define runtime data model',
              status: 'in_progress',
            },
          ],
        },
        {
          entryId: 'evt-1',
          runId: 'run-1',
          seq: 1,
          createdAt: '2026-04-02T11:06:01.000Z',
          kind: 'message',
          role: 'user',
          content: 'Read AGENT.md and continue development.',
        },
        {
          entryId: 'evt-3',
          runId: 'run-1',
          seq: 3,
          createdAt: '2026-04-02T11:06:03.000Z',
          kind: 'tool-call',
          callId: 'tool-1',
          toolName: 'shell_command',
          status: 'completed',
          inputText: 'Get-Content -Raw AGENT.md',
        },
        {
          entryId: 'evt-4',
          runId: 'run-1',
          seq: 4,
          createdAt: '2026-04-02T11:06:04.000Z',
          kind: 'tool-result',
          callId: 'tool-1',
          status: 'success',
          outputText: 'AGENT.md contents',
          exitCode: 0,
        },
        {
          entryId: 'evt-6',
          runId: 'run-1',
          seq: 6,
          createdAt: '2026-04-02T11:06:06.000Z',
          kind: 'artifact',
          artifactId: 'artifact-1',
          artifactKind: 'diff',
          label: 'Runtime contract patch',
          path: 'agent-runtime/runs/run-1.diff',
          mimeType: 'text/x-diff',
        },
        {
          entryId: 'evt-7',
          runId: 'run-1',
          seq: 7,
          createdAt: '2026-04-02T11:06:07.000Z',
          kind: 'terminal-event',
          sessionId: 'terminal-1',
          event: 'stdout',
          text: 'typecheck passed',
          cwd: 'D:/code/opappdev/opapp-frontend',
          command: 'corepack pnpm typecheck',
          exitCode: 0,
        },
        {
          entryId: 'evt-8',
          runId: 'run-1',
          seq: 8,
          createdAt: '2026-04-02T11:06:08.000Z',
          kind: 'error',
          code: 'approval-timeout',
          message: 'Approval expired before the tool was retried.',
          retryable: true,
        },
        {
          entryId: 'evt-bad-run',
          runId: 'run-2',
          seq: 0,
          createdAt: '2026-04-02T11:00:00.000Z',
          kind: 'message',
          role: 'assistant',
          content: 'should be filtered out',
        },
      ],
    }),
  );

  assert.equal(runDocument?.run.runId, 'run-1');
  assert.equal(runDocument?.run.settings.workspace.rootPath, 'D:/code/opappdev');
  assert.equal(runDocument?.run.settings.workspace.trusted, true);
  assert.equal(runDocument?.run.settings.provider.apiFamily, 'chat-completions');
  assert.deepEqual(runDocument?.run.request, {
    command: 'corepack pnpm commit:check',
    cwd: 'opapp-frontend',
    shell: 'powershell',
    env: {
      NODE_ENV: 'test',
    },
  });
  assert.deepEqual(
    runDocument?.timeline.map(entry => entry.kind),
    [
      'message',
      'plan',
      'tool-call',
      'tool-result',
      'approval',
      'artifact',
      'terminal-event',
      'error',
    ],
  );
  assert.equal(runDocument?.timeline[1]?.kind, 'plan');
  if (runDocument?.timeline[1]?.kind === 'plan') {
    assert.deepEqual(runDocument.timeline[1].steps, [
      {
        stepId: 'step-1',
        title: 'Read AGENT.md',
        status: 'completed',
      },
      {
        stepId: 'step-2',
        title: 'Define runtime data model',
        status: 'in_progress',
      },
    ]);
  }

  assert.equal(
    serializePersistedAgentRunDocument(runDocument!),
    JSON.stringify(runDocument),
  );

  assert.equal(agentRuntimeStorageRoot, 'agent-runtime');
  assert.equal(agentWorkspaceTargetPath, 'agent-runtime/workspace-target.json');
  assert.equal(agentThreadDocumentsDir, 'agent-runtime/threads');
  assert.equal(agentRunDocumentsDir, 'agent-runtime/runs');
  assert.equal(agentThreadIndexPath, 'agent-runtime/thread-index.json');
  assert.equal(
    buildAgentThreadDocumentPath('thread-1'),
    'agent-runtime/threads/thread-1.json',
  );
  assert.equal(
    buildAgentRunDocumentPath('run-1'),
    'agent-runtime/runs/run-1.json',
  );
  assert.throws(
    () => buildAgentThreadDocumentPath('../escape'),
    /thread id is invalid/i,
  );

  assert.equal(parsePersistedAgentThreadIndex('{bad json'), null);
  assert.equal(parsePersistedAgentThreadDocument('{bad json'), null);
  assert.equal(parsePersistedAgentRunDocument('{bad json'), null);
}
