import assert from 'node:assert/strict';
import {
  buildTerminalTranscript,
  createWorkspaceChoices,
  resolvePreferredWorkspacePath,
  resolveSelectedThreadId,
} from '../../apps/companion-app/src/agent-workbench-model';

export function run() {
  assert.equal(
    resolvePreferredWorkspacePath(
      [
        {
          name: 'opapp-frontend',
          relativePath: 'opapp-frontend',
          kind: 'directory',
          sizeBytes: null,
        },
      ],
      'opapp-frontend/framework',
    ),
    'opapp-frontend/framework',
  );

  const workspaceChoices = createWorkspaceChoices({
    trustedWorkspace: {
      rootPath: 'D:/code/opappdev',
      displayName: 'opappdev',
      trusted: true,
    },
    directories: [
      {
        name: 'opapp-frontend',
        relativePath: 'opapp-frontend',
        kind: 'directory',
        sizeBytes: null,
      },
      {
        name: 'opapp-desktop',
        relativePath: 'opapp-desktop',
        kind: 'directory',
        sizeBytes: null,
      },
    ],
    currentPath: 'opapp-frontend/framework',
  });
  assert.deepEqual(
    workspaceChoices.map(choice => choice.key),
    ['', 'opapp-frontend/framework', 'opapp-frontend', 'opapp-desktop'],
  );
  assert.equal(workspaceChoices[1]?.label, 'framework');

  assert.equal(
    resolveSelectedThreadId(
      [
        {
          threadId: 'thread-1',
          title: 'Thread 1',
          createdAt: '2026-04-03T02:00:00.000Z',
          updatedAt: '2026-04-03T02:00:00.000Z',
          archivedAt: null,
          lastRunId: 'run-1',
          lastRunStatus: 'completed',
        },
      ],
      'missing-thread',
    ),
    'thread-1',
  );

  assert.equal(
    buildTerminalTranscript({
      run: {
        runId: 'run-1',
        threadId: 'thread-1',
        sessionId: 'terminal-1',
        goal: 'Inspect repo',
        status: 'completed',
        createdAt: '2026-04-03T02:00:00.000Z',
        updatedAt: '2026-04-03T02:00:03.000Z',
        startedAt: '2026-04-03T02:00:01.000Z',
        completedAt: '2026-04-03T02:00:03.000Z',
        resumedFromRunId: null,
        settings: {
          workspace: {
            rootPath: 'D:/code/opappdev',
            displayName: 'opappdev',
            trusted: true,
          },
          provider: {
            providerId: 'custom-openai-compatible',
            label: null,
            apiFamily: 'chat-completions',
            baseUrl: null,
            model: null,
          },
          permissionMode: 'workspace-write',
          approvalMode: 'manual',
        },
      },
      timeline: [
        {
          entryId: 'entry-1',
          runId: 'run-1',
          seq: 0,
          kind: 'terminal-event',
          sessionId: 'terminal-1',
          event: 'started',
          text: null,
          cwd: 'opapp-frontend',
          command: 'git status',
          exitCode: null,
          createdAt: '2026-04-03T02:00:01.000Z',
        },
        {
          entryId: 'entry-2',
          runId: 'run-1',
          seq: 1,
          kind: 'terminal-event',
          sessionId: 'terminal-1',
          event: 'stderr',
          text: 'warning\n',
          cwd: 'opapp-frontend',
          command: 'git status',
          exitCode: null,
          createdAt: '2026-04-03T02:00:02.000Z',
        },
        {
          entryId: 'entry-3',
          runId: 'run-1',
          seq: 2,
          kind: 'terminal-event',
          sessionId: 'terminal-1',
          event: 'exit',
          text: null,
          cwd: 'opapp-frontend',
          command: 'git status',
          exitCode: 0,
          createdAt: '2026-04-03T02:00:03.000Z',
        },
      ],
    }),
    '$ git status\n[stderr] warning\n\n[exit 0]\n',
  );
}
