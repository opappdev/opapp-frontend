import {
  createDefaultAgentRunSettings,
  createDefaultAgentThreadIndex,
  normalizeAgentStorageId,
  parsePersistedAgentRunDocument,
  parsePersistedAgentThreadIndex,
  serializePersistedAgentRunDocument,
  serializePersistedAgentThreadDocument,
  serializePersistedAgentThreadIndex,
  type AgentApprovalMode,
  type AgentErrorTimelineEntry,
  type AgentPermissionMode,
  type AgentProviderProfile,
  type AgentRunDocument,
  type AgentRunSettings,
  type AgentRunStatus,
  type AgentRunSummary,
  type AgentThreadDocument,
  type AgentThreadIndex,
  type AgentThreadSummary,
  type AgentWorkspaceTarget,
} from './model';
import {
  agentThreadIndexPath,
  buildAgentRunDocumentPath,
  buildAgentThreadDocumentPath,
} from './storage';
import {
  createAgentTerminalTimelineEntry,
  type AgentTerminalSessionEvent,
  type AgentTerminalSessionHandle,
  type AgentTerminalShell,
  type OpenAgentTerminalSessionOptions,
} from './terminal-core';

type AgentRuntimeUserFileReader = (
  relativePath: string,
) => Promise<string | null>;
type AgentRuntimeUserFileWriter = (
  relativePath: string,
  content: string,
) => Promise<boolean>;
type TrustedWorkspaceTarget = {
  rootPath: string;
  displayName: string | null;
  trusted: boolean;
};

export type OpenPersistedAgentTerminalRunOptions = OpenAgentTerminalSessionOptions & {
  title?: string | null;
  goal?: string | null;
  permissionMode?: AgentPermissionMode | null;
  approvalMode?: AgentApprovalMode | null;
  provider?: AgentProviderProfile | null;
};

export type PersistedAgentTerminalRunHandle = AgentTerminalSessionHandle & {
  threadId: string;
  runId: string;
  whenSettled: Promise<AgentRunDocument>;
  getSnapshot(): AgentRunDocument;
};

let persistenceQueue = Promise.resolve();

function enqueuePersistenceTask(task: () => Promise<void>) {
  const queuedTask = persistenceQueue.then(task);
  persistenceQueue = queuedTask.catch(() => {});
  return queuedTask;
}

function sortThreadSummaries(
  left: AgentThreadSummary,
  right: AgentThreadSummary,
) {
  if (left.updatedAt === right.updatedAt) {
    return left.threadId.localeCompare(right.threadId);
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function createStorageId(prefix: string) {
  return normalizeAgentStorageId(
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    `${prefix} id`,
  );
}

function cloneRunDocument(document: AgentRunDocument) {
  return (
    parsePersistedAgentRunDocument(
      serializePersistedAgentRunDocument(document),
    ) ?? document
  );
}

function formatGoal({
  command,
  cwd,
  goal,
}: {
  command: string;
  cwd?: string | null;
  goal?: string | null;
}) {
  const normalizedGoal = goal?.trim();
  if (normalizedGoal) {
    return normalizedGoal;
  }

  const normalizedCwd = cwd?.trim();
  return normalizedCwd ? `${command.trim()} (${normalizedCwd})` : command.trim();
}

function formatThreadTitle({
  title,
  goal,
  command,
}: {
  title?: string | null;
  goal: string;
  command: string;
}) {
  const normalizedTitle = title?.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const candidate = goal.trim() || command.trim() || '新任务';
  return candidate.length <= 72 ? candidate : `${candidate.slice(0, 69)}...`;
}

function createWorkspaceTarget(
  workspaceTarget: TrustedWorkspaceTarget | null,
): AgentWorkspaceTarget {
  if (!workspaceTarget) {
    return {
      rootPath: null,
      displayName: null,
      trusted: false,
    };
  }

  return {
    rootPath: workspaceTarget.rootPath,
    displayName: workspaceTarget.displayName,
    trusted: workspaceTarget.trusted,
  };
}

function resolveRunSettings({
  workspaceTarget,
  provider,
  permissionMode,
  approvalMode,
}: {
  workspaceTarget: TrustedWorkspaceTarget | null;
  provider?: AgentProviderProfile | null;
  permissionMode?: AgentPermissionMode | null;
  approvalMode?: AgentApprovalMode | null;
}): AgentRunSettings {
  const defaults = createDefaultAgentRunSettings();

  return {
    workspace: createWorkspaceTarget(workspaceTarget),
    provider: provider ?? defaults.provider,
    permissionMode: permissionMode ?? defaults.permissionMode,
    approvalMode: approvalMode ?? defaults.approvalMode,
  };
}

function buildThreadDocument({
  thread,
  runId,
}: {
  thread: AgentThreadSummary;
  runId: string;
}): AgentThreadDocument {
  return {
    thread,
    runIds: [runId],
  };
}

function createInitialRunDocument({
  threadId,
  runId,
  goal,
  settings,
  createdAt,
}: {
  threadId: string;
  runId: string;
  goal: string;
  settings: AgentRunSettings;
  createdAt: string;
}): AgentRunDocument {
  const run: AgentRunSummary = {
    runId,
    threadId,
    sessionId: null,
    goal,
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    completedAt: null,
    resumedFromRunId: null,
    settings,
  };

  return {
    run,
    timeline: [],
  };
}

function createThreadSummary({
  threadId,
  runId,
  title,
  createdAt,
}: {
  threadId: string;
  runId: string;
  title: string;
  createdAt: string;
}): AgentThreadSummary {
  return {
    threadId,
    title,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
    lastRunId: runId,
    lastRunStatus: 'queued',
  };
}

function createErrorTimelineEntry({
  entryId,
  runId,
  seq,
  createdAt,
  code,
  message,
}: {
  entryId: string;
  runId: string;
  seq: number;
  createdAt: string;
  code?: string | null;
  message: string;
}): AgentErrorTimelineEntry {
  return {
    entryId,
    runId,
    seq,
    kind: 'error',
    createdAt,
    code: code?.trim() || null,
    message,
    retryable: false,
  };
}

function resolveExitStatus({
  exitCode,
  cancelRequested,
}: {
  exitCode: number | null;
  cancelRequested: boolean;
}): AgentRunStatus {
  if (cancelRequested) {
    return 'cancelled';
  }

  return exitCode === 0 ? 'completed' : 'failed';
}

async function loadThreadIndex(
  readUserFile: AgentRuntimeUserFileReader,
): Promise<AgentThreadIndex> {
  const raw = await readUserFile(agentThreadIndexPath);
  return raw ? parsePersistedAgentThreadIndex(raw) ?? createDefaultAgentThreadIndex() : createDefaultAgentThreadIndex();
}

export function createPersistedAgentTerminalRuntime({
  readUserFile = async relativePath => {
    const {readUserFile: readUserFileFromFilesystem} = await import(
      '@opapp/framework-filesystem'
    );
    return readUserFileFromFilesystem(relativePath);
  },
  writeUserFile = async (relativePath, content) => {
    const {writeUserFile: writeUserFileFromFilesystem} = await import(
      '@opapp/framework-filesystem'
    );
    return writeUserFileFromFilesystem(relativePath, content);
  },
  getTrustedWorkspaceTarget = async () => {
    const {getTrustedWorkspaceTarget: getTrustedWorkspaceTargetFromFilesystem} =
      await import('@opapp/framework-filesystem');
    return getTrustedWorkspaceTargetFromFilesystem();
  },
  openAgentTerminalSession = async (
    options: OpenAgentTerminalSessionOptions,
    listener?: {
      onEvent?: (event: AgentTerminalSessionEvent) => void;
      onError?: (error: Error & {code?: string}) => void;
    },
  ) => {
    const {openAgentTerminalSession: openNativeAgentTerminalSession} =
      await import('./terminal');
    return openNativeAgentTerminalSession(options, listener);
  },
  now = () => new Date().toISOString(),
  createId = createStorageId,
}: {
  readUserFile?: AgentRuntimeUserFileReader;
  writeUserFile?: AgentRuntimeUserFileWriter;
  getTrustedWorkspaceTarget?: () => Promise<TrustedWorkspaceTarget | null>;
  openAgentTerminalSession?: (
    options: OpenAgentTerminalSessionOptions,
    listener?: {
      onEvent?: (event: AgentTerminalSessionEvent) => void;
      onError?: (error: Error & {code?: string}) => void;
    },
  ) => Promise<AgentTerminalSessionHandle>;
  now?: () => string;
  createId?: (prefix: string) => string;
}) {
  async function persistUserFile(relativePath: string, content: string) {
    const persisted = await writeUserFile(relativePath, content);
    if (!persisted) {
      throw new Error(`Failed to persist ${relativePath}.`);
    }
  }

  async function openRun(
    options: OpenPersistedAgentTerminalRunOptions,
  ): Promise<PersistedAgentTerminalRunHandle> {
    const threadId = createId('thread');
    const runId = createId('run');
    const createdAt = now();
    const workspaceTarget = await getTrustedWorkspaceTarget();
    const goal = formatGoal(options);
    const thread = createThreadSummary({
      threadId,
      runId,
      title: formatThreadTitle({
        title: options.title,
        goal,
        command: options.command,
      }),
      createdAt,
    });
    const runDocument = createInitialRunDocument({
      threadId,
      runId,
      goal,
      settings: resolveRunSettings({
        workspaceTarget,
        provider: options.provider,
        permissionMode: options.permissionMode,
        approvalMode: options.approvalMode,
      }),
      createdAt,
    });
    let nextSeq = 0;
    let cancelRequested = false;
    let settled = false;

    let resolveSettled!: (document: AgentRunDocument) => void;
    const whenSettled = new Promise<AgentRunDocument>(resolve => {
      resolveSettled = resolve;
    });

    const persistRunState = (includeThreadState: boolean) =>
      enqueuePersistenceTask(async () => {
        await persistUserFile(
          buildAgentRunDocumentPath(runId),
          serializePersistedAgentRunDocument(runDocument),
        );

        if (!includeThreadState) {
          return;
        }

        await persistUserFile(
          buildAgentThreadDocumentPath(threadId),
          serializePersistedAgentThreadDocument(
            buildThreadDocument({
              thread,
              runId,
            }),
          ),
        );

        const index = await loadThreadIndex(readUserFile);
        const threads = [
          ...index.threads.filter(existing => existing.threadId !== thread.threadId),
          {...thread},
        ].sort(sortThreadSummaries);

        await persistUserFile(
          agentThreadIndexPath,
          serializePersistedAgentThreadIndex({
            updatedAt: thread.updatedAt,
            threads,
          }),
        );
      });

    const settleWhenReady = (persistPromise: Promise<void>) => {
      if (settled) {
        return;
      }

      settled = true;
      void persistPromise.finally(() => {
        resolveSettled(cloneRunDocument(runDocument));
      });
    };

    const appendTerminalEvent = (event: AgentTerminalSessionEvent) => {
      runDocument.timeline.push(
        createAgentTerminalTimelineEntry({
          entryId: createId('entry'),
          runId,
          seq: nextSeq,
          event,
        }),
      );
      nextSeq += 1;

      runDocument.run.updatedAt = event.createdAt;
      thread.updatedAt = event.createdAt;
      thread.lastRunStatus = runDocument.run.status;
      thread.lastRunId = runId;
    };

    const appendErrorEvent = ({
      code,
      message,
      createdAt,
    }: {
      code?: string | null;
      message: string;
      createdAt: string;
    }) => {
      runDocument.timeline.push(
        createErrorTimelineEntry({
          entryId: createId('entry'),
          runId,
          seq: nextSeq,
          createdAt,
          code,
          message,
        }),
      );
      nextSeq += 1;
      runDocument.run.updatedAt = createdAt;
      thread.updatedAt = createdAt;
    };

    await persistRunState(true);

    let sessionHandle: AgentTerminalSessionHandle;
    try {
      sessionHandle = await openAgentTerminalSession(
        {
          command: options.command,
          cwd: options.cwd,
          env: options.env,
          shell: options.shell,
        },
        {
          onEvent(event) {
            appendTerminalEvent(event);

            if (event.event === 'started') {
              runDocument.run.status = 'running';
              runDocument.run.startedAt = runDocument.run.startedAt ?? event.createdAt;
            } else if (event.event === 'exit') {
              runDocument.run.status = resolveExitStatus({
                exitCode: event.exitCode,
                cancelRequested,
              });
              runDocument.run.completedAt = event.createdAt;
            }

            thread.lastRunStatus = runDocument.run.status;

            const persistPromise = persistRunState(
              event.event === 'started' || event.event === 'exit',
            );
            if (event.event === 'exit') {
              settleWhenReady(persistPromise);
            }
          },
          onError(error) {
            const createdAt = now();
            appendErrorEvent({
              code: error.code,
              message: error.message,
              createdAt,
            });
            runDocument.run.status = cancelRequested ? 'cancelled' : 'failed';
            runDocument.run.completedAt = createdAt;
            runDocument.run.updatedAt = createdAt;
            thread.updatedAt = createdAt;
            thread.lastRunStatus = runDocument.run.status;

            settleWhenReady(persistRunState(true));
          },
        },
      );
    } catch (error) {
      const createdAt = now();
      const normalizedError =
        error instanceof Error
          ? (error as Error & {code?: string})
          : (new Error('Failed to open persisted agent terminal run.') as Error & {
              code?: string;
            });
      appendErrorEvent({
        code: normalizedError.code,
        message: normalizedError.message,
        createdAt,
      });
      runDocument.run.status = 'failed';
      runDocument.run.completedAt = createdAt;
      runDocument.run.updatedAt = createdAt;
      thread.updatedAt = createdAt;
      thread.lastRunStatus = runDocument.run.status;

      settleWhenReady(persistRunState(true));
      throw normalizedError;
    }

    runDocument.run.sessionId = sessionHandle.sessionId;
    const sessionOpenedAt = now();
    if (runDocument.run.updatedAt.localeCompare(sessionOpenedAt) < 0) {
      runDocument.run.updatedAt = sessionOpenedAt;
      thread.updatedAt = sessionOpenedAt;
    }
    thread.lastRunStatus = runDocument.run.status;
    void persistRunState(true);

    return {
      threadId,
      runId,
      sessionId: sessionHandle.sessionId,
      whenSettled,
      getSnapshot() {
        return cloneRunDocument(runDocument);
      },
      async cancel() {
        cancelRequested = true;
        await sessionHandle.cancel();
      },
      async sendInput(text: string) {
        await sessionHandle.sendInput(text);
      },
    };
  }

  return {
    openRun,
  };
}

const persistedAgentTerminalRuntime = createPersistedAgentTerminalRuntime({});

export const openPersistedAgentTerminalRun = persistedAgentTerminalRuntime.openRun;
