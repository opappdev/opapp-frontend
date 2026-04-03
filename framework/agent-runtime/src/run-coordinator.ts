import {
  createDefaultAgentRunSettings,
  createDefaultAgentThreadIndex,
  normalizeAgentStorageId,
  parsePersistedAgentRunDocument,
  parsePersistedAgentThreadDocument,
  parsePersistedAgentThreadIndex,
  serializePersistedAgentRunDocument,
  serializePersistedAgentThreadDocument,
  serializePersistedAgentThreadIndex,
  type AgentApprovalMode,
  type AgentApprovalTimelineEntry,
  type AgentErrorTimelineEntry,
  type AgentPermissionMode,
  type AgentProviderProfile,
  type AgentRunDocument,
  type AgentRunSettings,
  type AgentRunStatus,
  type AgentRunSummary,
  type AgentTerminalRunRequest,
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

export type OpenPersistedAgentTerminalRunOptions =
  OpenAgentTerminalSessionOptions & {
    title?: string | null;
    goal?: string | null;
    permissionMode?: AgentPermissionMode | null;
    approvalMode?: AgentApprovalMode | null;
    provider?: AgentProviderProfile | null;
    requiresApproval?: boolean | null;
    approvalTitle?: string | null;
    approvalDetails?: string | null;
  };

export type ApprovePersistedAgentTerminalRunOptions = {
  runId: string;
  approvalId?: string | null;
};

export type RejectPersistedAgentTerminalRunOptions = {
  runId: string;
  approvalId?: string | null;
};

export type PersistedAgentTerminalRunHandle = {
  threadId: string;
  runId: string;
  readonly sessionId: string | null;
  whenSettled: Promise<AgentRunDocument>;
  getSnapshot(): AgentRunDocument;
  cancel(): Promise<void>;
  sendInput(text: string): Promise<void>;
};

type PersistedRunState = {
  runDocument: AgentRunDocument;
  thread: AgentThreadSummary;
  runIds: string[];
};

type RunSettlementListener = (document: AgentRunDocument) => void;

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

function normalizeRunRequest(
  options: OpenAgentTerminalSessionOptions,
): AgentTerminalRunRequest {
  const command = options.command.trim();
  if (!command) {
    throw new Error('Persisted agent terminal command is required.');
  }

  const env: Record<string, string> = {};
  if (options.env) {
    for (const [rawKey, rawValue] of Object.entries(options.env)) {
      const key = rawKey.trim();
      if (!key || typeof rawValue !== 'string') {
        continue;
      }

      env[key] = rawValue;
    }
  }

  return {
    command,
    cwd: typeof options.cwd === 'string' ? options.cwd.trim() || null : null,
    shell: options.shell ?? null,
    env,
  };
}

function buildThreadDocument({
  thread,
  runIds,
}: {
  thread: AgentThreadSummary;
  runIds: ReadonlyArray<string>;
}) {
  return {
    thread,
    runIds: [...new Set(runIds)].sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}

function createInitialRunDocument({
  threadId,
  runId,
  goal,
  settings,
  request,
  createdAt,
  status,
}: {
  threadId: string;
  runId: string;
  goal: string;
  settings: AgentRunSettings;
  request: AgentTerminalRunRequest;
  createdAt: string;
  status: AgentRunStatus;
}): AgentRunDocument {
  const run: AgentRunSummary = {
    runId,
    threadId,
    sessionId: null,
    goal,
    status,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    completedAt: null,
    resumedFromRunId: null,
    settings,
    request,
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
  lastRunStatus = 'queued',
}: {
  threadId: string;
  runId: string;
  title: string;
  createdAt: string;
  lastRunStatus?: AgentRunStatus;
}) {
  return {
    threadId,
    title,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
    lastRunId: runId,
    lastRunStatus,
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

function createApprovalTimelineEntry({
  entryId,
  runId,
  seq,
  createdAt,
  approvalId,
  title,
  details,
  permissionMode,
}: {
  entryId: string;
  runId: string;
  seq: number;
  createdAt: string;
  approvalId: string;
  title: string;
  details?: string | null;
  permissionMode?: AgentPermissionMode | null;
}): AgentApprovalTimelineEntry {
  return {
    entryId,
    runId,
    seq,
    kind: 'approval',
    createdAt,
    approvalId,
    status: 'pending',
    title,
    details: details?.trim() || null,
    permissionMode: permissionMode ?? null,
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

function mergeRunIds(runIds: ReadonlyArray<string>, runId: string) {
  return [...new Set([...runIds, runId])].sort((left, right) =>
    left.localeCompare(right),
  );
}

function findPendingApprovalEntry(
  document: AgentRunDocument,
  approvalId?: string | null,
) {
  for (let index = document.timeline.length - 1; index >= 0; index -= 1) {
    const entry = document.timeline[index];
    if (
      entry.kind === 'approval' &&
      entry.status === 'pending' &&
      (!approvalId || entry.approvalId === approvalId)
    ) {
      return entry;
    }
  }

  return null;
}

async function loadThreadIndex(
  readUserFile: AgentRuntimeUserFileReader,
) {
  const raw = await readUserFile(agentThreadIndexPath);
  return raw
    ? parsePersistedAgentThreadIndex(raw) ?? createDefaultAgentThreadIndex()
    : createDefaultAgentThreadIndex();
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
  const settlementListeners = new Map<string, Set<RunSettlementListener>>();

  function createWhenSettledPromise(runId: string) {
    return new Promise<AgentRunDocument>(resolve => {
      const listeners = settlementListeners.get(runId) ?? new Set();
      listeners.add(resolve);
      settlementListeners.set(runId, listeners);
    });
  }

  function resolveSettlement(runId: string, document: AgentRunDocument) {
    const listeners = settlementListeners.get(runId);
    if (!listeners || listeners.size === 0) {
      return;
    }

    settlementListeners.delete(runId);
    const snapshot = cloneRunDocument(document);
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  async function persistUserFile(relativePath: string, content: string) {
    const persisted = await writeUserFile(relativePath, content);
    if (!persisted) {
      throw new Error(`Failed to persist ${relativePath}.`);
    }
  }

  async function persistRunState({
    runDocument,
    thread,
    runIds,
    includeThreadState = true,
  }: {
    runDocument: AgentRunDocument;
    thread: AgentThreadSummary;
    runIds: ReadonlyArray<string>;
    includeThreadState?: boolean;
  }) {
    await persistUserFile(
      buildAgentRunDocumentPath(runDocument.run.runId),
      serializePersistedAgentRunDocument(runDocument),
    );

    if (!includeThreadState) {
      return;
    }

    await persistUserFile(
      buildAgentThreadDocumentPath(thread.threadId),
      serializePersistedAgentThreadDocument(
        buildThreadDocument({
          thread,
          runIds,
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
  }

  async function loadPersistedRunState(runId: string): Promise<PersistedRunState> {
    const normalizedRunId = normalizeAgentStorageId(runId, 'run id');
    const rawRunDocument = await readUserFile(
      buildAgentRunDocumentPath(normalizedRunId),
    );
    const runDocument = rawRunDocument
      ? parsePersistedAgentRunDocument(rawRunDocument)
      : null;
    if (!runDocument) {
      throw new Error(`Persisted agent run ${normalizedRunId} was not found.`);
    }

    const rawThreadDocument = await readUserFile(
      buildAgentThreadDocumentPath(runDocument.run.threadId),
    );
    const threadDocument = rawThreadDocument
      ? parsePersistedAgentThreadDocument(rawThreadDocument)
      : null;

    if (threadDocument) {
      return {
        runDocument,
        thread: {
          ...threadDocument.thread,
          updatedAt: runDocument.run.updatedAt,
          lastRunId: runDocument.run.runId,
          lastRunStatus: runDocument.run.status,
        },
        runIds: mergeRunIds(threadDocument.runIds, runDocument.run.runId),
      };
    }

    const threadFromIndex = (
      await loadThreadIndex(readUserFile)
    ).threads.find(thread => thread.threadId === runDocument.run.threadId);

    return {
      runDocument,
      thread:
        (threadFromIndex
          ? {
              ...threadFromIndex,
              updatedAt: runDocument.run.updatedAt,
              lastRunId: runDocument.run.runId,
              lastRunStatus: runDocument.run.status,
            }
          : null) ??
        createThreadSummary({
          threadId: runDocument.run.threadId,
          runId: runDocument.run.runId,
          title: formatThreadTitle({
            goal: runDocument.run.goal,
            command: runDocument.run.request?.command ?? runDocument.run.goal,
          }),
          createdAt: runDocument.run.createdAt,
          lastRunStatus: runDocument.run.status,
        }),
      runIds: [runDocument.run.runId],
    };
  }

  function buildHandle({
    runDocument,
    whenSettled,
    cancel,
    sendInput,
  }: {
    runDocument: AgentRunDocument;
    whenSettled: Promise<AgentRunDocument>;
    cancel: () => Promise<void>;
    sendInput: (text: string) => Promise<void>;
  }): PersistedAgentTerminalRunHandle {
    return {
      threadId: runDocument.run.threadId,
      runId: runDocument.run.runId,
      get sessionId() {
        return runDocument.run.sessionId;
      },
      whenSettled,
      getSnapshot() {
        return cloneRunDocument(runDocument);
      },
      async cancel() {
        await cancel();
      },
      async sendInput(text: string) {
        await sendInput(text);
      },
    };
  }

  async function startRunExecution({
    runDocument,
    thread,
    runIds,
    whenSettled,
  }: PersistedRunState & {whenSettled: Promise<AgentRunDocument>}) {
    const request = runDocument.run.request;
    if (!request) {
      throw new Error('Persisted agent run is missing its terminal request.');
    }

    let nextSeq =
      runDocument.timeline.reduce(
        (maxSeq, entry) => Math.max(maxSeq, entry.seq),
        -1,
      ) + 1;
    let cancelRequested = false;

    const persistSnapshot = (includeThreadState: boolean) =>
      enqueuePersistenceTask(async () => {
        await persistRunState({
          runDocument,
          thread,
          runIds,
          includeThreadState,
        });
      });

    const settleWhenReady = (persistPromise: Promise<void>) => {
      void persistPromise.finally(() => {
        resolveSettlement(runDocument.run.runId, runDocument);
      });
    };

    const appendTerminalEvent = (event: AgentTerminalSessionEvent) => {
      runDocument.timeline.push(
        createAgentTerminalTimelineEntry({
          entryId: createId('entry'),
          runId: runDocument.run.runId,
          seq: nextSeq,
          event,
        }),
      );
      nextSeq += 1;

      runDocument.run.updatedAt = event.createdAt;
      thread.updatedAt = event.createdAt;
      thread.lastRunStatus = runDocument.run.status;
      thread.lastRunId = runDocument.run.runId;
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
          runId: runDocument.run.runId,
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

    let sessionHandle: AgentTerminalSessionHandle;
    try {
      sessionHandle = await openAgentTerminalSession(
        {
          command: request.command,
          cwd: request.cwd,
          env: request.env,
          shell: request.shell,
        },
        {
          onEvent(event) {
            appendTerminalEvent(event);

            if (event.event === 'started') {
              runDocument.run.status = 'running';
              runDocument.run.startedAt =
                runDocument.run.startedAt ?? event.createdAt;
            } else if (event.event === 'exit') {
              runDocument.run.status = resolveExitStatus({
                exitCode: event.exitCode,
                cancelRequested,
              });
              runDocument.run.completedAt = event.createdAt;
            }

            thread.lastRunStatus = runDocument.run.status;
            thread.lastRunId = runDocument.run.runId;

            const persistPromise = persistSnapshot(
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
            thread.lastRunId = runDocument.run.runId;

            settleWhenReady(persistSnapshot(true));
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
      thread.lastRunId = runDocument.run.runId;

      settleWhenReady(persistSnapshot(true));
      throw normalizedError;
    }

    runDocument.run.sessionId = sessionHandle.sessionId;
    const sessionOpenedAt = now();
    if (runDocument.run.updatedAt.localeCompare(sessionOpenedAt) < 0) {
      runDocument.run.updatedAt = sessionOpenedAt;
      thread.updatedAt = sessionOpenedAt;
    }
    thread.lastRunStatus = runDocument.run.status;
    thread.lastRunId = runDocument.run.runId;
    void persistSnapshot(true);

    return buildHandle({
      runDocument,
      whenSettled,
      cancel: async () => {
        cancelRequested = true;
        await sessionHandle.cancel();
      },
      sendInput: async text => {
        await sessionHandle.sendInput(text);
      },
    });
  }

  async function openRun(
    options: OpenPersistedAgentTerminalRunOptions,
  ): Promise<PersistedAgentTerminalRunHandle> {
    const threadId = createId('thread');
    const runId = createId('run');
    const createdAt = now();
    const workspaceTarget = await getTrustedWorkspaceTarget();
    const request = normalizeRunRequest(options);
    const goal = formatGoal({
      command: request.command,
      cwd: request.cwd,
      goal: options.goal,
    });
    const settings = resolveRunSettings({
      workspaceTarget,
      provider: options.provider,
      permissionMode: options.permissionMode,
      approvalMode: options.approvalMode,
    });
    const requiresApproval =
      options.requiresApproval === true && settings.approvalMode === 'manual';
    const thread = createThreadSummary({
      threadId,
      runId,
      title: formatThreadTitle({
        title: options.title,
        goal,
        command: request.command,
      }),
      createdAt,
      lastRunStatus: requiresApproval ? 'needs-approval' : 'queued',
    });
    const runDocument = createInitialRunDocument({
      threadId,
      runId,
      goal,
      settings,
      request,
      createdAt,
      status: requiresApproval ? 'needs-approval' : 'queued',
    });
    const runIds = [runId];
    const whenSettled = createWhenSettledPromise(runId);

    if (requiresApproval) {
      const approvalId = createId('approval');
      runDocument.timeline.push(
        createApprovalTimelineEntry({
          entryId: createId('entry'),
          runId,
          seq: 0,
          createdAt,
          approvalId,
          title: options.approvalTitle?.trim() || goal,
          details: options.approvalDetails,
          permissionMode: settings.permissionMode,
        }),
      );

      await persistRunState({
        runDocument,
        thread,
        runIds,
      });

      return buildHandle({
        runDocument,
        whenSettled,
        cancel: async () => {
          await rejectRun({
            runId,
            approvalId,
          });
        },
        sendInput: async () => {
          throw new Error('Persisted agent terminal run is waiting for approval.');
        },
      });
    }

    await persistRunState({
      runDocument,
      thread,
      runIds,
    });

    return startRunExecution({
      runDocument,
      thread,
      runIds,
      whenSettled,
    });
  }

  async function approveRun({
    runId,
    approvalId,
  }: ApprovePersistedAgentTerminalRunOptions) {
    const state = await loadPersistedRunState(runId);
    const pendingApproval = findPendingApprovalEntry(
      state.runDocument,
      approvalId,
    );
    if (!pendingApproval) {
      throw new Error('Persisted agent run does not have a pending approval.');
    }
    if (!state.runDocument.run.request) {
      throw new Error('Persisted agent run is missing its terminal request.');
    }

    const createdAt = now();
    pendingApproval.status = 'approved';
    state.runDocument.run.status = 'queued';
    state.runDocument.run.updatedAt = createdAt;
    state.runDocument.run.completedAt = null;
    state.thread.updatedAt = createdAt;
    state.thread.lastRunStatus = state.runDocument.run.status;
    state.thread.lastRunId = state.runDocument.run.runId;

    await persistRunState({
      ...state,
    });

    const whenSettled = createWhenSettledPromise(state.runDocument.run.runId);
    return startRunExecution({
      ...state,
      whenSettled,
    });
  }

  async function rejectRun({
    runId,
    approvalId,
  }: RejectPersistedAgentTerminalRunOptions) {
    const state = await loadPersistedRunState(runId);
    const pendingApproval = findPendingApprovalEntry(
      state.runDocument,
      approvalId,
    );
    if (!pendingApproval) {
      throw new Error('Persisted agent run does not have a pending approval.');
    }

    const createdAt = now();
    pendingApproval.status = 'rejected';
    state.runDocument.run.status = 'cancelled';
    state.runDocument.run.updatedAt = createdAt;
    state.runDocument.run.completedAt = createdAt;
    state.thread.updatedAt = createdAt;
    state.thread.lastRunStatus = state.runDocument.run.status;
    state.thread.lastRunId = state.runDocument.run.runId;

    await persistRunState({
      ...state,
    });
    resolveSettlement(state.runDocument.run.runId, state.runDocument);
    return cloneRunDocument(state.runDocument);
  }

  return {
    openRun,
    approveRun,
    rejectRun,
  };
}

const persistedAgentTerminalRuntime = createPersistedAgentTerminalRuntime({});

export const openPersistedAgentTerminalRun = persistedAgentTerminalRuntime.openRun;
export const approvePersistedAgentTerminalRun =
  persistedAgentTerminalRuntime.approveRun;
export const rejectPersistedAgentTerminalRun =
  persistedAgentTerminalRuntime.rejectRun;
