import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {logException, logInteraction} from '@opapp/framework-diagnostics';
import {
  approvePersistedAgentTerminalRun,
  agentThreadIndexPath,
  buildAgentRunDocumentPath,
  buildAgentThreadDocumentPath,
  openAgentTerminalSession,
  openPersistedAgentTerminalRun,
  parsePersistedAgentRunDocument,
  parsePersistedAgentThreadDocument,
  parsePersistedAgentThreadIndex,
  reconcileInterruptedAgentRuns,
  rejectPersistedAgentTerminalRun,
  type AgentApprovalTimelineEntry,
  type AgentTerminalSessionHandle,
  type AgentRunDocument,
  type AgentRunStatus,
  type AgentTerminalEventType,
  type AgentTimelineEntry,
  type AgentThreadSummary,
  type PersistedAgentTerminalRunHandle,
} from '@opapp/framework-agent-runtime';
import {
  getTrustedWorkspaceTarget,
  listWorkspaceDirectory,
  readWorkspaceFile,
  readUserFile,
  searchWorkspacePaths,
  statWorkspacePath,
  type TrustedWorkspaceTarget,
  type WorkspaceEntry,
} from '@opapp/framework-filesystem';
import {appI18n} from '@opapp/framework-i18n';
import {captureWindow, listVisibleWindows} from '@opapp/framework-window-capture';
import {
  ActionButton,
  AppFrame,
  ChoiceChip,
  EmptyState,
  Expander,
  InfoPanel,
  SignalPill,
  Stack,
  StatusBadge,
  Toolbar,
  useTheme,
  appLayout,
  appRadius,
  appSpacing,
  appTypography,
  type AppPalette,
  type AppTone,
} from '@opapp/ui-native-primitives';
import {
  buildWorkspaceGitDiffCommand,
  buildTerminalTranscript,
  buildWorkspaceWriteApprovalCommand,
  createWorkspaceChoices,
  resolveWorkbenchTaskDraft,
  resolvePreferredWorkspacePath,
  resolveSelectedThreadId,
  resolveThreadRunHistorySelection,
  resolveWorkspaceGitDiffCandidate,
} from './agent-workbench-model';

const terminalFontFamily = Platform.OS === 'windows' ? 'Consolas' : undefined;
const textInputWarmupDelayMs = Platform.OS === 'windows' ? 1200 : 0;

function formatIsoTimestamp(value: string | null) {
  if (!value) {
    return appI18n.common.unknown;
  }

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/,
  );
  if (!match) {
    return value;
  }

  return `${match[1]} ${match[2]} UTC`;
}

function formatSizeBytes(value: number | null) {
  if (value === null || value < 0) {
    return appI18n.common.unknown;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveRunStatusTone(status: AgentRunStatus | null): AppTone {
  switch (status) {
    case 'running':
      return 'accent';
    case 'needs-approval':
      return 'warning';
    case 'completed':
      return 'support';
    case 'failed':
      return 'danger';
    case 'cancelled':
    case 'interrupted':
      return 'warning';
    default:
      return 'neutral';
  }
}

function resolveRunStatusLabel(status: AgentRunStatus | null) {
  switch (status) {
    case 'queued':
      return appI18n.agentWorkbench.status.queued;
    case 'running':
      return appI18n.agentWorkbench.status.running;
    case 'needs-approval':
      return appI18n.agentWorkbench.status.needsApproval;
    case 'completed':
      return appI18n.agentWorkbench.status.completed;
    case 'failed':
      return appI18n.agentWorkbench.status.failed;
    case 'cancelled':
      return appI18n.agentWorkbench.status.cancelled;
    case 'interrupted':
      return appI18n.agentWorkbench.status.interrupted;
    default:
      return appI18n.agentWorkbench.status.idle;
  }
}

function resolveTerminalEventLabel(event: AgentTerminalEventType) {
  switch (event) {
    case 'started':
      return appI18n.agentWorkbench.events.started;
    case 'stdout':
      return appI18n.agentWorkbench.events.stdout;
    case 'stderr':
      return appI18n.agentWorkbench.events.stderr;
    case 'stdin':
      return appI18n.agentWorkbench.events.stdin;
    case 'exit':
      return appI18n.agentWorkbench.events.exit;
    default:
      return event;
  }
}

function resolveApprovalStatusTone(
  status: AgentApprovalTimelineEntry['status'],
): AppTone {
  switch (status) {
    case 'approved':
      return 'support';
    case 'rejected':
      return 'danger';
    case 'expired':
      return 'neutral';
    default:
      return 'warning';
  }
}

function resolveApprovalStatusLabel(
  status: AgentApprovalTimelineEntry['status'],
) {
  switch (status) {
    case 'approved':
      return appI18n.agentWorkbench.approval.status.approved;
    case 'rejected':
      return appI18n.agentWorkbench.approval.status.rejected;
    case 'expired':
      return appI18n.agentWorkbench.approval.status.expired;
    default:
      return appI18n.agentWorkbench.approval.status.pending;
  }
}

function resolvePermissionModeLabel(
  permissionMode: AgentApprovalTimelineEntry['permissionMode'],
) {
  switch (permissionMode) {
    case 'read-only':
      return appI18n.agentWorkbench.permissionModes.readOnly;
    case 'danger-full-access':
      return appI18n.agentWorkbench.permissionModes.dangerFullAccess;
    case 'workspace-write':
      return appI18n.agentWorkbench.permissionModes.workspaceWrite;
    default:
      return appI18n.common.unknown;
  }
}

function resolveTimelineEntryTitle(entry: AgentTimelineEntry) {
  switch (entry.kind) {
    case 'terminal-event':
      return resolveTerminalEventLabel(entry.event);
    case 'approval':
      return entry.title;
    case 'error':
      return appI18n.agentWorkbench.events.error;
    default:
      return entry.kind;
  }
}

function resolveTimelineEntryTone(entry: AgentTimelineEntry): AppTone {
  switch (entry.kind) {
    case 'approval':
      return resolveApprovalStatusTone(entry.status);
    case 'error':
      return 'danger';
    case 'terminal-event':
      return entry.event === 'stderr' ? 'warning' : 'neutral';
    default:
      return 'neutral';
  }
}

function findPendingApproval(document: AgentRunDocument | null) {
  if (!document) {
    return null;
  }

  for (let index = document.timeline.length - 1; index >= 0; index -= 1) {
    const entry = document.timeline[index];
    if (entry.kind === 'approval' && entry.status === 'pending') {
      return entry;
    }
  }

  return null;
}

function findLatestApproval(document: AgentRunDocument | null) {
  if (!document) {
    return null;
  }

  for (let index = document.timeline.length - 1; index >= 0; index -= 1) {
    const entry = document.timeline[index];
    if (entry.kind === 'approval') {
      return entry;
    }
  }

  return null;
}

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

function formatThreadSubtitle(thread: AgentThreadSummary) {
  return `${resolveRunStatusLabel(thread.lastRunStatus)} · ${formatIsoTimestamp(thread.updatedAt)}`;
}

function formatWorkspaceSelection(
  selectedWorkspaceStat: WorkspaceEntry | null,
  trustedWorkspace: TrustedWorkspaceTarget | null,
) {
  if (!selectedWorkspaceStat) {
    return (
      trustedWorkspace?.displayName ??
      appI18n.agentWorkbench.workspace.rootLabel
    );
  }

  return selectedWorkspaceStat.relativePath || selectedWorkspaceStat.name;
}

function resolveWorkspaceKindLabel(kind: WorkspaceEntry['kind']) {
  return kind === 'directory'
    ? appI18n.agentWorkbench.workspace.directoryKind
    : appI18n.agentWorkbench.workspace.fileKind;
}

function formatWorkspaceEntryMeta(entry: WorkspaceEntry) {
  return `${resolveWorkspaceKindLabel(entry.kind)} · ${formatSizeBytes(entry.sizeBytes)}`;
}

function DetailField({
  label,
  value,
  valueTestID,
}: {
  label: string;
  value: string;
  valueTestID?: string;
}) {
  const {palette} = useTheme();

  return (
    <View
      style={[
        baseStyles.detailField,
        {
          backgroundColor: palette.canvas,
          borderColor: palette.border,
        },
      ]}>
      <Text style={[baseStyles.detailFieldLabel, {color: palette.inkSoft}]}>
        {label}
      </Text>
      <Text testID={valueTestID} style={[baseStyles.detailFieldValue, {color: palette.ink}]}>
        {value}
      </Text>
    </View>
  );
}

export function AgentWorkbenchScreen() {
  const {width} = useWindowDimensions();
  const {palette} = useTheme();
  const screenStyles = useMemo(() => createScreenStyles(palette), [palette]);
  const isCompactLayout = width < appLayout.breakpoints.compact;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trustedWorkspace, setTrustedWorkspace] =
    useState<TrustedWorkspaceTarget | null>(null);
  const [workspaceDirectories, setWorkspaceDirectories] = useState<
    WorkspaceEntry[]
  >([]);
  const [workspaceEntries, setWorkspaceEntries] = useState<WorkspaceEntry[]>([]);
  const [selectedCwd, setSelectedCwd] = useState('');
  const [selectedWorkspaceStat, setSelectedWorkspaceStat] =
    useState<WorkspaceEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [textInputsReady, setTextInputsReady] = useState(false);
  const [draftGoal, setDraftGoal] = useState('');
  const [draftCommand, setDraftCommand] = useState('git status');
  const [draftRequiresApproval, setDraftRequiresApproval] = useState(false);
  const [searchResults, setSearchResults] = useState<WorkspaceEntry[]>([]);
  const [selectedInspectorEntry, setSelectedInspectorEntry] =
    useState<WorkspaceEntry | null>(null);
  const [selectedInspectorChildren, setSelectedInspectorChildren] = useState<
    WorkspaceEntry[]
  >([]);
  const [selectedInspectorContent, setSelectedInspectorContent] =
    useState<string | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [selectedDiffPath, setSelectedDiffPath] = useState<string | null>(null);
  const [selectedDiffOutput, setSelectedDiffOutput] = useState<string | null>(
    null,
  );
  const [selectedDiffError, setSelectedDiffError] = useState<string | null>(
    null,
  );
  const [diffLoading, setDiffLoading] = useState(false);
  const [threads, setThreads] = useState<AgentThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadRunDocuments, setThreadRunDocuments] = useState<
    AgentRunDocument[]
  >([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunDocument, setSelectedRunDocument] =
    useState<AgentRunDocument | null>(null);
  const [approvalBusy, setApprovalBusy] = useState<
    'requesting' | 'approving' | 'rejecting' | null
  >(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [taskDraftBusy, setTaskDraftBusy] = useState<
    'running' | 'requesting' | null
  >(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'support' | 'danger' | 'neutral'>(
    'neutral',
  );
  const [activeRunInfo, setActiveRunInfo] = useState<{
    threadId: string;
    runId: string;
  } | null>(null);

  const activeRunHandleRef = useRef<PersistedAgentTerminalRunHandle | null>(null);
  const diffSessionRef = useRef<AgentTerminalSessionHandle | null>(null);
  const selectedCwdRef = useRef('');
  const selectedThreadIdRef = useRef<string | null>(null);
  const selectedRunIdRef = useRef<string | null>(null);
  const diffRequestIdRef = useRef(0);
  const inspectorRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  const interruptedRunsReconciledRef = useRef(false);

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
  const selectedRunRequest = selectedRunDocument?.run.request ?? null;
  const selectedRunWorkspacePath = selectedRunRequest?.cwd ?? '';
  const canRestoreSelectedRunWorkspace =
    trustedWorkspace !== null &&
    selectedRunRequest !== null &&
    selectedRunWorkspacePath !== selectedCwd;
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
  const draftTask = useMemo(
    () =>
      resolveWorkbenchTaskDraft({
        goal: draftGoal,
        command: draftCommand,
        cwd: selectedCwd,
        requiresApproval: draftRequiresApproval,
      }),
    [draftCommand, draftGoal, draftRequiresApproval, selectedCwd],
  );
  const selectedGitDiffCommand = useMemo(() => {
    if (!selectedInspectorEntry || selectedInspectorEntry.kind === 'directory') {
      return null;
    }

    return buildWorkspaceGitDiffCommand(selectedInspectorEntry.relativePath);
  }, [selectedInspectorEntry]);

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

  useEffect(() => {
    void (async () => {
      try {
        await refreshWorkbench();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshWorkbench]);

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

  useEffect(() => {
    if (loading || textInputsReady) {
      return;
    }

    // Delay RN Windows TextInput mounting until after the first real screen
    // commit and a short startup warmup. Direct main-window startup can
    // otherwise crash before the workbench finishes its startup probes.
    const timer = setTimeout(() => {
      setTextInputsReady(true);
    }, textInputWarmupDelayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [loading, textInputsReady]);

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

  const handleRunGitStatus = useCallback(async () => {
    if (!trustedWorkspace) {
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.missingWorkspace);
      return;
    }

    try {
      const continuedThreadId = selectedThreadIdRef.current || undefined;
      const handle = await openPersistedAgentTerminalRun({
        threadId: continuedThreadId,
        title: appI18n.agentWorkbench.run.gitStatusTitle,
        goal: `${appI18n.agentWorkbench.run.gitStatusGoal} ${selectedCwdRef.current || trustedWorkspace.displayName || trustedWorkspace.rootPath}`,
        command: 'git status',
        cwd: selectedCwdRef.current || undefined,
      });
      const continuedFromRunId = handle.getSnapshot().run.resumedFromRunId;

      attachActiveRunHandle(handle);
      setStatusTone('support');
      setStatusMessage(appI18n.agentWorkbench.feedback.runStarted);
      logInteraction('agent-workbench.run.started', {
        threadId: handle.threadId,
        runId: handle.runId,
        resumedFromRunId: continuedFromRunId,
        cwd: selectedCwdRef.current,
      });

      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: handle.threadId,
        preferredRunId: handle.runId,
      });
    } catch (error) {
      logException('agent-workbench.run.failed', error, {
        cwd: selectedCwdRef.current,
      });
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.runFailed);
      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: selectedThreadIdRef.current,
        preferredRunId: selectedRunIdRef.current,
      });
    }
  }, [attachActiveRunHandle, refreshWorkbench, trustedWorkspace]);

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
        requiresApproval: true,
        approvalTitle: appI18n.agentWorkbench.approval.requestTitle,
        approvalDetails: appI18n.agentWorkbench.approval.requestDetails(
          workspaceWriteApprovalCommand.relativePath,
          selectedCwdRef.current || appI18n.agentWorkbench.workspace.rootLabel,
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

  const handleLoadSelectedDiff = useCallback(async () => {
    if (
      !selectedInspectorEntry ||
      selectedInspectorEntry.kind === 'directory' ||
      !selectedGitDiffCommand
    ) {
      return;
    }

    diffRequestIdRef.current += 1;
    const requestId = diffRequestIdRef.current;
    const previousSession = diffSessionRef.current;
    diffSessionRef.current = null;
    if (previousSession) {
      void previousSession.cancel().catch(() => {});
    }

    setSelectedDiffPath(selectedInspectorEntry.relativePath);
    setSelectedDiffOutput('');
    setSelectedDiffError(null);
    setDiffLoading(true);

    const chunks: string[] = [];
    let settled = false;

    try {
      const session = await openAgentTerminalSession(
        {
          command: selectedGitDiffCommand.command,
          cwd: selectedGitDiffCommand.cwd,
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
              relativePath: selectedInspectorEntry.relativePath,
              cwd: selectedGitDiffCommand.cwd,
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
        relativePath: selectedInspectorEntry.relativePath,
        cwd: selectedGitDiffCommand.cwd,
      });
    }
  }, [selectedGitDiffCommand, selectedInspectorEntry]);

  useEffect(() => () => {
    diffRequestIdRef.current += 1;
    const currentSession = diffSessionRef.current;
    diffSessionRef.current = null;
    if (currentSession) {
      void currentSession.cancel().catch(() => {});
    }
  }, []);

  const workspaceChoices = useMemo(
    () =>
      createWorkspaceChoices({
        trustedWorkspace,
        directories: workspaceDirectories,
        currentPath: selectedCwd,
      }),
    [selectedCwd, trustedWorkspace, workspaceDirectories],
  );

  if (loading) {
    return (
      <View style={screenStyles.loadingShell}>
        <ActivityIndicator size='small' color={palette.accent} />
      </View>
    );
  }

  return (
    <View testID='agent-workbench.screen' style={screenStyles.screen}>
      <ScrollView style={screenStyles.scroll} contentContainerStyle={screenStyles.content}>
        <AppFrame
          eyebrow={appI18n.agentWorkbench.frame.eyebrow}
          title={appI18n.agentWorkbench.frame.title}
          description={appI18n.agentWorkbench.frame.description}>
          <Stack style={screenStyles.stack}>
            <Toolbar testID='agent-workbench.toolbar' style={screenStyles.toolbar}>
              <SignalPill
                testID='agent-workbench.status.workspace'
                label={
                  trustedWorkspace
                    ? appI18n.agentWorkbench.workspace.ready
                    : appI18n.agentWorkbench.workspace.missing
                }
                tone={trustedWorkspace ? 'support' : 'warning'}
                size='sm'
              />
              <StatusBadge
                testID='agent-workbench.status.run'
                label={resolveRunStatusLabel(selectedRunStatus)}
                tone={resolveRunStatusTone(selectedRunStatus)}
                emphasis='soft'
                size='sm'
              />
              <ActionButton
                testID='agent-workbench.action.run-git-status'
                label={
                  activeRunInfo
                    ? appI18n.agentWorkbench.actions.runningGitStatus
                    : appI18n.agentWorkbench.actions.runGitStatus
                }
                onPress={() => {
                  void handleRunGitStatus();
                }}
                disabled={!trustedWorkspace || activeRunInfo !== null}
              />
              <ActionButton
                testID='agent-workbench.action.request-write-approval'
                label={
                  approvalBusy === 'requesting'
                    ? appI18n.agentWorkbench.actions.requestingWriteApproval
                    : appI18n.agentWorkbench.actions.requestWriteApproval
                }
                onPress={() => {
                  void handleRequestWriteApproval();
                }}
                disabled={
                  !trustedWorkspace ||
                  activeRunInfo !== null ||
                  approvalBusy !== null
                }
              />
              {selectedCwd ? (
                <ActionButton
                  testID='agent-workbench.action.browse-workspace-root'
                  label={appI18n.agentWorkbench.actions.browseWorkspaceRoot}
                  onPress={() => {
                    void handleBrowseDirectory('');
                  }}
                  tone='ghost'
                />
              ) : null}
              {previousThreadRunDocument && !viewingHistoricalRun ? (
                <ActionButton
                  testID='agent-workbench.action.view-previous-run'
                  label={appI18n.agentWorkbench.actions.viewPreviousRun}
                  onPress={() => {
                    selectedRunIdRef.current = previousThreadRunDocument.run.runId;
                    setSelectedRunId(previousThreadRunDocument.run.runId);
                    setSelectedRunDocument(previousThreadRunDocument);
                  }}
                  tone='ghost'
                />
              ) : null}
              <ActionButton
                testID='agent-workbench.action.cancel-run'
                label={appI18n.agentWorkbench.actions.cancelRun}
                onPress={() => {
                  void handleCancelRun();
                }}
                disabled={activeRunInfo === null}
                tone='ghost'
              />
              <ActionButton
                testID='agent-workbench.action.refresh'
                label={
                  refreshing
                    ? appI18n.agentWorkbench.actions.refreshing
                    : appI18n.agentWorkbench.actions.refresh
                }
                onPress={() => {
                  void handleRefresh();
                }}
                disabled={refreshing}
                tone='ghost'
              />
              {activeRunInfo ? (
                <View style={screenStyles.toolbarBusy}>
                  <ActivityIndicator size='small' color={palette.accent} />
                </View>
              ) : null}
            </Toolbar>

            {statusMessage ? (
              <InfoPanel
                testID='agent-workbench.status.panel'
                title={appI18n.agentWorkbench.feedback.title}
                tone={
                  statusTone === 'support'
                    ? 'accent'
                    : statusTone === 'danger'
                      ? 'danger'
                      : 'neutral'
                }>
                <Text testID='agent-workbench.status.message' style={[screenStyles.infoText, {color: palette.ink}]}>
                  {statusMessage}
                </Text>
              </InfoPanel>
            ) : null}

            <View
              style={[
                screenStyles.contentShell,
                isCompactLayout ? screenStyles.contentShellCompact : null,
              ]}>
              <View
                style={[
                  screenStyles.sidebar,
                  isCompactLayout ? screenStyles.sidebarCompact : null,
                ]}>
                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.workspaceTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.workspaceDescription}
                  </Text>

                  {!trustedWorkspace ? (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.workspaceTitle}
                      description={appI18n.agentWorkbench.empty.workspaceDescription}
                    />
                  ) : (
                    <View style={screenStyles.sectionBody}>
                      <View style={screenStyles.detailGrid}>
                        <DetailField
                          label={appI18n.agentWorkbench.labels.rootPath}
                          value={trustedWorkspace.rootPath}
                          valueTestID='agent-workbench.detail.root-path'
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.selectedCwd}
                          value={formatWorkspaceSelection(
                            selectedWorkspaceStat,
                            trustedWorkspace,
                          )}
                          valueTestID='agent-workbench.detail.selected-cwd'
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.currentType}
                          value={
                            selectedWorkspaceStat?.kind ??
                            appI18n.agentWorkbench.workspace.directoryKind
                          }
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.size}
                          value={formatSizeBytes(selectedWorkspaceStat?.sizeBytes ?? null)}
                        />
                      </View>
                      <View style={screenStyles.choiceGrid}>
                        {workspaceChoices.map(choice => (
                          <ChoiceChip
                            key={choice.key || 'workspace-root'}
                            testID={`agent-workbench.workspace.${choice.key || 'root'}`}
                            label={choice.label}
                            detail={choice.detail}
                            active={selectedCwd === choice.key}
                            activeBadgeLabel={appI18n.agentWorkbench.workspace.currentBadge}
                            inactiveBadgeLabel={appI18n.agentWorkbench.workspace.availableBadge}
                            onPress={() => {
                              void handleBrowseDirectory(choice.key);
                            }}
                            style={screenStyles.choiceChip}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.taskDraftTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.taskDraftDescription}
                  </Text>

                  {!trustedWorkspace ? (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.workspaceTitle}
                      description={appI18n.agentWorkbench.empty.workspaceDescription}
                    />
                  ) : (
                    <View style={screenStyles.sectionBody}>
                      <View style={screenStyles.inputFieldGroup}>
                        <Text style={[screenStyles.inputLabel, {color: palette.inkSoft}]}>
                          {appI18n.agentWorkbench.labels.draftGoal}
                        </Text>
                        {textInputsReady ? (
                          <View
                            style={[
                              screenStyles.textInputShell,
                              {
                                borderColor: palette.border,
                                backgroundColor: palette.panel,
                              },
                            ]}>
                            <RNTextInput
                              testID='agent-workbench.task.goal-input'
                              value={draftGoal}
                              onChangeText={setDraftGoal}
                              placeholder={
                                appI18n.agentWorkbench.taskDraft.goalPlaceholder
                              }
                              placeholderTextColor={palette.inkSoft}
                              style={[
                                screenStyles.textInputField,
                                {
                                  color: palette.ink,
                                },
                              ]}
                            />
                          </View>
                        ) : (
                          <View
                            style={[
                              screenStyles.textInputPlaceholder,
                              {
                                borderColor: palette.border,
                                backgroundColor: palette.panel,
                              },
                            ]}>
                            <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
                              {appI18n.agentWorkbench.taskDraft.goalPlaceholder}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={screenStyles.inputFieldGroup}>
                        <Text style={[screenStyles.inputLabel, {color: palette.inkSoft}]}>
                          {appI18n.agentWorkbench.labels.draftCommand}
                        </Text>
                        {textInputsReady ? (
                          <View
                            style={[
                              screenStyles.textInputShell,
                              screenStyles.textInputMultilineShell,
                              {
                                borderColor: palette.border,
                                backgroundColor: palette.panel,
                              },
                            ]}>
                            <RNTextInput
                              testID='agent-workbench.task.command-input'
                              value={draftCommand}
                              onChangeText={setDraftCommand}
                              placeholder={
                                appI18n.agentWorkbench.taskDraft.commandPlaceholder
                              }
                              placeholderTextColor={palette.inkSoft}
                              multiline
                              textAlignVertical='top'
                              style={[
                                screenStyles.textInputField,
                                screenStyles.textInputMultiline,
                                {
                                  color: palette.ink,
                                },
                              ]}
                            />
                          </View>
                        ) : (
                          <View
                            style={[
                              screenStyles.textInputPlaceholder,
                              screenStyles.textInputMultilineShell,
                              {
                                borderColor: palette.border,
                                backgroundColor: palette.panel,
                              },
                            ]}>
                            <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
                              {appI18n.agentWorkbench.taskDraft.commandPlaceholder}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={screenStyles.choiceGrid}>
                        <ChoiceChip
                          testID='agent-workbench.task.mode.direct'
                          label={appI18n.agentWorkbench.taskDraft.directMode}
                          detail={appI18n.agentWorkbench.taskDraft.directModeDetail}
                          active={!draftRequiresApproval}
                          activeBadgeLabel={appI18n.agentWorkbench.taskDraft.activeBadge}
                          inactiveBadgeLabel={appI18n.agentWorkbench.taskDraft.availableBadge}
                          onPress={() => {
                            setDraftRequiresApproval(false);
                          }}
                          style={screenStyles.choiceChip}
                        />
                        <ChoiceChip
                          testID='agent-workbench.task.mode.approval'
                          label={appI18n.agentWorkbench.taskDraft.approvalMode}
                          detail={appI18n.agentWorkbench.taskDraft.approvalModeDetail}
                          active={draftRequiresApproval}
                          activeBadgeLabel={appI18n.agentWorkbench.taskDraft.activeBadge}
                          inactiveBadgeLabel={appI18n.agentWorkbench.taskDraft.availableBadge}
                          onPress={() => {
                            setDraftRequiresApproval(true);
                          }}
                          style={screenStyles.choiceChip}
                        />
                      </View>

                      {!draftRequiresApproval && draftTask && !draftTask.canRunDirect ? (
                        <InfoPanel
                          title={appI18n.agentWorkbench.taskDraft.directModeGuardTitle}
                          tone='accent'>
                          <Text
                            style={[
                              screenStyles.sectionDescription,
                              {color: palette.inkMuted},
                            ]}>
                            {appI18n.agentWorkbench.taskDraft.directModeGuardDetail}
                          </Text>
                        </InfoPanel>
                      ) : null}

                      <ActionButton
                        testID='agent-workbench.action.start-draft-task'
                        label={
                          draftRequiresApproval
                            ? taskDraftBusy === 'requesting'
                              ? appI18n.agentWorkbench.actions.requestingDraftApproval
                              : appI18n.agentWorkbench.actions.requestDraftApproval
                            : taskDraftBusy === 'running'
                              ? appI18n.agentWorkbench.actions.runningDraftTask
                              : appI18n.agentWorkbench.actions.runDraftTask
                        }
                        onPress={() => {
                          void handleStartDraftTask();
                        }}
                        disabled={
                          !textInputsReady ||
                          !trustedWorkspace ||
                          activeRunInfo !== null ||
                          approvalBusy !== null ||
                          taskDraftBusy !== null ||
                          draftTask === null ||
                          (!draftRequiresApproval && !draftTask.canRunDirect)
                        }
                      />
                    </View>
                  )}
                </View>

                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.directoryTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.directoryDescription}
                  </Text>

                  {!trustedWorkspace ? (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.directoryTitle}
                      description={appI18n.agentWorkbench.empty.directoryDescription}
                    />
                  ) : workspaceEntries.length === 0 ? (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.directoryTitle}
                      description={appI18n.agentWorkbench.empty.directoryDescription}
                    />
                  ) : (
                    <View style={screenStyles.threadList}>
                      {workspaceEntries.map(entry => (
                        <ChoiceChip
                          key={entry.relativePath || entry.name}
                          label={entry.name}
                          detail={entry.relativePath || appI18n.agentWorkbench.workspace.rootLabel}
                          meta={formatWorkspaceEntryMeta(entry)}
                          active={
                            selectedInspectorEntry?.relativePath === entry.relativePath
                          }
                          activeBadgeLabel={appI18n.agentWorkbench.inspector.selectedBadge}
                          inactiveBadgeLabel={appI18n.agentWorkbench.inspector.availableBadge}
                          onPress={() => {
                            void handleInspectWorkspaceEntry(entry);
                          }}
                          style={screenStyles.choiceChip}
                        />
                      ))}
                    </View>
                  )}
                </View>

                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.searchTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.searchDescription}
                  </Text>

                  {!trustedWorkspace ? (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.searchTitle}
                      description={appI18n.agentWorkbench.empty.searchDescription}
                    />
                  ) : (
                    <View style={screenStyles.sectionBody}>
                      {textInputsReady ? (
                        <View
                          style={[
                            screenStyles.textInputShell,
                            {
                              borderColor: palette.border,
                              backgroundColor: palette.panel,
                            },
                          ]}>
                          <RNTextInput
                            testID='agent-workbench.search.input'
                            value={searchQuery}
                            onChangeText={text => {
                              searchRequestIdRef.current += 1;
                              setSearchQuery(text);
                              setSearching(false);
                              if (text.trim().length === 0) {
                                setSearchResults([]);
                              }
                            }}
                            placeholder={appI18n.agentWorkbench.search.placeholder}
                            placeholderTextColor={palette.inkSoft}
                            style={[
                              screenStyles.textInputField,
                              {
                                color: palette.ink,
                              },
                            ]}
                          />
                        </View>
                      ) : (
                        <View
                          style={[
                            screenStyles.textInputPlaceholder,
                            {
                              borderColor: palette.border,
                              backgroundColor: palette.panel,
                            },
                          ]}>
                          <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
                            {appI18n.agentWorkbench.search.placeholder}
                          </Text>
                        </View>
                      )}
                      <ActionButton
                        label={
                          searching
                            ? appI18n.agentWorkbench.actions.searching
                            : appI18n.agentWorkbench.actions.search
                        }
                        onPress={() => {
                          void handleSearch();
                        }}
                        disabled={
                          !textInputsReady ||
                          searching ||
                          searchQuery.trim().length === 0
                        }
                        tone='ghost'
                      />
                      {searchResults.length === 0 ? (
                        <EmptyState
                          title={appI18n.agentWorkbench.empty.searchTitle}
                          description={appI18n.agentWorkbench.empty.searchDescription}
                        />
                      ) : (
                        <View style={screenStyles.threadList}>
                          {searchResults.map(entry => (
                            <ChoiceChip
                              key={`${entry.relativePath}:${entry.kind}`}
                              label={entry.name}
                              detail={entry.relativePath}
                              meta={formatWorkspaceEntryMeta(entry)}
                              active={
                                selectedInspectorEntry?.relativePath === entry.relativePath
                              }
                              activeBadgeLabel={appI18n.agentWorkbench.inspector.selectedBadge}
                              inactiveBadgeLabel={appI18n.agentWorkbench.inspector.availableBadge}
                              onPress={() => {
                                void handleInspectWorkspaceEntry(entry);
                              }}
                              style={screenStyles.choiceChip}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.threadsTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.threadsDescription}
                  </Text>

                  {threads.length === 0 ? (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.threadsTitle}
                      description={appI18n.agentWorkbench.empty.threadsDescription}
                    />
                  ) : (
                    <View style={screenStyles.threadList}>
                      {threads.map(thread => (
                        <ChoiceChip
                          key={thread.threadId}
                          label={thread.title}
                          detail={formatThreadSubtitle(thread)}
                          meta={thread.lastRunId ?? appI18n.common.unknown}
                          active={thread.threadId === selectedThreadId}
                          activeBadgeLabel={appI18n.agentWorkbench.threads.selectedBadge}
                          inactiveBadgeLabel={appI18n.agentWorkbench.threads.availableBadge}
                          onPress={() => {
                            selectedThreadIdRef.current = thread.threadId;
                            selectedRunIdRef.current = null;
                            setSelectedThreadId(thread.threadId);
                            setSelectedRunId(null);
                            void refreshWorkbench({
                              preferredCwd: selectedCwdRef.current,
                              preferredThreadId: thread.threadId,
                              preferredRunId: null,
                            });
                          }}
                          style={screenStyles.choiceChip}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View
                style={[
                  screenStyles.detailPane,
                  isCompactLayout ? screenStyles.detailPaneCompact : null,
                ]}>
                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.inspectorTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.inspectorDescription}
                  </Text>

                  {!selectedInspectorEntry ? (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.inspectorTitle}
                      description={appI18n.agentWorkbench.empty.inspectorDescription}
                    />
                  ) : (
                    <View style={screenStyles.sectionBody}>
                      <View style={screenStyles.detailGrid}>
                        <DetailField
                          label={appI18n.agentWorkbench.labels.relativePath}
                          value={
                            selectedInspectorEntry.relativePath ||
                            appI18n.agentWorkbench.workspace.rootLabel
                          }
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.currentType}
                          value={resolveWorkspaceKindLabel(selectedInspectorEntry.kind)}
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.size}
                          value={formatSizeBytes(selectedInspectorEntry.sizeBytes)}
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.childCount}
                          value={`${selectedInspectorChildren.length}`}
                        />
                      </View>

                      {inspectorLoading ? (
                        <View style={screenStyles.loadingInline}>
                          <ActivityIndicator size='small' color={palette.accent} />
                        </View>
                      ) : null}

                      {selectedInspectorEntry.kind === 'directory' ? (
                        <View style={screenStyles.sectionBody}>
                          <ActionButton
                            label={appI18n.agentWorkbench.actions.openDirectory}
                            onPress={() => {
                              void handleBrowseDirectory(
                                selectedInspectorEntry.relativePath,
                              );
                            }}
                            disabled={selectedCwd === selectedInspectorEntry.relativePath}
                            tone='ghost'
                          />
                          {selectedInspectorChildren.length === 0 ? (
                            <EmptyState
                              title={appI18n.agentWorkbench.empty.directoryTitle}
                              description={
                                appI18n.agentWorkbench.empty.directoryDescription
                              }
                            />
                          ) : (
                            <View style={screenStyles.threadList}>
                              {selectedInspectorChildren.map(entry => (
                                <ChoiceChip
                                  key={`${entry.relativePath}:${entry.kind}`}
                                  label={entry.name}
                                  detail={entry.relativePath}
                                  meta={formatWorkspaceEntryMeta(entry)}
                                  active={
                                    selectedInspectorEntry.relativePath ===
                                    entry.relativePath
                                  }
                                  activeBadgeLabel={
                                    appI18n.agentWorkbench.inspector.selectedBadge
                                  }
                                  inactiveBadgeLabel={
                                    appI18n.agentWorkbench.inspector.availableBadge
                                  }
                                  onPress={() => {
                                    void handleInspectWorkspaceEntry(entry);
                                  }}
                                  style={screenStyles.choiceChip}
                                />
                              ))}
                            </View>
                          )}
                        </View>
                      ) : (
                        <View
                          style={[
                            screenStyles.terminalBox,
                            {
                              backgroundColor: palette.canvas,
                              borderColor: palette.border,
                            },
                          ]}>
                          <ScrollView style={screenStyles.terminalScroll}>
                            <Text
                              style={[
                                screenStyles.terminalText,
                                {
                                  color: palette.ink,
                                  fontFamily: terminalFontFamily,
                                },
                              ]}>
                              {selectedInspectorContent === null
                                ? appI18n.agentWorkbench.empty.contentUnavailable
                                : selectedInspectorContent ||
                                  appI18n.agentWorkbench.empty.fileContent}
                            </Text>
                          </ScrollView>
                        </View>
                      )}

                      {selectedInspectorEntry.kind === 'file' ? (
                        <View style={screenStyles.sectionBody}>
                          <Text style={screenStyles.sectionTitle}>
                            {appI18n.agentWorkbench.sections.diffTitle}
                          </Text>
                          <Text style={screenStyles.sectionDescription}>
                            {appI18n.agentWorkbench.sections.diffDescription}
                          </Text>

                          {selectedGitDiffCommand ? (
                            <ActionButton
                              label={
                                diffLoading
                                  ? appI18n.agentWorkbench.actions.loadingDiff
                                  : selectedDiffPath ===
                                      selectedInspectorEntry.relativePath
                                    ? appI18n.agentWorkbench.actions.refreshDiff
                                    : appI18n.agentWorkbench.actions.loadDiff
                              }
                              onPress={() => {
                                void handleLoadSelectedDiff();
                              }}
                              disabled={diffLoading}
                              tone='ghost'
                            />
                          ) : null}

                          {selectedDiffError ? (
                            <InfoPanel
                              title={appI18n.agentWorkbench.sections.diffTitle}
                              tone='danger'>
                              <Text
                                style={[screenStyles.infoText, {color: palette.ink}]}>
                                {selectedDiffError}
                              </Text>
                            </InfoPanel>
                          ) : null}

                          {selectedDiffError
                            ? null
                            : !selectedGitDiffCommand
                              ? (
                                  <EmptyState
                                    title={
                                      appI18n.agentWorkbench.empty.diffUnavailableTitle
                                    }
                                    description={
                                      appI18n.agentWorkbench.empty.diffUnavailableDescription
                                    }
                                  />
                                )
                              : selectedDiffPath !==
                                    selectedInspectorEntry.relativePath
                                ? (
                                    <EmptyState
                                      title={appI18n.agentWorkbench.empty.diffTitle}
                                      description={
                                        appI18n.agentWorkbench.empty.diffDescription
                                      }
                                    />
                                  )
                                : diffLoading && !selectedDiffOutput
                                  ? (
                                      <View style={screenStyles.loadingInline}>
                                        <ActivityIndicator
                                          size='small'
                                          color={palette.accent}
                                        />
                                      </View>
                                    )
                                  : selectedDiffOutput
                                    ? (
                                        <View
                                          style={[
                                            screenStyles.terminalBox,
                                            {
                                              backgroundColor: palette.canvas,
                                              borderColor: palette.border,
                                            },
                                          ]}>
                                          <ScrollView style={screenStyles.terminalScroll}>
                                            <Text
                                              style={[
                                                screenStyles.terminalText,
                                                {
                                                  color: palette.ink,
                                                  fontFamily: terminalFontFamily,
                                                },
                                              ]}>
                                              {selectedDiffOutput}
                                            </Text>
                                          </ScrollView>
                                        </View>
                                      )
                                    : (
                                        <EmptyState
                                          title={
                                            appI18n.agentWorkbench.empty.diffNoChangesTitle
                                          }
                                          description={
                                            appI18n.agentWorkbench.empty.diffNoChangesDescription
                                          }
                                        />
                                      )}
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>

                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.runHistoryTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.runHistoryDescription}
                  </Text>

                  {threadRunDocuments.length === 0 ? (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.runHistoryTitle}
                      description={
                        appI18n.agentWorkbench.empty.runHistoryDescription
                      }
                    />
                  ) : (
                    <View style={screenStyles.threadList}>
                      {threadRunDocuments.map((document, index) => (
                        <ChoiceChip
                          key={document.run.runId}
                          testID={`agent-workbench.run-history.index-${index}`}
                          label={
                            document.run.goal ||
                            document.run.request?.command ||
                            document.run.runId
                          }
                          detail={`${resolveRunStatusLabel(document.run.status)} · ${formatIsoTimestamp(document.run.updatedAt)}`}
                          meta={
                            document.run.runId === latestThreadRunDocument?.run.runId
                              ? appI18n.agentWorkbench.runHistory.latest(
                                  document.run.runId,
                                )
                              : document.run.resumedFromRunId
                              ? appI18n.agentWorkbench.runHistory.resumedFrom(
                                  document.run.resumedFromRunId,
                                )
                              : document.run.runId
                          }
                          active={document.run.runId === selectedRunId}
                          activeBadgeLabel={
                            appI18n.agentWorkbench.runHistory.selectedBadge
                          }
                          inactiveBadgeLabel={
                            appI18n.agentWorkbench.runHistory.availableBadge
                          }
                          onPress={() => {
                            selectedRunIdRef.current = document.run.runId;
                            setSelectedRunId(document.run.runId);
                            setSelectedRunDocument(document);
                          }}
                          style={screenStyles.choiceChip}
                        />
                      ))}
                    </View>
                  )}
                </View>

                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.runTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.runDescription}
                  </Text>

                  {viewingHistoricalRun && latestThreadRunDocument ? (
                    <InfoPanel
                      title={appI18n.agentWorkbench.runHistory.viewingHistoricalTitle}
                      tone='neutral'
                      testID='agent-workbench.run-history.viewing-historical'>
                      <View style={screenStyles.sectionBody}>
                        <Text style={[screenStyles.infoText, {color: palette.ink}]}>
                          {appI18n.agentWorkbench.runHistory.viewingHistoricalDescription(
                            latestThreadRunDocument.run.runId,
                          )}
                        </Text>
                        <ActionButton
                          testID='agent-workbench.action.focus-latest-run'
                          label={appI18n.agentWorkbench.actions.focusLatestRun}
                          onPress={() => {
                            selectedRunIdRef.current =
                              latestThreadRunDocument.run.runId;
                            setSelectedRunId(latestThreadRunDocument.run.runId);
                            setSelectedRunDocument(latestThreadRunDocument);
                          }}
                          tone='ghost'
                        />
                      </View>
                    </InfoPanel>
                  ) : null}

                  {selectedRunDocument ? (
                    <>
                      {selectedRunRequest ? (
                        <View style={screenStyles.actionRow}>
                          <ActionButton
                            testID='agent-workbench.action.retry-selected-run'
                            label={
                              retryBusy
                                ? appI18n.agentWorkbench.actions.retryingRun
                                : appI18n.agentWorkbench.actions.retryRun
                            }
                            onPress={() => {
                              void handleRetrySelectedRun();
                            }}
                            disabled={!canRetrySelectedRun}
                          />
                          <ActionButton
                            testID='agent-workbench.action.restore-run-workspace'
                            label={
                              appI18n.agentWorkbench.actions.restoreRunWorkspace
                            }
                            onPress={() => {
                              void handleRestoreSelectedRunWorkspace();
                            }}
                            disabled={!canRestoreSelectedRunWorkspace}
                            tone='ghost'
                          />
                        </View>
                      ) : null}
                      <View style={screenStyles.detailGrid}>
                        <DetailField
                          label={appI18n.agentWorkbench.labels.threadId}
                          value={selectedRunDocument.run.threadId}
                          valueTestID='agent-workbench.run.thread-id'
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.runId}
                          value={selectedRunDocument.run.runId}
                          valueTestID='agent-workbench.run.run-id'
                        />
                        {selectedRunDocument.run.resumedFromRunId ? (
                          <DetailField
                            label={appI18n.agentWorkbench.labels.resumedFromRunId}
                            value={selectedRunDocument.run.resumedFromRunId}
                            valueTestID='agent-workbench.run.resumed-from'
                          />
                        ) : null}
                        <DetailField
                          label={appI18n.agentWorkbench.labels.sessionId}
                          value={selectedRunDocument.run.sessionId ?? appI18n.common.unknown}
                          valueTestID='agent-workbench.run.session-id'
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.goal}
                          value={selectedRunDocument.run.goal}
                          valueTestID='agent-workbench.run.goal'
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.command}
                          value={
                            selectedRunRequest?.command ??
                            appI18n.common.unknown
                          }
                          valueTestID='agent-workbench.run.command'
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.cwd}
                          value={
                            selectedRunRequest?.cwd ??
                            appI18n.agentWorkbench.workspace.rootLabel
                          }
                          valueTestID='agent-workbench.run.cwd'
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.updatedAt}
                          value={formatIsoTimestamp(selectedRunDocument.run.updatedAt)}
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.timelineCount}
                          value={`${selectedRunDocument.timeline.length}`}
                        />
                      </View>
                      {selectedPendingApproval ? (
                        <InfoPanel
                          testID='agent-workbench.approval.panel'
                          title={appI18n.agentWorkbench.approval.pendingTitle}
                          tone='accent'>
                          <View style={screenStyles.approvalPanel}>
                            <Text style={[screenStyles.infoText, {color: palette.ink}]}>
                              {selectedPendingApproval.title}
                            </Text>
                            {selectedPendingApproval.details ? (
                              <Text
                                style={[
                                  screenStyles.sectionDescription,
                                  {color: palette.inkMuted},
                                ]}>
                                {selectedPendingApproval.details}
                              </Text>
                            ) : null}
                            <View style={screenStyles.detailGrid}>
                              <DetailField
                                label={appI18n.agentWorkbench.labels.approvalStatus}
                                value={resolveApprovalStatusLabel(
                                  selectedPendingApproval.status,
                                )}
                              />
                              <DetailField
                                label={appI18n.agentWorkbench.labels.permissionMode}
                                value={resolvePermissionModeLabel(
                                  selectedPendingApproval.permissionMode,
                                )}
                              />
                            </View>
                            <View style={screenStyles.actionRow}>
                              <ActionButton
                                testID='agent-workbench.action.approve-request'
                                label={
                                  approvalBusy === 'approving'
                                    ? appI18n.agentWorkbench.actions.approvingRequest
                                    : appI18n.agentWorkbench.actions.approveRequest
                                }
                                onPress={() => {
                                  void handleApproveSelectedRun();
                                }}
                                disabled={approvalBusy !== null}
                              />
                              <ActionButton
                                testID='agent-workbench.action.reject-request'
                                label={
                                  approvalBusy === 'rejecting'
                                    ? appI18n.agentWorkbench.actions.rejectingRequest
                                    : appI18n.agentWorkbench.actions.rejectRequest
                                }
                                onPress={() => {
                                  void handleRejectSelectedRun();
                                }}
                                disabled={approvalBusy !== null}
                                tone='ghost'
                              />
                            </View>
                          </View>
                        </InfoPanel>
                      ) : null}
                    </>
                  ) : (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.runTitle}
                      description={appI18n.agentWorkbench.empty.runDescription}
                    />
                  )}
                </View>

                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.timelineTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.timelineDescription}
                  </Text>

                  {!selectedRunDocument || selectedRunDocument.timeline.length === 0 ? (
                    <EmptyState
                      title={appI18n.agentWorkbench.empty.timelineTitle}
                      description={appI18n.agentWorkbench.empty.timelineDescription}
                    />
                  ) : (
                    <View style={screenStyles.timelineList}>
                      {selectedRunDocument.timeline.map(entry => (
                        <Expander
                          key={entry.entryId}
                          title={resolveTimelineEntryTitle(entry)}
                          defaultExpanded={
                            entry.kind === 'error' || entry.kind === 'approval'
                          }
                          trailing={
                            <SignalPill
                              label={
                                entry.kind === 'approval'
                                  ? resolveApprovalStatusLabel(entry.status)
                                  : formatIsoTimestamp(entry.createdAt)
                              }
                              tone={resolveTimelineEntryTone(entry)}
                              size='sm'
                            />
                          }>
                          {entry.kind === 'terminal-event' ? (
                            <View style={screenStyles.expanderBody}>
                              <View style={screenStyles.detailGrid}>
                                <DetailField
                                  label={appI18n.agentWorkbench.labels.event}
                                  value={resolveTerminalEventLabel(entry.event)}
                                />
                                <DetailField
                                  label={appI18n.agentWorkbench.labels.command}
                                  value={entry.command ?? appI18n.common.unknown}
                                />
                                <DetailField
                                  label={appI18n.agentWorkbench.labels.cwd}
                                  value={entry.cwd ?? appI18n.common.unknown}
                                />
                                <DetailField
                                  label={appI18n.agentWorkbench.labels.exitCode}
                                  value={
                                    entry.exitCode === null
                                      ? appI18n.common.unknown
                                      : `${entry.exitCode}`
                                  }
                                />
                              </View>
                              {entry.text ? (
                                <View
                                  style={[
                                    screenStyles.terminalBox,
                                    {
                                      backgroundColor: palette.canvas,
                                      borderColor: palette.border,
                                    },
                                  ]}>
                                  <Text
                                    style={[
                                      screenStyles.terminalText,
                                      {
                                        color: palette.ink,
                                        fontFamily: terminalFontFamily,
                                      },
                                    ]}>
                                    {entry.text}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          ) : entry.kind === 'approval' ? (
                            <View style={screenStyles.expanderBody}>
                              <View style={screenStyles.detailGrid}>
                                <DetailField
                                  label={appI18n.agentWorkbench.labels.approvalStatus}
                                  value={resolveApprovalStatusLabel(entry.status)}
                                />
                                <DetailField
                                  label={appI18n.agentWorkbench.labels.permissionMode}
                                  value={resolvePermissionModeLabel(
                                    entry.permissionMode,
                                  )}
                                />
                                <DetailField
                                  label={appI18n.agentWorkbench.labels.updatedAt}
                                  value={formatIsoTimestamp(entry.createdAt)}
                                />
                              </View>
                              {entry.details ? (
                                <View
                                  style={[
                                    screenStyles.terminalBox,
                                    {
                                      backgroundColor: palette.canvas,
                                      borderColor: palette.border,
                                    },
                                  ]}>
                                  <Text
                                    style={[
                                      screenStyles.infoText,
                                      {color: palette.ink},
                                    ]}>
                                    {entry.details}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          ) : (
                            <View
                              style={[
                                screenStyles.terminalBox,
                                {
                                  backgroundColor: palette.canvas,
                                  borderColor: palette.border,
                                },
                              ]}>
                              <Text style={[screenStyles.infoText, {color: palette.ink}]}>
                                {entry.kind === 'error'
                                  ? entry.message
                                  : entry.kind}
                              </Text>
                            </View>
                          )}
                        </Expander>
                      ))}
                    </View>
                  )}
                </View>

                <View style={screenStyles.sectionCard}>
                  <Text style={screenStyles.sectionTitle}>
                    {appI18n.agentWorkbench.sections.terminalTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.terminalDescription}
                  </Text>

                  <View
                    style={[
                      screenStyles.terminalBox,
                      {
                        backgroundColor: palette.canvas,
                        borderColor: palette.border,
                      },
                    ]}>
                    <ScrollView style={screenStyles.terminalScroll}>
                      <Text
                        testID='agent-workbench.terminal.transcript'
                        style={[
                          screenStyles.terminalText,
                          {
                            color: palette.ink,
                            fontFamily: terminalFontFamily,
                          },
                        ]}>
                        {terminalTranscript || appI18n.agentWorkbench.empty.terminalDescription}
                      </Text>
                    </ScrollView>
                  </View>
                </View>
              </View>
            </View>
          </Stack>
        </AppFrame>
      </ScrollView>
    </View>
  );
}

function createScreenStyles(palette: AppPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.canvas,
    },
    scroll: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingBottom: appSpacing.xl,
    },
    stack: {
      gap: appSpacing.lg,
    },
    loadingShell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.canvas,
    },
    toolbar: {
      justifyContent: 'space-between',
    },
    toolbarBusy: {
      minWidth: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoText: {
      ...appTypography.body,
    },
    loadingInline: {
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contentShell: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: appSpacing.lg,
    },
    contentShellCompact: {
      flexDirection: 'column',
    },
    sidebar: {
      flex: 0.95,
      gap: appSpacing.lg,
    },
    sidebarCompact: {
      width: '100%',
    },
    detailPane: {
      flex: 1.05,
      gap: appSpacing.lg,
    },
    detailPaneCompact: {
      width: '100%',
    },
    sectionCard: {
      gap: appSpacing.md,
      borderRadius: appRadius.panel,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.lg,
    },
    sectionTitle: {
      color: palette.ink,
      ...appTypography.sectionTitle,
    },
    sectionDescription: {
      color: palette.inkMuted,
      ...appTypography.body,
    },
    sectionBody: {
      gap: appSpacing.md,
    },
    approvalPanel: {
      gap: appSpacing.md,
    },
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.md,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm,
    },
    choiceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.md,
    },
    choiceChip: {
      maxWidth: '100%',
    },
    inputFieldGroup: {
      gap: appSpacing.xs,
    },
    inputLabel: {
      ...appTypography.captionStrong,
    },
    textInputShell: {
      width: '100%',
      minHeight: 48,
      borderWidth: 1,
      borderRadius: appRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.md,
    },
    textInputField: {
      minHeight: 48,
      paddingVertical: appSpacing.sm,
      fontSize: appTypography.body.fontSize,
      lineHeight: appTypography.body.lineHeight,
    },
    textInputPlaceholder: {
      width: '100%',
      minHeight: 48,
      borderWidth: 1,
      borderRadius: appRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.sm,
    },
    textInputMultilineShell: {
      minHeight: 96,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      paddingVertical: appSpacing.sm,
    },
    textInputMultiline: {
      minHeight: 76,
    },
    threadList: {
      gap: appSpacing.sm,
    },
    timelineList: {
      gap: appSpacing.sm,
    },
    expanderBody: {
      gap: appSpacing.md,
      paddingTop: appSpacing.sm,
    },
    terminalBox: {
      borderRadius: appRadius.control,
      borderWidth: 1,
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.md,
    },
    terminalScroll: {
      maxHeight: 260,
    },
    terminalText: {
      fontSize: 12,
      lineHeight: 18,
    },
  });
}

const baseStyles = StyleSheet.create({
  detailField: {
    flexGrow: 1,
    minWidth: 180,
    gap: appSpacing.xs,
    borderRadius: appRadius.control,
    borderWidth: 1,
    paddingHorizontal: appSpacing.md,
    paddingVertical: appSpacing.sm,
  },
  detailFieldLabel: {
    ...appTypography.captionStrong,
  },
  detailFieldValue: {
    ...appTypography.body,
  },
});
