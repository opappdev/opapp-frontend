import {
  type AgentArtifactKind,
  type AgentTerminalShell,
  type AgentRunDocument,
  type AgentTerminalTimelineEntry,
  type AgentToolCallTimelineEntry,
  type AgentToolResultTimelineEntry,
  type AgentThreadSummary,
} from '@opapp/framework-agent-runtime';
import {
  type TrustedWorkspaceTarget,
  type WorkspaceEntry,
} from '@opapp/framework-filesystem';
import {appI18n} from '@opapp/framework-i18n';

export type WorkspaceChoiceItem = {
  key: string;
  label: string;
  detail: string;
};

export type WorkbenchTaskDraft = {
  title: string;
  goal: string;
  command: string;
  cwd: string | undefined;
  shell?: AgentTerminalShell;
  env?: Record<string, string>;
  requiresApproval: boolean;
  canRunDirect: boolean;
  approvalTitle: string | undefined;
  approvalDetails: string | undefined;
};

export type WorkbenchRunArtifactSummary = {
  kind: AgentArtifactKind | null;
  path: string | null;
  label: string | null;
  source: 'timeline' | 'request-env' | null;
};

export type WorkbenchWorkspaceRecoveryTarget = {
  rootPath: string;
  displayName: string | null;
  preferredCwd: string | null;
  source: 'selected-run' | 'latest-thread-run';
};

export type WorkbenchTimelineSummary = {
  totalCount: number;
  messageCount: number;
  planCount: number;
  toolCallCount: number;
  toolResultCount: number;
  terminalEventCount: number;
  approvalCount: number;
  artifactCount: number;
  errorCount: number;
  otherCount: number;
};

type WorkbenchTimelineDisplayEntry = Exclude<
  AgentRunDocument['timeline'][number],
  AgentToolCallTimelineEntry | AgentToolResultTimelineEntry
>;

export type WorkbenchToolInvocationTimelineItem = {
  kind: 'tool-invocation';
  key: string;
  toolInvocationIndex: number;
  callId: string;
  toolName: string | null;
  call: AgentToolCallTimelineEntry | null;
  result: AgentToolResultTimelineEntry | null;
  terminalEvents: AgentTerminalTimelineEntry[];
};

export type WorkbenchTimelineDisplayItem =
  | {
      kind: 'entry';
      key: string;
      entry: WorkbenchTimelineDisplayEntry;
    }
  | WorkbenchToolInvocationTimelineItem;

const workspaceRepoRoots = ['opapp-frontend', 'opapp-desktop', 'opapp-mobile'];
const preferredWorkspaceGitDiffEntryNames = [
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.json',
];
const defaultWorkspaceWriteApprovalRepoRoot = 'opapp-frontend';
const workspaceWriteApprovalFixtureRepoRelativePath =
  'tooling/tests/fixtures/agent-workbench-approval-smoke.txt';

export const workbenchArtifactPathEnvVar =
  'OPAPP_AGENT_WORKBENCH_ARTIFACT_PATH';
export const workbenchArtifactKindEnvVar =
  'OPAPP_AGENT_WORKBENCH_ARTIFACT_KIND';

const workbenchArtifactKinds = ['diff', 'file', 'image', 'log', 'report'];
const workbenchArtifactKindSet = new Set(workbenchArtifactKinds);

function resolveWorkspaceChoiceLabel(relativePath: string) {
  const normalizedPath = relativePath.trim();
  if (!normalizedPath) {
    return appI18n.agentWorkbench.workspace.rootLabel;
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  return segments.at(-1) ?? normalizedPath;
}

export function createWorkspaceChoices({
  trustedWorkspace,
  directories,
  currentPath,
}: {
  trustedWorkspace: TrustedWorkspaceTarget | null;
  directories: ReadonlyArray<WorkspaceEntry>;
  currentPath: string;
}): WorkspaceChoiceItem[] {
  const choices: WorkspaceChoiceItem[] = [
    {
      key: '',
      label: appI18n.agentWorkbench.workspace.rootLabel,
      detail:
        trustedWorkspace?.displayName ??
        appI18n.agentWorkbench.workspace.rootDetail,
    },
  ];
  const normalizedCurrentPath = currentPath.trim();
  if (
    normalizedCurrentPath.length > 0 &&
    !directories.some(entry => entry.relativePath === normalizedCurrentPath)
  ) {
    choices.push({
      key: normalizedCurrentPath,
      label: resolveWorkspaceChoiceLabel(normalizedCurrentPath),
      detail: normalizedCurrentPath,
    });
  }

  choices.push(
    ...directories.map(entry => ({
      key: entry.relativePath,
      label: entry.name,
      detail: entry.relativePath,
    })),
  );

  return choices;
}

export function resolvePreferredWorkspacePath(
  directories: ReadonlyArray<WorkspaceEntry>,
  currentPath?: string | null,
) {
  if (typeof currentPath === 'string') {
    const normalizedCurrent = currentPath.trim();
    if (normalizedCurrent.length > 0) {
      return normalizedCurrent;
    }

    return '';
  }

  for (const preferredPath of ['opapp-frontend', 'opapp-desktop', 'opapp-mobile']) {
    if (directories.some(entry => entry.relativePath === preferredPath)) {
      return preferredPath;
    }
  }

  return directories[0]?.relativePath ?? '';
}

export function resolveWorkbenchWorkspaceRecoveryTarget({
  selectedRunDocument,
  threadRunDocuments,
}: {
  selectedRunDocument: AgentRunDocument | null;
  threadRunDocuments: ReadonlyArray<AgentRunDocument>;
}): WorkbenchWorkspaceRecoveryTarget | null {
  const candidates: Array<{
    source: WorkbenchWorkspaceRecoveryTarget['source'];
    document: AgentRunDocument | null;
  }> = [
    {
      source: 'selected-run',
      document: selectedRunDocument,
    },
    {
      source: 'latest-thread-run',
      document: threadRunDocuments[0] ?? null,
    },
  ];
  const seenRootPaths = new Set<string>();

  for (const candidate of candidates) {
    const workspace = candidate.document?.run.settings.workspace;
    const rootPath = workspace?.rootPath?.trim() ?? '';
    if (!rootPath || seenRootPaths.has(rootPath)) {
      continue;
    }

    seenRootPaths.add(rootPath);
    return {
      rootPath,
      displayName: workspace?.displayName ?? null,
      preferredCwd: candidate.document?.run.request?.cwd ?? null,
      source: candidate.source,
    };
  }

  return null;
}

export function resolveSelectedThreadId(
  threads: ReadonlyArray<AgentThreadSummary>,
  currentThreadId: string | null,
) {
  if (
    currentThreadId &&
    threads.some(thread => thread.threadId === currentThreadId)
  ) {
    return currentThreadId;
  }

  return threads[0]?.threadId ?? null;
}

function sortRunDocumentsByUpdatedAtDesc(
  left: AgentRunDocument,
  right: AgentRunDocument,
) {
  if (left.run.updatedAt === right.run.updatedAt) {
    return right.run.runId.localeCompare(left.run.runId);
  }

  return right.run.updatedAt.localeCompare(left.run.updatedAt);
}

export function resolveThreadRunHistorySelection({
  runDocuments,
  runIds,
  currentRunId,
}: {
  runDocuments: ReadonlyArray<AgentRunDocument>;
  runIds: ReadonlyArray<string>;
  currentRunId: string | null;
}) {
  const orderedRunDocuments: AgentRunDocument[] = [];
  const runDocumentById = new Map(
    runDocuments.map(document => [document.run.runId, document]),
  );
  const seenRunIds = new Set<string>();

  for (let index = runIds.length - 1; index >= 0; index -= 1) {
    const runId = runIds[index];
    const document = runDocumentById.get(runId);
    if (!document || seenRunIds.has(runId)) {
      continue;
    }

    orderedRunDocuments.push(document);
    seenRunIds.add(runId);
  }

  orderedRunDocuments.push(
    ...runDocuments
      .filter(document => !seenRunIds.has(document.run.runId))
      .sort(sortRunDocumentsByUpdatedAtDesc),
  );

  const selectedRunId =
    currentRunId &&
    orderedRunDocuments.some(document => document.run.runId === currentRunId)
      ? currentRunId
      : orderedRunDocuments[0]?.run.runId ?? null;

  return {
    runDocuments: orderedRunDocuments,
    selectedRunId,
    selectedRunDocument:
      orderedRunDocuments.find(document => document.run.runId === selectedRunId) ??
      null,
  };
}

export function buildTerminalTranscript(document: AgentRunDocument | null) {
  if (!document) {
    return '';
  }

  return document.timeline
    .flatMap(entry => {
      if (entry.kind !== 'terminal-event') {
        return [];
      }

      switch (entry.event) {
        case 'started':
          return [`$ ${entry.command ?? document.run.goal}\n`];
        case 'stdout':
          return [entry.text ?? ''];
        case 'stderr':
          return [entry.text ? `[stderr] ${entry.text}` : ''];
        case 'stdin':
          return [entry.text ? `> ${entry.text}` : ''];
        case 'exit':
          return [`\n[exit ${entry.exitCode ?? appI18n.common.unknown}]\n`];
        default:
          return [];
      }
    })
    .join('');
}

function quotePowerShellLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function normalizeArtifactValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function isWorkbenchArtifactKind(value: string): value is AgentArtifactKind {
  return workbenchArtifactKindSet.has(value);
}

function resolveRequestedWorkbenchArtifact(
  env: Record<string, string> | null | undefined,
) {
  if (!env) {
    return null;
  }

  const rawKind = normalizeArtifactValue(env[workbenchArtifactKindEnvVar]);
  const path = normalizeArtifactValue(env[workbenchArtifactPathEnvVar]);
  if (!rawKind || !isWorkbenchArtifactKind(rawKind) || !path) {
    return null;
  }

  const segments = path.split(/[\\/]+/).filter(Boolean);
  return {
    kind: rawKind,
    path,
    label: segments.at(-1) ?? path,
  };
}

function resolveWorkspaceRepoRoot(relativePath: string) {
  const normalizedPath = relativePath.trim();
  const repoRoot = normalizedPath.split('/').filter(Boolean)[0] ?? '';
  return workspaceRepoRoots.includes(repoRoot)
    ? repoRoot
    : defaultWorkspaceWriteApprovalRepoRoot;
}

const directShellReadonlyCommands = new Set([
  'cat',
  'dir',
  'gc',
  'gci',
  'get-childitem',
  'get-content',
  'ls',
  'pwd',
  'rg',
  'type',
]);
const directGitReadonlySubcommands = new Set([
  'branch',
  'diff',
  'log',
  'ls-files',
  'rev-parse',
  'show',
  'status',
]);

function tokenizeWorkbenchCommand(command: string) {
  return command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
}

export function canRunWorkbenchTaskDirect(command: string) {
  const normalizedCommand = command.trim();
  if (
    !normalizedCommand ||
    /[\r\n]/.test(normalizedCommand) ||
    /[;&|><]/.test(normalizedCommand)
  ) {
    return false;
  }

  const tokens = tokenizeWorkbenchCommand(normalizedCommand);
  const executable = tokens[0]?.toLowerCase();
  if (!executable) {
    return false;
  }

  if (executable === 'git') {
    const subcommand = tokens[1]?.toLowerCase();
    return subcommand ? directGitReadonlySubcommands.has(subcommand) : false;
  }

  return directShellReadonlyCommands.has(executable);
}

export function buildWorkspaceGitDiffCommand(
  relativePath: string,
): {cwd: string; command: string; shell?: AgentTerminalShell} | null {
  const segments = relativePath
    .trim()
    .split('/')
    .filter(Boolean);
  const repoRoot = segments[0] ?? '';
  if (!workspaceRepoRoots.includes(repoRoot)) {
    return null;
  }

  const repoRelativePath = segments.slice(1).join('/');
  if (!repoRelativePath) {
    return null;
  }

  return {
    cwd: repoRoot,
    command: `git diff --no-ext-diff --no-color HEAD -- ${quotePowerShellLiteral(repoRelativePath)}`,
  };
}

export function buildWorkspaceWriteApprovalCommand(requestedCwd: string) {
  const normalizedRequestedCwd = requestedCwd.trim() || '.';
  const repoRoot = resolveWorkspaceRepoRoot(normalizedRequestedCwd);
  const relativePath = `${repoRoot}/${workspaceWriteApprovalFixtureRepoRelativePath}`;

  return {
    cwd: repoRoot,
    shell: 'powershell' as const,
    relativePath,
    env: {
      [workbenchArtifactPathEnvVar]: relativePath,
      [workbenchArtifactKindEnvVar]: 'diff',
    },
    command: [
      `$requestedCwd = ${quotePowerShellLiteral(normalizedRequestedCwd)}`,
      `$targetPath = ${quotePowerShellLiteral(
        workspaceWriteApprovalFixtureRepoRelativePath,
      )}`,
      "$newline = [Environment]::NewLine",
      "$content = '# Agent Workbench Approval Smoke Fixture' + $newline + ('approvedAt=' + (Get-Date).ToUniversalTime().ToString('o')) + $newline + ('requestedCwd=' + $requestedCwd) + $newline + 'executor=agent-workbench'",
      'Set-Content -LiteralPath $targetPath -Value $content -Encoding utf8',
      "Write-Output ('approval smoke fixture saved to ' + $targetPath)",
      'Get-Content -LiteralPath $targetPath',
      `git diff --no-ext-diff --no-color HEAD -- ${quotePowerShellLiteral(
        workspaceWriteApprovalFixtureRepoRelativePath,
      )}`,
    ].join('; '),
  };
}

export function resolveWorkbenchRunArtifactSummary(
  document: AgentRunDocument | null,
): WorkbenchRunArtifactSummary {
  if (!document) {
    return {
      kind: null,
      path: null,
      label: null,
      source: null,
    };
  }

  for (let index = document.timeline.length - 1; index >= 0; index -= 1) {
    const entry = document.timeline[index];
    if (entry.kind !== 'artifact') {
      continue;
    }

    const normalizedPath = normalizeArtifactValue(entry.path);
    const normalizedLabel = normalizeArtifactValue(entry.label) ?? normalizedPath;
    return {
      kind: entry.artifactKind,
      path: normalizedPath,
      label: normalizedLabel,
      source: 'timeline',
    };
  }

  const requestedArtifact = resolveRequestedWorkbenchArtifact(
    document.run.request?.env,
  );
  if (!requestedArtifact) {
    return {
      kind: null,
      path: null,
      label: null,
      source: null,
    };
  }

  return {
    kind: requestedArtifact.kind,
    path: requestedArtifact.path,
    label: requestedArtifact.label,
    source: 'request-env',
  };
}

export function summarizeWorkbenchTimeline(
  document: AgentRunDocument | null,
): WorkbenchTimelineSummary {
  const summary: WorkbenchTimelineSummary = {
    totalCount: document?.timeline.length ?? 0,
    messageCount: 0,
    planCount: 0,
    toolCallCount: 0,
    toolResultCount: 0,
    terminalEventCount: 0,
    approvalCount: 0,
    artifactCount: 0,
    errorCount: 0,
    otherCount: 0,
  };

  if (!document) {
    return summary;
  }

  for (const entry of document.timeline) {
    switch (entry.kind) {
      case 'message':
        summary.messageCount += 1;
        break;
      case 'plan':
        summary.planCount += 1;
        break;
      case 'tool-call':
        summary.toolCallCount += 1;
        break;
      case 'tool-result':
        summary.toolResultCount += 1;
        break;
      case 'terminal-event':
        summary.terminalEventCount += 1;
        break;
      case 'approval':
        summary.approvalCount += 1;
        break;
      case 'artifact':
        summary.artifactCount += 1;
        break;
      case 'error':
        summary.errorCount += 1;
        break;
      default:
        summary.otherCount += 1;
        break;
    }
  }

  return summary;
}

export function buildWorkbenchTimelineDisplayItems(
  document: AgentRunDocument | null,
): WorkbenchTimelineDisplayItem[] {
  if (!document) {
    return [];
  }

  type RawWorkbenchTimelineDisplayItem =
    | Extract<WorkbenchTimelineDisplayItem, {kind: 'entry'}>
    | Omit<WorkbenchToolInvocationTimelineItem, 'toolInvocationIndex'>;

  const toolResultsByCallId = new Map<string, AgentToolResultTimelineEntry[]>();
  const nextToolCallSeqByEntryId = new Map<string, number>();
  let nextToolCallSeq = Number.POSITIVE_INFINITY;

  for (let index = document.timeline.length - 1; index >= 0; index -= 1) {
    const entry = document.timeline[index];
    nextToolCallSeqByEntryId.set(entry.entryId, nextToolCallSeq);
    if (entry.kind === 'tool-call') {
      nextToolCallSeq = entry.seq;
    }
  }

  for (const entry of document.timeline) {
    if (entry.kind !== 'tool-result') {
      continue;
    }

    const results = toolResultsByCallId.get(entry.callId);
    if (results) {
      results.push(entry);
    } else {
      toolResultsByCallId.set(entry.callId, [entry]);
    }
  }

  const consumedToolResultIds = new Set<string>();
  const consumedTerminalEventIds = new Set<string>();
  const displayItems: RawWorkbenchTimelineDisplayItem[] = [];

  for (const entry of document.timeline) {
    if (entry.kind === 'approval') {
      continue;
    }

    if (entry.kind === 'tool-call') {
      const resultCandidates = toolResultsByCallId.get(entry.callId) ?? [];
      const resultIndex = resultCandidates.findIndex(
        candidate =>
          candidate.seq > entry.seq &&
          !consumedToolResultIds.has(candidate.entryId),
      );
      const pairedResult =
        resultIndex >= 0 ? resultCandidates[resultIndex] : null;
      if (pairedResult) {
        consumedToolResultIds.add(pairedResult.entryId);
      }
      const terminalEventUpperBoundSeq = Math.min(
        pairedResult?.seq ?? Number.POSITIVE_INFINITY,
        nextToolCallSeqByEntryId.get(entry.entryId) ?? Number.POSITIVE_INFINITY,
      );
      const terminalEvents: AgentTerminalTimelineEntry[] = [];
      for (const candidate of document.timeline) {
        if (candidate.seq <= entry.seq) {
          continue;
        }
        if (candidate.seq >= terminalEventUpperBoundSeq) {
          break;
        }
        if (
          candidate.kind === 'terminal-event' &&
          !consumedTerminalEventIds.has(candidate.entryId)
        ) {
          terminalEvents.push(candidate);
        }
      }
      for (const terminalEvent of terminalEvents) {
        consumedTerminalEventIds.add(terminalEvent.entryId);
      }

      displayItems.push({
        kind: 'tool-invocation',
        key: entry.entryId,
        callId: entry.callId,
        toolName: entry.toolName,
        call: entry,
        result: pairedResult,
        terminalEvents,
      });
      continue;
    }

    if (entry.kind === 'tool-result') {
      if (consumedToolResultIds.has(entry.entryId)) {
        continue;
      }

      displayItems.push({
        kind: 'tool-invocation',
        key: entry.entryId,
        callId: entry.callId,
        toolName: null,
        call: null,
        result: entry,
        terminalEvents: [],
      });
      continue;
    }

    if (
      entry.kind === 'terminal-event' &&
      consumedTerminalEventIds.has(entry.entryId)
    ) {
      continue;
    }

    displayItems.push({
      kind: 'entry',
      key: entry.entryId,
      entry,
    });
  }

  // Reserve tool.0 for the latest grouped invocation so smoke coverage stays
  // stable after a run starts emitting more than one tool card.
  let nextToolInvocationIndex =
    displayItems.filter(item => item.kind === 'tool-invocation').length - 1;
  return displayItems.map(item =>
    item.kind === 'tool-invocation'
      ? {
          ...item,
          toolInvocationIndex: nextToolInvocationIndex--,
        }
      : item,
  );
}

export function resolveWorkbenchTaskDraft({
  goal,
  command,
  cwd,
  cwdOverride,
  shell,
  env,
  requiresApproval,
}: {
  goal: string;
  command: string;
  cwd: string;
  cwdOverride?: string;
  shell?: AgentTerminalShell;
  env?: Record<string, string>;
  requiresApproval: boolean;
}): WorkbenchTaskDraft | null {
  const normalizedGoal = goal.trim();
  const normalizedCommand = command.trim();

  if (!normalizedCommand) {
    return null;
  }

  const displayGoal = normalizedGoal || normalizedCommand;
  const normalizedCwd = (cwdOverride ?? cwd).trim();
  const cwdLabel =
    normalizedCwd || appI18n.agentWorkbench.workspace.rootLabel;
  const canRunDirect = canRunWorkbenchTaskDirect(normalizedCommand);
  const normalizedEnv =
    env && Object.keys(env).length > 0 ? {...env} : undefined;

  return {
    title: displayGoal,
    goal: displayGoal,
    command: normalizedCommand,
    cwd: normalizedCwd || undefined,
    ...(shell ? {shell} : {}),
    ...(normalizedEnv ? {env: normalizedEnv} : {}),
    requiresApproval,
    canRunDirect,
    approvalTitle: requiresApproval
      ? appI18n.agentWorkbench.approval.commandRequestTitle(displayGoal)
      : undefined,
    approvalDetails: requiresApproval
      ? appI18n.agentWorkbench.approval.commandRequestDetails(
          normalizedCommand,
          cwdLabel,
        )
      : undefined,
  };
}

function resolveWorkspaceGitDiffEntryPriority(entry: WorkspaceEntry) {
  const preferredIndex = preferredWorkspaceGitDiffEntryNames.indexOf(entry.name);
  return preferredIndex >= 0 ? preferredIndex : preferredWorkspaceGitDiffEntryNames.length;
}

export function resolveWorkspaceGitDiffCandidate(
  entries: ReadonlyArray<WorkspaceEntry>,
) {
  const sortedEntries = entries
    .filter(entry => entry.kind === 'file')
    .sort((left, right) => {
      const priorityDiff =
        resolveWorkspaceGitDiffEntryPriority(left) -
        resolveWorkspaceGitDiffEntryPriority(right);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return left.relativePath.localeCompare(right.relativePath);
    });

  for (const entry of sortedEntries) {
    const gitDiffCommand = buildWorkspaceGitDiffCommand(entry.relativePath);
    if (gitDiffCommand) {
      return {
        entry,
        gitDiffCommand,
      };
    }
  }

  return null;
}
