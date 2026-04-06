import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {logException, logInteraction} from '@opapp/framework-diagnostics';
import {
  approvePersistedAgentTerminalRun,
  agentThreadIndexPath,
  buildAgentRunDocumentPath,
  buildAgentThreadDocumentPath,
  markAgentThreadRead,
  openAgentTerminalSession,
  openPersistedAgentTerminalRun,
  parsePersistedAgentRunDocument,
  parsePersistedAgentThreadDocument,
  parsePersistedAgentThreadIndex,
  reconcileInterruptedAgentRuns,
  reconcileRequestedAgentRunArtifacts,
  rejectPersistedAgentTerminalRun,
  type AgentTerminalSessionHandle,
  type AgentRunDocument,
  type AgentThreadSummary,
  type PersistedAgentTerminalRunHandle,
} from '@opapp/framework-agent-runtime';
import {
  clearTrustedWorkspaceRoot,
  getTrustedWorkspaceTarget,
  listWorkspaceDirectory,
  readWorkspaceFile,
  readUserFile,
  searchWorkspacePaths,
  setTrustedWorkspaceRoot,
  statWorkspacePath,
  type TrustedWorkspaceTarget,
  type WorkspaceEntry,
} from '@opapp/framework-filesystem';
import {appI18n} from '@opapp/framework-i18n';
import {
  buildWorkbenchTimelineDisplayItems,
  buildWorkspaceGitDiffCommand,
  buildTerminalTranscript,
  buildWorkspaceWriteApprovalCommand,
  createWorkspaceChoices,
  resolveWorkbenchRunArtifactSummary,
  resolveWorkbenchTaskDraft,
  resolveWorkbenchWorkspaceRecoveryTarget,
  resolvePreferredWorkspacePath,
  resolveSelectedThreadId,
  resolveThreadRunHistorySelection,
  summarizeWorkbenchTimeline,
} from './agent-workbench-model';
import {
  findLatestApproval,
  findPendingApproval,
} from './agent-workbench-resolvers';
import {textInputWarmupDelayMs} from './agent-workbench-styles';

async function loadThreadRunHistory(
  threadId: string | null,
  threads: ReadonlyArray<AgentThreadSummary>,
  preferredRunId: string | null,
) {
  const selectedThread =
    (threadId
      ? threads.find(thread => thread.threadId === threadId)
      : threads[0]) ?? null;
  if (!selectedThread) {
    return {
      runDocuments: [] as AgentRunDocument[],
      selectedRunId: null,
      selectedRunDocument: null,
    };
  }

  const rawThreadDocument = await readUserFile(
    buildAgentThreadDocumentPath(selectedThread.threadId),
  );
  const threadDocument = rawThreadDocument
    ? parsePersistedAgentThreadDocument(rawThreadDocument)
    : null;
  const runIds =
    threadDocument?.runIds.length
      ? threadDocument.runIds
      : selectedThread.lastRunId
        ? [selectedThread.lastRunId]
        : [];
  const runDocuments = (
    await Promise.all(
      runIds.map(async runId => {
        const rawDocument = await readUserFile(buildAgentRunDocumentPath(runId));
        return rawDocument ? parsePersistedAgentRunDocument(rawDocument) : null;
      }),
    )
  ).filter((document): document is AgentRunDocument => document !== null);

  return resolveThreadRunHistorySelection({
    runDocuments,
    runIds,
    currentRunId: preferredRunId,
  });
}

export type AgentWorkbenchApprovalBusy = 'requesting' | 'approving' | 'rejecting' | null;
export type AgentWorkbenchTaskDraftBusy = 'running' | 'requesting' | null;
export type AgentWorkbenchStatusTone = 'support' | 'danger' | 'neutral';

export function useAgentWorkbenchState() {
  // ── core loading / refresh ──
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── workspace ──
  const [trustedWorkspace, setTrustedWorkspace] =
    useState<TrustedWorkspaceTarget | null>(null);
  const [workspaceDirectories, setWorkspaceDirectories] = useState<
    WorkspaceEntry[]
  >([]);
  const [workspaceEntries, setWorkspaceEntries] = useState<WorkspaceEntry[]>([]);
  const [selectedCwd, setSelectedCwd] = useState('');
  const [selectedWorkspaceStat, setSelectedWorkspaceStat] =
    useState<WorkspaceEntry | null>(null);
  const [workspaceRootDraft, setWorkspaceRootDraft] = useState('');

  // ── search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<WorkspaceEntry[]>([]);

  // ── text input warmup ──
  const [textInputsReady, setTextInputsReady] = useState(false);

  // ── task draft ──
  const [draftGoal, setDraftGoal] = useState('');
  const [draftCommand, setDraftCommand] = useState('');
  const [draftRequiresApproval, setDraftRequiresApproval] = useState(false);
  const [draftPresetId, setDraftPresetId] = useState<
    'workspace-write-approval' | null
  >(null);

  // ── inspector ──
  const [selectedInspectorEntry, setSelectedInspectorEntry] =
    useState<WorkspaceEntry | null>(null);
  const [selectedInspectorChildren, setSelectedInspectorChildren] = useState<
    WorkspaceEntry[]
  >([]);
  const [selectedInspectorContent, setSelectedInspectorContent] =
    useState<string | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);

  // ── diff ──
  const [selectedDiffPath, setSelectedDiffPath] = useState<string | null>(null);
  const [selectedDiffOutput, setSelectedDiffOutput] = useState<string | null>(
    null,
  );
  const [selectedDiffError, setSelectedDiffError] = useState<string | null>(
    null,
  );
  const [diffLoading, setDiffLoading] = useState(false);

  // ── threads / runs ──
  const [threads, setThreads] = useState<AgentThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadRunDocuments, setThreadRunDocuments] = useState<
    AgentRunDocument[]
  >([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunDocument, setSelectedRunDocument] =
    useState<AgentRunDocument | null>(null);

  // ── busy ──
  const [approvalBusy, setApprovalBusy] = useState<AgentWorkbenchApprovalBusy>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [taskDraftBusy, setTaskDraftBusy] = useState<AgentWorkbenchTaskDraftBusy>(null);
  const [workspaceConfigBusy, setWorkspaceConfigBusy] = useState(false);

  // ── status ──
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<AgentWorkbenchStatusTone>('neutral');

  // ── active run tracking ──
  const [activeRunInfo, setActiveRunInfo] = useState<{
    threadId: string;
    runId: string;
  } | null>(null);

  // ── refs ──
  const activeRunHandleRef = useRef<PersistedAgentTerminalRunHandle | null>(null);
  const diffSessionRef = useRef<AgentTerminalSessionHandle | null>(null);
  const selectedCwdRef = useRef('');
  const selectedThreadIdRef = useRef<string | null>(null);
  const selectedRunIdRef = useRef<string | null>(null);
  const diffRequestIdRef = useRef(0);
  const inspectorRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  const interruptedRunsReconciledRef = useRef(false);
  const workspaceDraftSeedRef = useRef('');

  // ── derived state ──
  const selectedRunStatus = selectedRunDocument?.run.status ?? null;
  const latestThreadRunDocument = threadRunDocuments[0] ?? null;
  const previousThreadRunDocument = threadRunDocuments[1] ?? null;
  const viewingHistoricalRun =
    latestThreadRunDocument !== null &&
    selectedRunId !== null &&
    latestThreadRunDocument.run.runId !== selectedRunId;

  const selectedPendingApproval = useMemo(
    () => findPendingApproval(selectedRunDocument),
    [selectedRunDocument],
  );
  const latestSelectedApproval = useMemo(
    () => findLatestApproval(selectedRunDocument),
    [selectedRunDocument],
  );
  const selectedRunArtifact = useMemo(
    () => resolveWorkbenchRunArtifactSummary(selectedRunDocument),
    [selectedRunDocument],
  );
  const selectedTimelineItems = useMemo(
    () => buildWorkbenchTimelineDisplayItems(selectedRunDocument),
    [selectedRunDocument],
  );
  const selectedTimelineSummary = useMemo(
    () => summarizeWorkbenchTimeline(selectedRunDocument),
    [selectedRunDocument],
  );

  const selectedRunRequest = selectedRunDocument?.run.request ?? null;
  const selectedRunArtifactKind = selectedRunArtifact.kind;
  const selectedRunArtifactLabel = selectedRunArtifact.label;
  const selectedRunArtifactPath = selectedRunArtifact.path;
  const selectedRunArtifactHasStandaloneLabel =
    selectedRunArtifactLabel !== null &&
    selectedRunArtifactLabel !== selectedRunArtifactPath;
  const selectedRunWorkspacePath = selectedRunRequest?.cwd ?? '';

  const canRestoreSelectedRunWorkspace =
    trustedWorkspace !== null &&
    selectedRunRequest !== null &&
    selectedRunWorkspacePath !== selectedCwd;
  const canInspectSelectedRunArtifact =
    trustedWorkspace !== null && selectedRunArtifactPath !== null;
  const canRetrySelectedRun =
    selectedRunDocument !== null &&
    selectedRunRequest !== null &&
    selectedPendingApproval === null &&
    activeRunInfo === null &&
    approvalBusy === null &&
    !retryBusy;

  const terminalTranscript = useMemo(
    () => buildTerminalTranscript(selectedRunDocument),
    [selectedRunDocument],
  );
  const workspaceWriteApprovalCommand = useMemo(
    () => buildWorkspaceWriteApprovalCommand(selectedCwd),
    [selectedCwd],
  );
  const usesWorkspaceWriteApprovalDraft =
    draftRequiresApproval &&
    draftGoal === appI18n.agentWorkbench.run.writeApprovalGoal &&
    draftCommand === workspaceWriteApprovalCommand.command;
  const draftTask = useMemo(
    () =>
      resolveWorkbenchTaskDraft({
        goal: draftGoal,
        command: draftCommand,
        cwd: selectedCwd,
        cwdOverride:
          usesWorkspaceWriteApprovalDraft
            ? workspaceWriteApprovalCommand.cwd
            : undefined,
        shell:
          usesWorkspaceWriteApprovalDraft
            ? workspaceWriteApprovalCommand.shell
            : undefined,
        env:
          usesWorkspaceWriteApprovalDraft
            ? workspaceWriteApprovalCommand.env
            : undefined,
        requiresApproval: draftRequiresApproval,
      }),
    [
      draftCommand,
      draftGoal,
      draftRequiresApproval,
      selectedCwd,
      usesWorkspaceWriteApprovalDraft,
      workspaceWriteApprovalCommand.cwd,
      workspaceWriteApprovalCommand.env,
      workspaceWriteApprovalCommand.shell,
    ],
  );
  const selectedGitDiffCommand = useMemo(() => {
    if (!selectedInspectorEntry || selectedInspectorEntry.kind === 'directory') {
      return null;
    }

    return buildWorkspaceGitDiffCommand(selectedInspectorEntry.relativePath);
  }, [selectedInspectorEntry]);

  const workspaceChoices = useMemo(
    () =>
      createWorkspaceChoices({
        trustedWorkspace,
        directories: workspaceDirectories,
        currentPath: selectedCwd,
      }),
    [selectedCwd, trustedWorkspace, workspaceDirectories],
  );
  const workspaceRecoveryTarget = useMemo(
    () =>
      resolveWorkbenchWorkspaceRecoveryTarget({
        selectedRunDocument,
        threadRunDocuments,
      }),
    [selectedRunDocument, threadRunDocuments],
  );

  // ── write-approval preset sync ──
  useEffect(() => {
    if (draftPresetId !== 'workspace-write-approval') {
      return;
    }

    const nextGoal = appI18n.agentWorkbench.run.writeApprovalGoal;
    if (draftGoal !== nextGoal) {
      setDraftGoal(nextGoal);
    }
    if (draftCommand !== workspaceWriteApprovalCommand.command) {
      setDraftCommand(workspaceWriteApprovalCommand.command);
    }
    if (!draftRequiresApproval) {
      setDraftRequiresApproval(true);
    }
  }, [
    draftCommand,
    draftGoal,
    draftPresetId,
    draftRequiresApproval,
    workspaceWriteApprovalCommand.command,
  ]);

  // ── workspace draft seed ──
  useEffect(() => {
    const nextSeed =
      trustedWorkspace?.rootPath?.trim() ||
      workspaceRecoveryTarget?.rootPath?.trim() ||
      '';
    if (!nextSeed) {
      return;
    }

    setWorkspaceRootDraft(currentDraft => {
      const normalizedCurrentDraft = currentDraft.trim();
      const lastSeed = workspaceDraftSeedRef.current.trim();
      if (
        normalizedCurrentDraft.length > 0 &&
        normalizedCurrentDraft !== lastSeed
      ) {
        return currentDraft;
      }

      workspaceDraftSeedRef.current = nextSeed;
      return nextSeed;
    });
  }, [trustedWorkspace?.rootPath, workspaceRecoveryTarget?.rootPath]);

  // ── core helpers ──
  const resetSelectedDiff = useCallback(() => {
    diffRequestIdRef.current += 1;
    const currentSession = diffSessionRef.current;
    diffSessionRef.current = null;
    if (currentSession) {
      void currentSession.cancel().catch(() => {});
    }
    setSelectedDiffPath(null);
    setSelectedDiffOutput(null);
    setSelectedDiffError(null);
    setDiffLoading(false);
  }, []);

  const resetWorkspaceExplorer = useCallback(() => {
    searchRequestIdRef.current += 1;
    inspectorRequestIdRef.current += 1;
    resetSelectedDiff();
    setSearchQuery('');
    setSearching(false);
    setSearchResults([]);
    setSelectedInspectorEntry(null);
    setSelectedInspectorChildren([]);
    setSelectedInspectorContent(null);
    setInspectorLoading(false);
  }, [resetSelectedDiff]);

  const refreshWorkbench = useCallback(
    async ({
      preferredCwd,
      preferredThreadId,
      preferredRunId,
      showRefreshFeedback = false,
    }: {
      preferredCwd?: string;
      preferredThreadId?: string | null;
      preferredRunId?: string | null;
      showRefreshFeedback?: boolean;
    } = {}) => {
      const workspace = await getTrustedWorkspaceTarget();
      const directories = workspace
        ? (await listWorkspaceDirectory('')).filter(
            entry => entry.kind === 'directory',
          )
        : [];
      const preferredWorkspacePath =
        preferredCwd !== undefined
          ? preferredCwd
          : selectedCwdRef.current || undefined;
      const nextSelectedCwd = resolvePreferredWorkspacePath(
        directories,
        preferredWorkspacePath,
      );
      let interruptedRunCount = 0;
      if (
        !interruptedRunsReconciledRef.current &&
        activeRunHandleRef.current === null
      ) {
        try {
          const reconciliation = await reconcileInterruptedAgentRuns();
          interruptedRunCount = reconciliation.interruptedRunIds.length;
          interruptedRunsReconciledRef.current = true;
        } catch (error) {
          logException('agent-workbench.interrupted-reconcile.failed', error, {});
        }
      }
      if (activeRunHandleRef.current === null) {
        try {
          await reconcileRequestedAgentRunArtifacts();
        } catch (error) {
          logException('agent-workbench.artifact-reconcile.failed', error, {});
        }
      }
      const rawThreadIndex = await readUserFile(agentThreadIndexPath);
      const nextThreads = rawThreadIndex
        ? parsePersistedAgentThreadIndex(rawThreadIndex)?.threads ?? []
        : [];
      const nextSelectedThreadId = resolveSelectedThreadId(
        nextThreads,
        preferredThreadId ?? selectedThreadIdRef.current,
      );
      const {
        runDocuments: nextThreadRunDocuments,
        selectedRunId: nextSelectedRunId,
        selectedRunDocument: runDocument,
      } = await loadThreadRunHistory(
        nextSelectedThreadId,
        nextThreads,
        preferredRunId ?? selectedRunIdRef.current,
      );
      const workspaceStat = workspace
        ? await statWorkspacePath(nextSelectedCwd)
        : null;
      const currentDirectoryEntries = workspace
        ? await listWorkspaceDirectory(nextSelectedCwd)
        : [];

      selectedCwdRef.current = nextSelectedCwd;
      selectedThreadIdRef.current = nextSelectedThreadId;
      selectedRunIdRef.current = nextSelectedRunId;
      setTrustedWorkspace(workspace);
      setWorkspaceDirectories(directories);
      setWorkspaceEntries(currentDirectoryEntries);
      setSelectedCwd(nextSelectedCwd);
      setSelectedWorkspaceStat(workspaceStat);
      setThreads(nextThreads);
      setSelectedThreadId(nextSelectedThreadId);
      setThreadRunDocuments(nextThreadRunDocuments);
      setSelectedRunId(nextSelectedRunId);
      setSelectedRunDocument(runDocument);

      if (interruptedRunCount > 0) {
        setStatusTone('neutral');
        setStatusMessage(
          appI18n.agentWorkbench.feedback.interruptedRecovered(
            interruptedRunCount,
          ),
        );
      } else if (showRefreshFeedback) {
        setStatusTone('neutral');
        setStatusMessage(appI18n.agentWorkbench.feedback.refreshed);
      }
    },
    [],
  );

  // ── init ──
  useEffect(() => {
    void (async () => {
      try {
        await refreshWorkbench();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshWorkbench]);

  // ── active run polling ──
  useEffect(() => {
    if (!activeRunInfo) {
      return;
    }

    const timer = setInterval(() => {
      void refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: activeRunInfo.threadId,
        preferredRunId: selectedRunIdRef.current,
      });
    }, 800);

    return () => {
      clearInterval(timer);
    };
  }, [activeRunInfo, refreshWorkbench]);

  // ── text input warmup ──
  useEffect(() => {
    if (loading || textInputsReady) {
      return;
    }

    const timer = setTimeout(() => {
      setTextInputsReady(true);
    }, textInputWarmupDelayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [loading, textInputsReady]);

  // ── diff session cleanup ──
  useEffect(
    () => () => {
      diffRequestIdRef.current += 1;
      const currentSession = diffSessionRef.current;
      diffSessionRef.current = null;
      if (currentSession) {
        void currentSession.cancel().catch(() => {});
      }
    },
    [],
  );

  // ── action handlers ──
  const attachActiveRunHandle = useCallback(
    (handle: PersistedAgentTerminalRunHandle) => {
      activeRunHandleRef.current = handle;
      selectedRunIdRef.current = handle.runId;
      setActiveRunInfo({
        threadId: handle.threadId,
        runId: handle.runId,
      });
      setSelectedRunId(handle.runId);

      void handle.whenSettled.catch(() => {}).finally(async () => {
        if (activeRunHandleRef.current?.runId === handle.runId) {
          activeRunHandleRef.current = null;
          setActiveRunInfo(null);
        }

        await refreshWorkbench({
          preferredCwd: selectedCwdRef.current,
          preferredThreadId: handle.threadId,
          preferredRunId: handle.runId,
        });
      });
    },
    [refreshWorkbench],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: selectedThreadIdRef.current,
        showRefreshFeedback: true,
      });
    } catch (error) {
      logException('agent-workbench.refresh.failed', error, {});
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkbench]);

  const persistTrustedWorkspace = useCallback(
    async (rootPath?: string) => {
      const normalizedRootPath =
        (typeof rootPath === 'string' ? rootPath : workspaceRootDraft).trim();
      if (!normalizedRootPath) {
        setStatusTone('danger');
        setStatusMessage(appI18n.agentWorkbench.feedback.workspaceRootRequired);
        return;
      }

      setWorkspaceConfigBusy(true);
      try {
        const persistedWorkspace =
          await setTrustedWorkspaceRoot(normalizedRootPath);
        if (!persistedWorkspace) {
          throw new Error('Failed to set trusted workspace root.');
        }

        const currentTrustedWorkspaceRoot = trustedWorkspace?.rootPath?.trim() ?? '';
        const workspaceRootChanged =
          persistedWorkspace.rootPath !== currentTrustedWorkspaceRoot;
        if (workspaceRootChanged) {
          resetWorkspaceExplorer();
        }

        workspaceDraftSeedRef.current = persistedWorkspace.rootPath;
        setWorkspaceRootDraft(persistedWorkspace.rootPath);
        setStatusTone('support');
        setStatusMessage(
          appI18n.agentWorkbench.feedback.workspaceTrusted(
            persistedWorkspace.displayName || persistedWorkspace.rootPath,
          ),
        );
        await refreshWorkbench({
          preferredCwd:
            persistedWorkspace.rootPath === workspaceRecoveryTarget?.rootPath
              ? workspaceRecoveryTarget.preferredCwd ??
                (workspaceRootChanged ? '' : selectedCwdRef.current)
              : workspaceRootChanged
                ? ''
                : selectedCwdRef.current,
          preferredThreadId: selectedThreadIdRef.current,
          preferredRunId: selectedRunIdRef.current,
        });
      } catch (error) {
        logException('agent-workbench.workspace.set-root.failed', error, {
          rootPath: normalizedRootPath,
        });
        setStatusTone('danger');
        setStatusMessage(appI18n.agentWorkbench.feedback.workspaceTrustFailed);
      } finally {
        setWorkspaceConfigBusy(false);
      }
    },
    [
      refreshWorkbench,
      resetWorkspaceExplorer,
      trustedWorkspace?.rootPath,
      workspaceRecoveryTarget,
      workspaceRootDraft,
    ],
  );

  const handleClearTrustedWorkspaceRoot = useCallback(async () => {
    setWorkspaceConfigBusy(true);
    try {
      const cleared = await clearTrustedWorkspaceRoot();
      if (!cleared) {
        throw new Error('Failed to clear trusted workspace root.');
      }

      resetWorkspaceExplorer();
      const nextDraftSeed = workspaceRecoveryTarget?.rootPath?.trim() ?? '';
      workspaceDraftSeedRef.current = nextDraftSeed;
      setWorkspaceRootDraft(nextDraftSeed);
      setStatusTone('neutral');
      setStatusMessage(appI18n.agentWorkbench.feedback.workspaceCleared);

      await refreshWorkbench({
        preferredCwd: '',
        preferredThreadId: selectedThreadIdRef.current,
        preferredRunId: selectedRunIdRef.current,
      });
    } catch (error) {
      logException('agent-workbench.workspace.clear-root.failed', error, {
        rootPath: trustedWorkspace?.rootPath ?? null,
      });
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.workspaceClearFailed);
    } finally {
      setWorkspaceConfigBusy(false);
    }
  }, [
    refreshWorkbench,
    resetWorkspaceExplorer,
    trustedWorkspace?.rootPath,
    workspaceRecoveryTarget?.rootPath,
  ]);

  const handleRunGitStatus = useCallback(() => {
    if (!trustedWorkspace) {
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.missingWorkspace);
      return;
    }

    setDraftPresetId(null);
    setDraftGoal(appI18n.agentWorkbench.run.gitStatusGoal);
    setDraftCommand('git status');
    setDraftRequiresApproval(false);
    setStatusTone('neutral');
    setStatusMessage(null);
  }, [trustedWorkspace]);

  const handleStartDraftTask = useCallback(async () => {
    if (!trustedWorkspace) {
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.missingWorkspace);
      return;
    }

    if (!draftTask) {
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.taskDraft.commandMissing);
      return;
    }

    if (!draftRequiresApproval && !draftTask.canRunDirect) {
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.taskDraft.directModeBlocked);
      return;
    }

    setTaskDraftBusy(draftTask.requiresApproval ? 'requesting' : 'running');
    try {
      const continuedThreadId = selectedThreadIdRef.current || undefined;
      const handle = await openPersistedAgentTerminalRun({
        threadId: continuedThreadId,
        title: draftTask.title,
        goal: draftTask.goal,
        command: draftTask.command,
        cwd: draftTask.cwd,
        shell: draftTask.shell,
        env: draftTask.env,
        requiresApproval: draftTask.requiresApproval,
        approvalTitle: draftTask.approvalTitle,
        approvalDetails: draftTask.approvalDetails,
      });
      const snapshot = handle.getSnapshot();
      const continuedFromRunId = snapshot.run.resumedFromRunId;

      if (snapshot.run.status !== 'needs-approval') {
        attachActiveRunHandle(handle);
      }

      setStatusTone('support');
      setStatusMessage(
        snapshot.run.status === 'needs-approval'
          ? appI18n.agentWorkbench.feedback.approvalRequested
          : appI18n.agentWorkbench.feedback.runStarted,
      );
      logInteraction(
        snapshot.run.status === 'needs-approval'
          ? 'agent-workbench.approval.requested'
          : 'agent-workbench.run.started',
        {
          threadId: handle.threadId,
          runId: handle.runId,
          resumedFromRunId: continuedFromRunId,
          cwd: draftTask.cwd ?? '',
          command: draftTask.command,
          requiresApproval: draftTask.requiresApproval,
        },
      );

      await refreshWorkbench({
        preferredCwd: draftTask.cwd ?? selectedCwdRef.current,
        preferredThreadId: handle.threadId,
        preferredRunId: handle.runId,
      });
    } catch (error) {
      logException('agent-workbench.task.start.failed', error, {
        cwd: draftTask.cwd ?? selectedCwdRef.current,
        command: draftTask.command,
        requiresApproval: draftTask.requiresApproval,
      });
      setStatusTone('danger');
      setStatusMessage(
        draftTask.requiresApproval
          ? appI18n.agentWorkbench.feedback.approvalRequestFailed
          : appI18n.agentWorkbench.feedback.runFailed,
      );
      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: selectedThreadIdRef.current,
        preferredRunId: selectedRunIdRef.current,
      });
    } finally {
      setTaskDraftBusy(null);
    }
  }, [attachActiveRunHandle, draftTask, refreshWorkbench, trustedWorkspace]);

  const handleRequestWriteApproval = useCallback(async () => {
    if (!trustedWorkspace) {
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.missingWorkspace);
      return;
    }

    setApprovalBusy('requesting');
    try {
      const continuedThreadId = selectedThreadIdRef.current || undefined;
      const handle = await openPersistedAgentTerminalRun({
        threadId: continuedThreadId,
        title: appI18n.agentWorkbench.run.writeApprovalTitle,
        goal: appI18n.agentWorkbench.run.writeApprovalGoal,
        command: workspaceWriteApprovalCommand.command,
        cwd: workspaceWriteApprovalCommand.cwd,
        shell: workspaceWriteApprovalCommand.shell,
        env: workspaceWriteApprovalCommand.env,
        requiresApproval: true,
        approvalTitle: appI18n.agentWorkbench.approval.requestTitle,
        approvalDetails: appI18n.agentWorkbench.approval.requestDetails(
          workspaceWriteApprovalCommand.relativePath,
          workspaceWriteApprovalCommand.cwd ||
            appI18n.agentWorkbench.workspace.rootLabel,
        ),
      });
      const continuedFromRunId = handle.getSnapshot().run.resumedFromRunId;

      setStatusTone('support');
      setStatusMessage(appI18n.agentWorkbench.feedback.approvalRequested);
      logInteraction('agent-workbench.approval.requested', {
        threadId: handle.threadId,
        runId: handle.runId,
        resumedFromRunId: continuedFromRunId,
        requestedCwd: selectedCwdRef.current,
        targetPath: workspaceWriteApprovalCommand.relativePath,
      });

      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: handle.threadId,
        preferredRunId: handle.runId,
      });
    } catch (error) {
      logException('agent-workbench.approval.request.failed', error, {
        cwd: selectedCwdRef.current,
        targetPath: workspaceWriteApprovalCommand.relativePath,
      });
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.approvalRequestFailed);
      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: selectedThreadIdRef.current,
        preferredRunId: selectedRunIdRef.current,
      });
    } finally {
      setApprovalBusy(null);
    }
  }, [refreshWorkbench, trustedWorkspace, workspaceWriteApprovalCommand]);

  const handleApproveSelectedRun = useCallback(async () => {
    if (!selectedRunDocument || !selectedPendingApproval) {
      return;
    }

    setApprovalBusy('approving');
    try {
      const handle = await approvePersistedAgentTerminalRun({
        runId: selectedRunDocument.run.runId,
        approvalId: selectedPendingApproval.approvalId,
      });

      attachActiveRunHandle(handle);
      setStatusTone('support');
      setStatusMessage(appI18n.agentWorkbench.feedback.approvalApproved);
      logInteraction('agent-workbench.approval.approved', {
        threadId: handle.threadId,
        runId: handle.runId,
        approvalId: selectedPendingApproval.approvalId,
      });

      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: handle.threadId,
        preferredRunId: handle.runId,
      });
    } catch (error) {
      logException('agent-workbench.approval.approve.failed', error, {
        runId: selectedRunDocument.run.runId,
        approvalId: selectedPendingApproval.approvalId,
      });
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.approvalDecisionFailed);
      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: selectedThreadIdRef.current,
        preferredRunId: selectedRunIdRef.current,
      });
    } finally {
      setApprovalBusy(null);
    }
  }, [
    attachActiveRunHandle,
    refreshWorkbench,
    selectedPendingApproval,
    selectedRunDocument,
  ]);

  const handleRejectSelectedRun = useCallback(async () => {
    if (!selectedRunDocument || !selectedPendingApproval) {
      return;
    }

    setApprovalBusy('rejecting');
    try {
      await rejectPersistedAgentTerminalRun({
        runId: selectedRunDocument.run.runId,
        approvalId: selectedPendingApproval.approvalId,
      });
      setStatusTone('neutral');
      setStatusMessage(appI18n.agentWorkbench.feedback.approvalRejected);
      logInteraction('agent-workbench.approval.rejected', {
        runId: selectedRunDocument.run.runId,
        approvalId: selectedPendingApproval.approvalId,
      });

      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: selectedRunDocument.run.threadId,
        preferredRunId: selectedRunDocument.run.runId,
      });
    } catch (error) {
      logException('agent-workbench.approval.reject.failed', error, {
        runId: selectedRunDocument.run.runId,
        approvalId: selectedPendingApproval.approvalId,
      });
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.approvalDecisionFailed);
      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: selectedThreadIdRef.current,
        preferredRunId: selectedRunIdRef.current,
      });
    } finally {
      setApprovalBusy(null);
    }
  }, [refreshWorkbench, selectedPendingApproval, selectedRunDocument]);

  const handleCancelRun = useCallback(async () => {
    const handle = activeRunHandleRef.current;
    if (!handle) {
      return;
    }

    try {
      await handle.cancel();
      setStatusTone('neutral');
      setStatusMessage(appI18n.agentWorkbench.feedback.cancelRequested);
    } catch (error) {
      logException('agent-workbench.cancel.failed', error, {
        runId: handle.runId,
      });
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.cancelFailed);
    }
  }, []);

  const handleRetrySelectedRun = useCallback(async () => {
    if (!selectedRunDocument || !selectedRunRequest) {
      return;
    }

    setRetryBusy(true);
    try {
      const handle = await openPersistedAgentTerminalRun({
        threadId: selectedRunDocument.run.threadId,
        title: selectedRunDocument.run.goal,
        goal: selectedRunDocument.run.goal,
        command: selectedRunRequest.command,
        cwd: selectedRunRequest.cwd ?? undefined,
        shell: selectedRunRequest.shell ?? undefined,
        env: selectedRunRequest.env,
        permissionMode: selectedRunDocument.run.settings.permissionMode,
        approvalMode: selectedRunDocument.run.settings.approvalMode,
        provider: selectedRunDocument.run.settings.provider,
        requiresApproval: latestSelectedApproval !== null,
        approvalTitle: latestSelectedApproval?.title,
        approvalDetails: latestSelectedApproval?.details,
      });
      const snapshot = handle.getSnapshot();
      const continuedFromRunId = snapshot.run.resumedFromRunId;

      if (snapshot.run.status !== 'needs-approval') {
        attachActiveRunHandle(handle);
      }

      setStatusTone('support');
      setStatusMessage(appI18n.agentWorkbench.feedback.runRetried);
      logInteraction('agent-workbench.run.retried', {
        sourceRunId: selectedRunDocument.run.runId,
        threadId: handle.threadId,
        runId: handle.runId,
        resumedFromRunId: continuedFromRunId,
        sourceStatus: selectedRunDocument.run.status,
        cwd: selectedRunRequest.cwd,
      });

      await refreshWorkbench({
        preferredCwd: selectedRunRequest.cwd ?? selectedCwdRef.current,
        preferredThreadId: handle.threadId,
        preferredRunId: handle.runId,
      });
    } catch (error) {
      logException('agent-workbench.run.retry.failed', error, {
        sourceRunId: selectedRunDocument.run.runId,
        threadId: selectedRunDocument.run.threadId,
        command: selectedRunRequest.command,
        cwd: selectedRunRequest.cwd,
      });
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.retryRunFailed);
      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: selectedThreadIdRef.current,
        preferredRunId: selectedRunIdRef.current,
      });
    } finally {
      setRetryBusy(false);
    }
  }, [
    attachActiveRunHandle,
    latestSelectedApproval,
    refreshWorkbench,
    selectedRunDocument,
    selectedRunRequest,
  ]);

  const handleInspectWorkspaceEntry = useCallback(
    async (entry: WorkspaceEntry) => {
      resetSelectedDiff();
      const requestId = inspectorRequestIdRef.current + 1;
      inspectorRequestIdRef.current = requestId;
      setSelectedInspectorEntry(entry);
      setInspectorLoading(true);

      try {
        if (entry.kind === 'directory') {
          const children = await listWorkspaceDirectory(entry.relativePath);
          if (inspectorRequestIdRef.current !== requestId) {
            return;
          }
          setSelectedInspectorChildren(children);
          setSelectedInspectorContent(null);
          return;
        }

        const content = await readWorkspaceFile(entry.relativePath);
        if (inspectorRequestIdRef.current !== requestId) {
          return;
        }
        setSelectedInspectorChildren([]);
        setSelectedInspectorContent(content);
      } finally {
        if (inspectorRequestIdRef.current === requestId) {
          setInspectorLoading(false);
        }
      }
    },
    [resetSelectedDiff],
  );

  const handleSearch = useCallback(async () => {
    const normalizedQuery = searchQuery.trim();
    if (!trustedWorkspace || normalizedQuery.length === 0) {
      searchRequestIdRef.current += 1;
      setSearching(false);
      setSearchResults([]);
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setSearching(true);
    try {
      const results = await searchWorkspacePaths(normalizedQuery, {
        relativePath: selectedCwdRef.current,
        limit: 40,
      });
      if (searchRequestIdRef.current !== requestId) {
        return;
      }
      setSearchResults(results);
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setSearching(false);
      }
    }
  }, [searchQuery, trustedWorkspace]);

  const handleBrowseDirectory = useCallback(
    async (relativePath: string) => {
      selectedCwdRef.current = relativePath;
      setSelectedCwd(relativePath);
      resetWorkspaceExplorer();
      await refreshWorkbench({
        preferredCwd: relativePath,
        preferredThreadId: selectedThreadIdRef.current,
      });
    },
    [refreshWorkbench, resetWorkspaceExplorer],
  );

  const handleRestoreSelectedRunWorkspace = useCallback(async () => {
    if (!selectedRunRequest) {
      return;
    }

    await handleBrowseDirectory(selectedRunWorkspacePath);
    setStatusTone('neutral');
    setStatusMessage(appI18n.agentWorkbench.feedback.runWorkspaceRestored);
  }, [handleBrowseDirectory, selectedRunRequest, selectedRunWorkspacePath]);

  const loadDiffForEntry = useCallback(async (entry: WorkspaceEntry) => {
    if (entry.kind === 'directory') {
      return;
    }

    const gitDiffCommand = buildWorkspaceGitDiffCommand(entry.relativePath);
    if (!gitDiffCommand) {
      return;
    }

    diffRequestIdRef.current += 1;
    const requestId = diffRequestIdRef.current;
    const previousSession = diffSessionRef.current;
    diffSessionRef.current = null;
    if (previousSession) {
      void previousSession.cancel().catch(() => {});
    }

    setSelectedDiffPath(entry.relativePath);
    setSelectedDiffOutput('');
    setSelectedDiffError(null);
    setDiffLoading(true);

    const chunks: string[] = [];
    let settled = false;

    try {
      const session = await openAgentTerminalSession(
        {
          command: gitDiffCommand.command,
          cwd: gitDiffCommand.cwd,
          shell: gitDiffCommand.shell,
        },
        {
          onEvent(event) {
            if (diffRequestIdRef.current !== requestId) {
              return;
            }

            switch (event.event) {
              case 'stdout':
                if (event.text) {
                  chunks.push(event.text);
                  setSelectedDiffOutput(chunks.join(''));
                }
                break;
              case 'stderr':
                if (event.text) {
                  chunks.push(`[stderr] ${event.text}`);
                  setSelectedDiffOutput(chunks.join(''));
                }
                break;
              case 'exit':
                settled = true;
                diffSessionRef.current = null;
                setDiffLoading(false);
                break;
              default:
                break;
            }
          },
          onError(error) {
            settled = true;
            if (diffRequestIdRef.current !== requestId) {
              return;
            }

            diffSessionRef.current = null;
            setDiffLoading(false);
            setSelectedDiffError(error.message);
            logException('agent-workbench.diff.failed', error, {
              relativePath: entry.relativePath,
              cwd: gitDiffCommand.cwd,
            });
          },
        },
      );

      if (diffRequestIdRef.current !== requestId) {
        await session.cancel().catch(() => {});
        return;
      }

      if (!settled) {
        diffSessionRef.current = session;
      }
    } catch (error) {
      if (diffRequestIdRef.current !== requestId) {
        return;
      }

      setDiffLoading(false);
      setSelectedDiffOutput(null);
      setSelectedDiffError(
        error instanceof Error
          ? error.message
          : appI18n.agentWorkbench.feedback.runFailed,
      );
      logException('agent-workbench.diff.failed', error, {
        relativePath: entry.relativePath,
        cwd: gitDiffCommand.cwd,
      });
    }
  }, []);

  const handleLoadSelectedDiff = useCallback(async () => {
    if (!selectedInspectorEntry || selectedInspectorEntry.kind === 'directory') {
      return;
    }

    await loadDiffForEntry(selectedInspectorEntry);
  }, [loadDiffForEntry, selectedInspectorEntry]);

  const handleInspectSelectedRunArtifact = useCallback(async () => {
    if (!selectedRunArtifactPath) {
      return;
    }

    try {
      const artifactEntry = await statWorkspacePath(selectedRunArtifactPath);
      if (!artifactEntry || artifactEntry.kind !== 'file') {
        setStatusTone('danger');
        setStatusMessage(appI18n.agentWorkbench.feedback.runArtifactInspectFailed);
        return;
      }

      await handleInspectWorkspaceEntry(artifactEntry);
      await loadDiffForEntry(artifactEntry);
      setStatusTone('neutral');
      setStatusMessage(
        appI18n.agentWorkbench.feedback.runArtifactInspected(
          artifactEntry.relativePath,
        ),
      );
    } catch (error) {
      logException('agent-workbench.run-artifact.inspect.failed', error, {
        relativePath: selectedRunArtifactPath,
      });
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.runArtifactInspectFailed);
    }
  }, [
    handleInspectWorkspaceEntry,
    loadDiffForEntry,
    selectedRunArtifactPath,
  ]);

  const handleDraftGoalChange = useCallback((nextGoal: string) => {
    setDraftPresetId(null);
    setDraftGoal(nextGoal);
  }, []);

  const handleDraftCommandChange = useCallback((nextCommand: string) => {
    setDraftPresetId(null);
    setDraftCommand(nextCommand);
  }, []);

  const handleSelectDirectDraftMode = useCallback(() => {
    setDraftPresetId(null);
    setDraftRequiresApproval(false);
  }, []);

  const handleSelectApprovalDraftMode = useCallback(() => {
    setDraftRequiresApproval(true);
  }, []);

  const handlePopulateWriteApprovalDraft = useCallback(() => {
    setDraftPresetId('workspace-write-approval');
    setDraftGoal(appI18n.agentWorkbench.run.writeApprovalGoal);
    setDraftCommand(workspaceWriteApprovalCommand.command);
    setDraftRequiresApproval(true);
    setStatusTone('neutral');
    setStatusMessage(appI18n.agentWorkbench.feedback.writeApprovalDraftReady);
  }, [workspaceWriteApprovalCommand.command]);

  const handleSearchQueryChange = useCallback((text: string) => {
    searchRequestIdRef.current += 1;
    setSearchQuery(text);
    setSearching(false);
    if (text.trim().length === 0) {
      setSearchResults([]);
    }
  }, []);

  const handleSelectThread = useCallback(
    (threadId: string) => {
      selectedThreadIdRef.current = threadId;
      selectedRunIdRef.current = null;
      setSelectedThreadId(threadId);
      setSelectedRunId(null);
      // Mark thread as read when the user opens it
      void markAgentThreadRead(threadId);
      void refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: threadId,
        preferredRunId: null,
      });
    },
    [refreshWorkbench],
  );

  const handleSelectRun = useCallback((document: AgentRunDocument) => {
    selectedRunIdRef.current = document.run.runId;
    setSelectedRunId(document.run.runId);
    setSelectedRunDocument(document);
  }, []);

  const handleFocusLatestRun = useCallback(() => {
    if (!latestThreadRunDocument) {
      return;
    }
    selectedRunIdRef.current = latestThreadRunDocument.run.runId;
    setSelectedRunId(latestThreadRunDocument.run.runId);
    setSelectedRunDocument(latestThreadRunDocument);
  }, [latestThreadRunDocument]);

  const handleViewPreviousRun = useCallback(() => {
    if (!previousThreadRunDocument) {
      return;
    }
    selectedRunIdRef.current = previousThreadRunDocument.run.runId;
    setSelectedRunId(previousThreadRunDocument.run.runId);
    setSelectedRunDocument(previousThreadRunDocument);
  }, [previousThreadRunDocument]);

  const handleWorkspaceRootDraftChange = useCallback((text: string) => {
    setWorkspaceRootDraft(text);
  }, []);

  const handleTrustWorkspaceRoot = useCallback(async () => {
    await persistTrustedWorkspace();
  }, [persistTrustedWorkspace]);

  const handleTrustRecoveredWorkspace = useCallback(async () => {
    if (!workspaceRecoveryTarget) {
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.workspaceRootRequired);
      return;
    }

    setWorkspaceRootDraft(workspaceRecoveryTarget.rootPath);
    await persistTrustedWorkspace(workspaceRecoveryTarget.rootPath);
  }, [persistTrustedWorkspace, workspaceRecoveryTarget]);

  return {
    // loading
    loading,
    refreshing,
    // workspace
    trustedWorkspace,
    workspaceEntries,
    selectedCwd,
    selectedWorkspaceStat,
    workspaceChoices,
    workspaceRootDraft,
    workspaceRecoveryTarget,
    workspaceConfigBusy,
    // search
    searchQuery,
    searching,
    searchResults,
    // text inputs
    textInputsReady,
    // task draft
    draftGoal,
    draftCommand,
    draftRequiresApproval,
    draftTask,
    taskDraftBusy,
    // inspector
    selectedInspectorEntry,
    selectedInspectorChildren,
    selectedInspectorContent,
    inspectorLoading,
    // diff
    selectedDiffPath,
    selectedDiffOutput,
    selectedDiffError,
    diffLoading,
    selectedGitDiffCommand,
    // threads / runs
    threads,
    selectedThreadId,
    threadRunDocuments,
    selectedRunId,
    selectedRunDocument,
    selectedRunStatus,
    selectedRunRequest,
    selectedPendingApproval,
    latestThreadRunDocument,
    previousThreadRunDocument,
    viewingHistoricalRun,
    // run artifact
    selectedRunArtifactKind,
    selectedRunArtifactLabel,
    selectedRunArtifactPath,
    selectedRunArtifactHasStandaloneLabel,
    // run capabilities
    canRetrySelectedRun,
    canRestoreSelectedRunWorkspace,
    canInspectSelectedRunArtifact,
    // run busy
    approvalBusy,
    retryBusy,
    activeRunInfo,
    // timeline
    selectedTimelineItems,
    selectedTimelineSummary,
    terminalTranscript,
    // status
    statusMessage,
    statusTone,
    // handlers
    handleRefresh,
    handleRunGitStatus,
    handleStartDraftTask,
    handleRequestWriteApproval,
    handleApproveSelectedRun,
    handleRejectSelectedRun,
    handleCancelRun,
    handleRetrySelectedRun,
    handleInspectWorkspaceEntry,
    handleSearch,
    handleBrowseDirectory,
    handleRestoreSelectedRunWorkspace,
    handleLoadSelectedDiff,
    handleInspectSelectedRunArtifact,
    handleDraftGoalChange,
    handleDraftCommandChange,
    handleSelectDirectDraftMode,
    handleSelectApprovalDraftMode,
    handlePopulateWriteApprovalDraft,
    handleSearchQueryChange,
    handleSelectThread,
    handleSelectRun,
    handleFocusLatestRun,
    handleViewPreviousRun,
    handleWorkspaceRootDraftChange,
    handleTrustWorkspaceRoot,
    handleClearTrustedWorkspaceRoot,
    handleTrustRecoveredWorkspace,
  };
}
