import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {logException, logInteraction} from '@opapp/framework-diagnostics';
import {
  agentThreadIndexPath,
  buildAgentRunDocumentPath,
  openPersistedAgentTerminalRun,
  parsePersistedAgentRunDocument,
  parsePersistedAgentThreadIndex,
  type AgentRunDocument,
  type AgentRunStatus,
  type AgentTerminalEventType,
  type AgentThreadSummary,
  type PersistedAgentTerminalRunHandle,
} from '@opapp/framework-agent-runtime';
import {
  getTrustedWorkspaceTarget,
  listWorkspaceDirectory,
  readUserFile,
  statWorkspacePath,
  type TrustedWorkspaceTarget,
  type WorkspaceEntry,
} from '@opapp/framework-filesystem';
import {appI18n} from '@opapp/framework-i18n';
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

const terminalFontFamily = Platform.OS === 'windows' ? 'Consolas' : undefined;

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

function resolvePreferredWorkspacePath(
  directories: ReadonlyArray<WorkspaceEntry>,
  currentPath: string,
) {
  const normalizedCurrent = currentPath.trim();
  if (
    normalizedCurrent.length === 0 ||
    directories.some(entry => entry.relativePath === normalizedCurrent)
  ) {
    return normalizedCurrent;
  }

  for (const preferredPath of ['opapp-frontend', 'opapp-desktop', 'opapp-mobile']) {
    if (directories.some(entry => entry.relativePath === preferredPath)) {
      return preferredPath;
    }
  }

  return directories[0]?.relativePath ?? '';
}

function resolveSelectedThreadId(
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

async function loadRunDocument(
  threadId: string | null,
  threads: ReadonlyArray<AgentThreadSummary>,
) {
  const selectedThread =
    (threadId
      ? threads.find(thread => thread.threadId === threadId)
      : threads[0]) ?? null;
  const runId = selectedThread?.lastRunId;
  if (!runId) {
    return null;
  }

  const raw = await readUserFile(buildAgentRunDocumentPath(runId));
  return raw ? parsePersistedAgentRunDocument(raw) : null;
}

function buildTerminalTranscript(document: AgentRunDocument | null) {
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

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
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
      <Text style={[baseStyles.detailFieldValue, {color: palette.ink}]}>
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
  const [selectedCwd, setSelectedCwd] = useState('');
  const [selectedWorkspaceStat, setSelectedWorkspaceStat] =
    useState<WorkspaceEntry | null>(null);
  const [threads, setThreads] = useState<AgentThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedRunDocument, setSelectedRunDocument] =
    useState<AgentRunDocument | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'support' | 'danger' | 'neutral'>(
    'neutral',
  );
  const [activeRunInfo, setActiveRunInfo] = useState<{
    threadId: string;
    runId: string;
  } | null>(null);

  const activeRunHandleRef = useRef<PersistedAgentTerminalRunHandle | null>(null);
  const selectedCwdRef = useRef('');
  const selectedThreadIdRef = useRef<string | null>(null);

  const selectedRunStatus = selectedRunDocument?.run.status ?? null;
  const terminalTranscript = useMemo(
    () => buildTerminalTranscript(selectedRunDocument),
    [selectedRunDocument],
  );

  const refreshWorkbench = useCallback(
    async ({
      preferredCwd,
      preferredThreadId,
      showRefreshFeedback = false,
    }: {
      preferredCwd?: string;
      preferredThreadId?: string | null;
      showRefreshFeedback?: boolean;
    } = {}) => {
      const workspace = await getTrustedWorkspaceTarget();
      const directories = workspace
        ? (await listWorkspaceDirectory('')).filter(
            entry => entry.kind === 'directory',
          )
        : [];
      const nextSelectedCwd = resolvePreferredWorkspacePath(
        directories,
        preferredCwd ?? selectedCwdRef.current,
      );
      const rawThreadIndex = await readUserFile(agentThreadIndexPath);
      const nextThreads = rawThreadIndex
        ? parsePersistedAgentThreadIndex(rawThreadIndex)?.threads ?? []
        : [];
      const nextSelectedThreadId = resolveSelectedThreadId(
        nextThreads,
        preferredThreadId ?? selectedThreadIdRef.current,
      );
      const runDocument = await loadRunDocument(
        nextSelectedThreadId,
        nextThreads,
      );
      const workspaceStat = workspace
        ? await statWorkspacePath(nextSelectedCwd)
        : null;

      selectedCwdRef.current = nextSelectedCwd;
      selectedThreadIdRef.current = nextSelectedThreadId;
      setTrustedWorkspace(workspace);
      setWorkspaceDirectories(directories);
      setSelectedCwd(nextSelectedCwd);
      setSelectedWorkspaceStat(workspaceStat);
      setThreads(nextThreads);
      setSelectedThreadId(nextSelectedThreadId);
      setSelectedRunDocument(runDocument);

      if (showRefreshFeedback) {
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
      });
    }, 800);

    return () => {
      clearInterval(timer);
    };
  }, [activeRunInfo, refreshWorkbench]);

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

  const handleRunGitStatus = useCallback(async () => {
    if (!trustedWorkspace) {
      setStatusTone('danger');
      setStatusMessage(appI18n.agentWorkbench.feedback.missingWorkspace);
      return;
    }

    try {
      const handle = await openPersistedAgentTerminalRun({
        title: appI18n.agentWorkbench.run.gitStatusTitle,
        goal: `${appI18n.agentWorkbench.run.gitStatusGoal} ${selectedCwdRef.current || trustedWorkspace.displayName || trustedWorkspace.rootPath}`,
        command: 'git status',
        cwd: selectedCwdRef.current || undefined,
      });

      activeRunHandleRef.current = handle;
      setActiveRunInfo({
        threadId: handle.threadId,
        runId: handle.runId,
      });
      setStatusTone('support');
      setStatusMessage(appI18n.agentWorkbench.feedback.runStarted);
      logInteraction('agent-workbench.run.started', {
        threadId: handle.threadId,
        runId: handle.runId,
        cwd: selectedCwdRef.current,
      });

      await refreshWorkbench({
        preferredCwd: selectedCwdRef.current,
        preferredThreadId: handle.threadId,
      });

      void handle.whenSettled.catch(() => {}).finally(async () => {
        if (activeRunHandleRef.current?.runId === handle.runId) {
          activeRunHandleRef.current = null;
          setActiveRunInfo(null);
        }

        await refreshWorkbench({
          preferredCwd: selectedCwdRef.current,
          preferredThreadId: handle.threadId,
        });
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
      });
    }
  }, [refreshWorkbench, trustedWorkspace]);

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

  const workspaceChoices = useMemo(
    () => [
      {
        key: '',
        label: appI18n.agentWorkbench.workspace.rootLabel,
        detail:
          trustedWorkspace?.displayName ??
          appI18n.agentWorkbench.workspace.rootDetail,
      },
      ...workspaceDirectories.map(entry => ({
        key: entry.relativePath,
        label: entry.name,
        detail: entry.relativePath,
      })),
    ],
    [trustedWorkspace, workspaceDirectories],
  );

  if (loading) {
    return (
      <View style={screenStyles.loadingShell}>
        <ActivityIndicator size='small' color={palette.accent} />
      </View>
    );
  }

  return (
    <View style={screenStyles.screen}>
      <ScrollView style={screenStyles.scroll} contentContainerStyle={screenStyles.content}>
        <AppFrame
          eyebrow={appI18n.agentWorkbench.frame.eyebrow}
          title={appI18n.agentWorkbench.frame.title}
          description={appI18n.agentWorkbench.frame.description}>
          <Stack style={screenStyles.stack}>
            <Toolbar style={screenStyles.toolbar}>
              <SignalPill
                label={
                  trustedWorkspace
                    ? appI18n.agentWorkbench.workspace.ready
                    : appI18n.agentWorkbench.workspace.missing
                }
                tone={trustedWorkspace ? 'support' : 'warning'}
                size='sm'
              />
              <StatusBadge
                label={resolveRunStatusLabel(selectedRunStatus)}
                tone={resolveRunStatusTone(selectedRunStatus)}
                emphasis='soft'
                size='sm'
              />
              <ActionButton
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
                label={appI18n.agentWorkbench.actions.cancelRun}
                onPress={() => {
                  void handleCancelRun();
                }}
                disabled={activeRunInfo === null}
                tone='ghost'
              />
              <ActionButton
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
                title={appI18n.agentWorkbench.feedback.title}
                tone={
                  statusTone === 'support'
                    ? 'accent'
                    : statusTone === 'danger'
                      ? 'danger'
                      : 'neutral'
                }>
                <Text style={[screenStyles.infoText, {color: palette.ink}]}>
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
                        />
                        <DetailField
                          label={appI18n.agentWorkbench.labels.selectedCwd}
                          value={formatWorkspaceSelection(
                            selectedWorkspaceStat,
                            trustedWorkspace,
                          )}
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
                            label={choice.label}
                            detail={choice.detail}
                            active={selectedCwd === choice.key}
                            activeBadgeLabel={appI18n.agentWorkbench.workspace.currentBadge}
                            inactiveBadgeLabel={appI18n.agentWorkbench.workspace.availableBadge}
                            onPress={() => {
                              selectedCwdRef.current = choice.key;
                              setSelectedCwd(choice.key);
                              void refreshWorkbench({
                                preferredCwd: choice.key,
                                preferredThreadId: selectedThreadIdRef.current,
                              });
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
                            setSelectedThreadId(thread.threadId);
                            void refreshWorkbench({
                              preferredCwd: selectedCwdRef.current,
                              preferredThreadId: thread.threadId,
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
                    {appI18n.agentWorkbench.sections.runTitle}
                  </Text>
                  <Text style={screenStyles.sectionDescription}>
                    {appI18n.agentWorkbench.sections.runDescription}
                  </Text>

                  {selectedRunDocument ? (
                    <View style={screenStyles.detailGrid}>
                      <DetailField
                        label={appI18n.agentWorkbench.labels.threadId}
                        value={selectedRunDocument.run.threadId}
                      />
                      <DetailField
                        label={appI18n.agentWorkbench.labels.runId}
                        value={selectedRunDocument.run.runId}
                      />
                      <DetailField
                        label={appI18n.agentWorkbench.labels.sessionId}
                        value={selectedRunDocument.run.sessionId ?? appI18n.common.unknown}
                      />
                      <DetailField
                        label={appI18n.agentWorkbench.labels.goal}
                        value={selectedRunDocument.run.goal}
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
                          title={
                            entry.kind === 'terminal-event'
                              ? resolveTerminalEventLabel(entry.event)
                              : appI18n.agentWorkbench.events.error
                          }
                          defaultExpanded={entry.kind === 'error'}
                          trailing={
                            <SignalPill
                              label={formatIsoTimestamp(entry.createdAt)}
                              tone={
                                entry.kind === 'error'
                                  ? 'danger'
                                  : entry.kind === 'terminal-event' &&
                                      entry.event === 'stderr'
                                    ? 'warning'
                                    : 'neutral'
                              }
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
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.md,
    },
    choiceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.md,
    },
    choiceChip: {
      maxWidth: '100%',
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
