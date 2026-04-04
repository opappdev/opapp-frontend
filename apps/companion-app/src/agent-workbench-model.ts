import {
  type AgentRunDocument,
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

const workspaceRepoRoots = ['opapp-frontend', 'opapp-desktop', 'opapp-mobile'];
const preferredWorkspaceGitDiffEntryNames = [
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.json',
];

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

export function buildWorkspaceGitDiffCommand(relativePath: string) {
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
  const relativePath = '.tmp/agent-workbench/approval-write-smoke.txt';

  return {
    cwd: '',
    shell: 'powershell' as const,
    relativePath,
    command: [
      `$requestedCwd = ${quotePowerShellLiteral(normalizedRequestedCwd)}`,
      "$targetDir = Join-Path '.tmp' 'agent-workbench'",
      'New-Item -ItemType Directory -Path $targetDir -Force | Out-Null',
      "$targetPath = Join-Path $targetDir 'approval-write-smoke.txt'",
      "$lines = @(",
      "  ('approvedAt=' + (Get-Date).ToUniversalTime().ToString('o'))",
      "  ('requestedCwd=' + $requestedCwd)",
      "  'executor=agent-workbench'",
      ')',
      'Set-Content -LiteralPath $targetPath -Value $lines -Encoding utf8',
      "Write-Output ('workspace write smoke saved to ' + $targetPath)",
      'Get-Content -LiteralPath $targetPath',
    ].join('; '),
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
