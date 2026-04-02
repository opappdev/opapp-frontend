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
  currentPath: string,
) {
  const normalizedCurrent = currentPath.trim();
  if (normalizedCurrent.length > 0) {
    return normalizedCurrent;
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
