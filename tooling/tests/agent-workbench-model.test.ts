import assert from 'node:assert/strict';
import {
  buildWorkspaceGitDiffCommand,
  canRunWorkbenchTaskDirect,
  resolveWorkbenchTaskDraft,
  buildWorkspaceWriteApprovalCommand,
  buildTerminalTranscript,
  createWorkspaceChoices,
  resolveThreadRunHistorySelection,
  resolveWorkspaceGitDiffCandidate,
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
      '',
    ),
    '',
  );
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
      undefined,
    ),
    'opapp-frontend',
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

  assert.deepEqual(
    buildWorkspaceGitDiffCommand("opapp-frontend/apps/companion-app/src/user's-note.tsx"),
    {
      cwd: 'opapp-frontend',
      command:
        "git diff --no-ext-diff --no-color HEAD -- 'apps/companion-app/src/user''s-note.tsx'",
    },
  );
  assert.equal(buildWorkspaceGitDiffCommand('AGENT.md'), null);
  assert.deepEqual(buildWorkspaceWriteApprovalCommand('opapp-frontend'), {
    cwd: '',
    shell: 'powershell',
    relativePath: '.tmp/agent-workbench/approval-write-smoke.txt',
    command: [
      "$requestedCwd = 'opapp-frontend'",
      "$targetDir = Join-Path '.tmp' 'agent-workbench'",
      'New-Item -ItemType Directory -Path $targetDir -Force | Out-Null',
      "$targetPath = Join-Path $targetDir 'approval-write-smoke.txt'",
      '$lines = @(',
      "  ('approvedAt=' + (Get-Date).ToUniversalTime().ToString('o'))",
      "  ('requestedCwd=' + $requestedCwd)",
      "  'executor=agent-workbench'",
      ')',
      'Set-Content -LiteralPath $targetPath -Value $lines -Encoding utf8',
      "Write-Output ('workspace write smoke saved to ' + $targetPath)",
      'Get-Content -LiteralPath $targetPath',
    ].join('; '),
  });
  assert.deepEqual(
    resolveWorkbenchTaskDraft({
      goal: '整理当前变更',
      command: '  git status --short  ',
      cwd: 'opapp-frontend',
      requiresApproval: false,
    }),
    {
      title: '整理当前变更',
      goal: '整理当前变更',
      command: 'git status --short',
      cwd: 'opapp-frontend',
      requiresApproval: false,
      canRunDirect: true,
      approvalTitle: undefined,
      approvalDetails: undefined,
    },
  );
  assert.deepEqual(
    resolveWorkbenchTaskDraft({
      goal: '',
      command: 'Set-Content note.txt ready',
      cwd: '',
      requiresApproval: true,
    }),
    {
      title: 'Set-Content note.txt ready',
      goal: 'Set-Content note.txt ready',
      command: 'Set-Content note.txt ready',
      cwd: undefined,
      requiresApproval: true,
      canRunDirect: false,
      approvalTitle: '允许执行任务：Set-Content note.txt ready',
      approvalDetails:
        '批准后会在 工作区根目录 下执行以下命令：Set-Content note.txt ready',
    },
  );
  assert.deepEqual(
    resolveWorkbenchTaskDraft({
      goal: '尝试直接写入',
      command: 'Set-Content note.txt ready',
      cwd: 'opapp-frontend',
      requiresApproval: false,
    }),
    {
      title: '尝试直接写入',
      goal: '尝试直接写入',
      command: 'Set-Content note.txt ready',
      cwd: 'opapp-frontend',
      requiresApproval: false,
      canRunDirect: false,
      approvalTitle: undefined,
      approvalDetails: undefined,
    },
  );
  assert.equal(
    resolveWorkbenchTaskDraft({
      goal: '空命令',
      command: '   ',
      cwd: 'opapp-frontend',
      requiresApproval: false,
    }),
    null,
  );
  assert.equal(canRunWorkbenchTaskDirect('git diff --stat'), true);
  assert.equal(canRunWorkbenchTaskDirect('rg agent-workbench src'), true);
  assert.equal(canRunWorkbenchTaskDirect('Set-Content note.txt ready'), false);
  assert.equal(canRunWorkbenchTaskDirect('git status; Write-Output done'), false);
  assert.deepEqual(
    resolveWorkspaceGitDiffCandidate([
      {
        name: 'README.md',
        relativePath: 'AGENT.md',
        kind: 'file',
        sizeBytes: 128,
      },
      {
        name: 'tsconfig.json',
        relativePath: 'opapp-frontend/tsconfig.json',
        kind: 'file',
        sizeBytes: 256,
      },
      {
        name: 'package.json',
        relativePath: 'opapp-frontend/package.json',
        kind: 'file',
        sizeBytes: 512,
      },
    ]),
    {
      entry: {
        name: 'package.json',
        relativePath: 'opapp-frontend/package.json',
        kind: 'file',
        sizeBytes: 512,
      },
      gitDiffCommand: {
        cwd: 'opapp-frontend',
        command: "git diff --no-ext-diff --no-color HEAD -- 'package.json'",
      },
    },
  );

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

  const runHistorySelection = resolveThreadRunHistorySelection({
    runIds: ['run-1', 'run-2', 'run-3'],
    currentRunId: 'run-2',
    runDocuments: [
      {
        run: {
          runId: 'run-1',
          threadId: 'thread-1',
          sessionId: 'terminal-1',
          goal: 'Inspect repo',
          status: 'completed',
          createdAt: '2026-04-03T02:00:00.000Z',
          updatedAt: '2026-04-03T02:00:01.000Z',
          startedAt: '2026-04-03T02:00:00.000Z',
          completedAt: '2026-04-03T02:00:01.000Z',
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
          request: {
            command: 'git status',
            cwd: 'opapp-frontend',
            shell: 'powershell',
            env: {},
          },
        },
        timeline: [],
      },
      {
        run: {
          runId: 'run-2',
          threadId: 'thread-1',
          sessionId: 'terminal-2',
          goal: 'Inspect diff',
          status: 'completed',
          createdAt: '2026-04-03T02:00:02.000Z',
          updatedAt: '2026-04-03T02:00:03.000Z',
          startedAt: '2026-04-03T02:00:02.000Z',
          completedAt: '2026-04-03T02:00:03.000Z',
          resumedFromRunId: 'run-1',
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
          request: {
            command: 'git diff --stat',
            cwd: 'opapp-frontend',
            shell: 'powershell',
            env: {},
          },
        },
        timeline: [],
      },
      {
        run: {
          runId: 'run-3',
          threadId: 'thread-1',
          sessionId: 'terminal-3',
          goal: 'Inspect logs',
          status: 'running',
          createdAt: '2026-04-03T02:00:04.000Z',
          updatedAt: '2026-04-03T02:00:05.000Z',
          startedAt: '2026-04-03T02:00:04.000Z',
          completedAt: null,
          resumedFromRunId: 'run-2',
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
          request: {
            command: 'Get-Content log.txt',
            cwd: 'opapp-desktop',
            shell: 'powershell',
            env: {},
          },
        },
        timeline: [],
      },
    ],
  });
  assert.deepEqual(
    runHistorySelection.runDocuments.map(document => document.run.runId),
    ['run-3', 'run-2', 'run-1'],
  );
  assert.equal(runHistorySelection.selectedRunId, 'run-2');
  assert.equal(runHistorySelection.selectedRunDocument?.run.runId, 'run-2');

  const fallbackRunHistorySelection = resolveThreadRunHistorySelection({
    runIds: [],
    currentRunId: 'missing-run',
    runDocuments: runHistorySelection.runDocuments,
  });
  assert.equal(fallbackRunHistorySelection.selectedRunId, 'run-3');

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
        request: {
          command: 'git status',
          cwd: 'opapp-frontend',
          shell: 'powershell',
          env: {},
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
