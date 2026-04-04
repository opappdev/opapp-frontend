import assert from 'node:assert/strict';
import {type AgentRunDocument} from '../../framework/agent-runtime/src/model';
import {
  buildWorkbenchTimelineDisplayItems,
  buildWorkspaceGitDiffCommand,
  canRunWorkbenchTaskDirect,
  resolveWorkbenchTaskDraft,
  buildWorkspaceWriteApprovalCommand,
  buildTerminalTranscript,
  createWorkspaceChoices,
  resolveWorkbenchRunArtifactSummary,
  resolveThreadRunHistorySelection,
  resolveWorkspaceGitDiffCandidate,
  resolvePreferredWorkspacePath,
  resolveSelectedThreadId,
  summarizeWorkbenchTimeline,
  workbenchArtifactKindEnvVar,
  workbenchArtifactPathEnvVar,
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
  assert.deepEqual(
    buildWorkspaceGitDiffCommand(
      'opapp-frontend/tooling/tests/fixtures/agent-workbench-approval-smoke.txt',
    ),
    {
      cwd: 'opapp-frontend',
      command:
        "git diff --no-ext-diff --no-color HEAD -- 'tooling/tests/fixtures/agent-workbench-approval-smoke.txt'",
    },
  );
  assert.equal(buildWorkspaceGitDiffCommand('AGENT.md'), null);
  assert.deepEqual(buildWorkspaceWriteApprovalCommand('opapp-frontend'), {
    cwd: 'opapp-frontend',
    shell: 'powershell',
    relativePath:
      'opapp-frontend/tooling/tests/fixtures/agent-workbench-approval-smoke.txt',
    env: {
      [workbenchArtifactPathEnvVar]:
        'opapp-frontend/tooling/tests/fixtures/agent-workbench-approval-smoke.txt',
      [workbenchArtifactKindEnvVar]: 'diff',
    },
    command: [
      "$requestedCwd = 'opapp-frontend'",
      "$targetPath = 'tooling/tests/fixtures/agent-workbench-approval-smoke.txt'",
      '$newline = [Environment]::NewLine',
      "$content = '# Agent Workbench Approval Smoke Fixture' + $newline + ('approvedAt=' + (Get-Date).ToUniversalTime().ToString('o')) + $newline + ('requestedCwd=' + $requestedCwd) + $newline + 'executor=agent-workbench'",
      'Set-Content -LiteralPath $targetPath -Value $content -Encoding utf8',
      "Write-Output ('approval smoke fixture saved to ' + $targetPath)",
      'Get-Content -LiteralPath $targetPath',
      "git diff --no-ext-diff --no-color HEAD -- 'tooling/tests/fixtures/agent-workbench-approval-smoke.txt'",
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
  const frameworkApprovalCommand = buildWorkspaceWriteApprovalCommand(
    'opapp-frontend/framework',
  );
  assert.deepEqual(
    resolveWorkbenchTaskDraft({
      goal: '更新审批 smoke fixture',
      command: frameworkApprovalCommand.command,
      cwd: 'opapp-frontend/framework',
      cwdOverride: 'opapp-frontend',
      shell: 'powershell',
      env: frameworkApprovalCommand.env,
      requiresApproval: true,
    }),
    {
      title: '更新审批 smoke fixture',
      goal: '更新审批 smoke fixture',
      command: frameworkApprovalCommand.command,
      cwd: 'opapp-frontend',
      shell: 'powershell',
      env: frameworkApprovalCommand.env,
      requiresApproval: true,
      canRunDirect: false,
      approvalTitle: '允许执行任务：更新审批 smoke fixture',
      approvalDetails: `批准后会在 opapp-frontend 下执行以下命令：${frameworkApprovalCommand.command}`,
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

  const requestArtifactRunDocument: AgentRunDocument = {
    run: {
      runId: 'run-artifact-request',
      threadId: 'thread-1',
      sessionId: 'terminal-1',
      goal: 'Inspect artifact request',
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
        command: 'git diff --stat',
        cwd: 'opapp-frontend',
        shell: 'powershell',
        env: {
          [workbenchArtifactPathEnvVar]:
            'opapp-frontend/tooling/tests/fixtures/agent-workbench-approval-smoke.txt',
          [workbenchArtifactKindEnvVar]: 'diff',
        },
      },
    },
    timeline: [],
  };
  assert.deepEqual(
    resolveWorkbenchRunArtifactSummary(requestArtifactRunDocument),
    {
      kind: 'diff',
      path: 'opapp-frontend/tooling/tests/fixtures/agent-workbench-approval-smoke.txt',
      label: 'agent-workbench-approval-smoke.txt',
      source: 'request-env',
    },
  );

  assert.deepEqual(
    resolveWorkbenchRunArtifactSummary({
      ...requestArtifactRunDocument,
      timeline: [
        {
          entryId: 'artifact-1',
          runId: 'run-artifact-request',
          seq: 0,
          kind: 'artifact',
          artifactId: 'artifact-1',
          artifactKind: 'report',
          label: '审批执行报告',
          path: 'opapp-frontend/.tmp/approval-report.txt',
          mimeType: 'text/plain',
          createdAt: '2026-04-03T02:00:02.000Z',
        },
      ],
    }),
    {
      kind: 'report',
      path: 'opapp-frontend/.tmp/approval-report.txt',
      label: '审批执行报告',
      source: 'timeline',
    },
  );

  assert.deepEqual(
    summarizeWorkbenchTimeline({
      ...requestArtifactRunDocument,
      timeline: [
        {
          entryId: 'entry-1',
          runId: 'run-artifact-request',
          seq: 0,
          kind: 'terminal-event',
          sessionId: 'terminal-1',
          event: 'started',
          text: null,
          cwd: 'opapp-frontend',
          command: 'git diff --stat',
          exitCode: null,
          createdAt: '2026-04-03T02:00:01.000Z',
        },
        {
          entryId: 'entry-2',
          runId: 'run-artifact-request',
          seq: 1,
          kind: 'approval',
          approvalId: 'approval-1',
          status: 'approved',
          title: '允许执行任务：审批 smoke',
          details: '批准后执行命令',
          permissionMode: 'workspace-write',
          createdAt: '2026-04-03T02:00:02.000Z',
        },
        {
          entryId: 'entry-3',
          runId: 'run-artifact-request',
          seq: 2,
          kind: 'artifact',
          artifactId: 'artifact-1',
          artifactKind: 'diff',
          label: 'tracked diff',
          path: 'opapp-frontend/tooling/tests/fixtures/agent-workbench-approval-smoke.txt',
          mimeType: 'text/plain',
          createdAt: '2026-04-03T02:00:03.000Z',
        },
        {
          entryId: 'entry-4',
          runId: 'run-artifact-request',
          seq: 3,
          kind: 'error',
          code: 'runtime-timeout',
          message: '运行超时',
          retryable: true,
          createdAt: '2026-04-03T02:00:04.000Z',
        },
        {
          entryId: 'entry-5',
          runId: 'run-artifact-request',
          seq: 4,
          kind: 'message',
          role: 'assistant',
          content: '继续检查 diff',
          createdAt: '2026-04-03T02:00:05.000Z',
        },
        {
          entryId: 'entry-6',
          runId: 'run-artifact-request',
          seq: 5,
          kind: 'plan',
          steps: [
            {
              stepId: 'step-1',
              title: '检查 diff',
              status: 'completed',
            },
            {
              stepId: 'step-2',
              title: '整理结论',
              status: 'in_progress',
            },
          ],
          createdAt: '2026-04-03T02:00:06.000Z',
        },
        {
          entryId: 'entry-7',
          runId: 'run-artifact-request',
          seq: 6,
          kind: 'tool-call',
          callId: 'tool-1',
          toolName: 'shell_command',
          status: 'completed',
          inputText: 'git diff --stat',
          createdAt: '2026-04-03T02:00:07.000Z',
        },
        {
          entryId: 'entry-8',
          runId: 'run-artifact-request',
          seq: 7,
          kind: 'tool-result',
          callId: 'tool-1',
          status: 'success',
          outputText: '1 file changed',
          exitCode: 0,
          createdAt: '2026-04-03T02:00:08.000Z',
        },
      ],
    }),
    {
      totalCount: 8,
      messageCount: 1,
      planCount: 1,
      toolCallCount: 1,
      toolResultCount: 1,
      terminalEventCount: 1,
      approvalCount: 1,
      artifactCount: 1,
      errorCount: 1,
      otherCount: 0,
    },
  );

  const groupedTimelineItems = buildWorkbenchTimelineDisplayItems({
    ...requestArtifactRunDocument,
    timeline: [
      {
        entryId: 'entry-1',
        runId: 'run-artifact-request',
        seq: 0,
        kind: 'message',
        role: 'user',
        content: '检查结构化工具时间线',
        createdAt: '2026-04-03T02:00:01.000Z',
      },
      {
        entryId: 'entry-2',
        runId: 'run-artifact-request',
        seq: 1,
        kind: 'tool-result',
        callId: 'tool-prelude',
        status: 'error',
        outputText: 'missing tool call',
        exitCode: null,
        createdAt: '2026-04-03T02:00:02.000Z',
      },
      {
        entryId: 'entry-3',
        runId: 'run-artifact-request',
        seq: 2,
        kind: 'tool-call',
        callId: 'tool-1',
        toolName: 'shell_command',
        status: 'completed',
        inputText: 'git status',
        createdAt: '2026-04-03T02:00:03.000Z',
      },
      {
        entryId: 'entry-4',
        runId: 'run-artifact-request',
        seq: 3,
        kind: 'terminal-event',
        sessionId: 'terminal-1',
        event: 'stdout',
        text: ' M file.ts\n',
        cwd: 'opapp-frontend',
        command: 'git status',
        exitCode: null,
        createdAt: '2026-04-03T02:00:04.000Z',
      },
      {
        entryId: 'entry-5',
        runId: 'run-artifact-request',
        seq: 4,
        kind: 'tool-result',
        callId: 'tool-1',
        status: 'success',
        outputText: '$ git status\n[exit 0]\n',
        exitCode: 0,
        createdAt: '2026-04-03T02:00:05.000Z',
      },
    ],
  });
  assert.deepEqual(
    groupedTimelineItems.map(item => item.kind),
    ['entry', 'tool-invocation', 'tool-invocation'],
  );
  const pairedToolItem = groupedTimelineItems[2];
  if (pairedToolItem?.kind === 'tool-invocation') {
    assert.equal(pairedToolItem.callId, 'tool-1');
    assert.equal(pairedToolItem.toolName, 'shell_command');
    assert.equal(pairedToolItem.call?.entryId, 'entry-3');
    assert.equal(pairedToolItem.result?.entryId, 'entry-5');
    assert.equal(pairedToolItem.terminalEvents.length, 1);
    assert.equal(pairedToolItem.terminalEvents[0]?.entryId, 'entry-4');
  } else {
    assert.fail('expected the third grouped timeline item to be a tool invocation');
  }
  const orphanToolResultItem = groupedTimelineItems[1];
  if (orphanToolResultItem?.kind === 'tool-invocation') {
    assert.equal(orphanToolResultItem.call, null);
    assert.equal(orphanToolResultItem.result?.entryId, 'entry-2');
    assert.equal(orphanToolResultItem.toolName, null);
    assert.deepEqual(orphanToolResultItem.terminalEvents, []);
    assert.equal(orphanToolResultItem.toolInvocationIndex, 1);
  } else {
    assert.fail(
      'expected the second grouped timeline item to preserve an unmatched tool result',
    );
  }

  const multiToolTimelineItems = buildWorkbenchTimelineDisplayItems({
    ...requestArtifactRunDocument,
    timeline: [
      {
        entryId: 'entry-a1',
        runId: 'run-artifact-request',
        seq: 0,
        kind: 'tool-call',
        callId: 'tool-1',
        toolName: 'shell_command',
        status: 'completed',
        inputText: 'git status',
        createdAt: '2026-04-03T02:01:00.000Z',
      },
      {
        entryId: 'entry-a2',
        runId: 'run-artifact-request',
        seq: 1,
        kind: 'terminal-event',
        sessionId: 'terminal-1',
        event: 'stdout',
        text: ' M first.ts\n',
        cwd: 'opapp-frontend',
        command: 'git status',
        exitCode: null,
        createdAt: '2026-04-03T02:01:01.000Z',
      },
      {
        entryId: 'entry-a3',
        runId: 'run-artifact-request',
        seq: 2,
        kind: 'tool-result',
        callId: 'tool-1',
        status: 'success',
        outputText: '$ git status\n[exit 0]\n',
        exitCode: 0,
        createdAt: '2026-04-03T02:01:02.000Z',
      },
      {
        entryId: 'entry-a4',
        runId: 'run-artifact-request',
        seq: 3,
        kind: 'tool-call',
        callId: 'tool-2',
        toolName: 'shell_command',
        status: 'completed',
        inputText: 'git diff --stat',
        createdAt: '2026-04-03T02:01:03.000Z',
      },
      {
        entryId: 'entry-a5',
        runId: 'run-artifact-request',
        seq: 4,
        kind: 'terminal-event',
        sessionId: 'terminal-2',
        event: 'stdout',
        text: ' 1 file changed\n',
        cwd: 'opapp-frontend',
        command: 'git diff --stat',
        exitCode: null,
        createdAt: '2026-04-03T02:01:04.000Z',
      },
      {
        entryId: 'entry-a6',
        runId: 'run-artifact-request',
        seq: 5,
        kind: 'terminal-event',
        sessionId: 'terminal-2',
        event: 'exit',
        text: null,
        cwd: 'opapp-frontend',
        command: 'git diff --stat',
        exitCode: 0,
        createdAt: '2026-04-03T02:01:05.000Z',
      },
      {
        entryId: 'entry-a7',
        runId: 'run-artifact-request',
        seq: 6,
        kind: 'tool-result',
        callId: 'tool-2',
        status: 'success',
        outputText: '$ git diff --stat\n[exit 0]\n',
        exitCode: 0,
        createdAt: '2026-04-03T02:01:06.000Z',
      },
    ],
  }).filter(item => item.kind === 'tool-invocation');
  assert.deepEqual(
    multiToolTimelineItems.map(item => ({
      callId: item.callId,
      toolInvocationIndex: item.toolInvocationIndex,
      terminalEventIds: item.terminalEvents.map(event => event.entryId),
    })),
    [
      {
        callId: 'tool-1',
        toolInvocationIndex: 1,
        terminalEventIds: ['entry-a2'],
      },
      {
        callId: 'tool-2',
        toolInvocationIndex: 0,
        terminalEventIds: ['entry-a5', 'entry-a6'],
      },
    ],
  );
}
