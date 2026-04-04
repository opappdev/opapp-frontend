import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  AppFrame,
  InfoPanel,
  SignalPill,
  Stack,
  StatusBadge,
  Toolbar,
  useTheme,
  appLayout,
} from '@opapp/ui-native-primitives';
import {
  resolveRunStatusLabel,
  resolveRunStatusTone,
} from './agent-workbench-resolvers';
import {createScreenStyles} from './agent-workbench-styles';
import {useAgentWorkbenchState} from './agent-workbench-state';
import {WorkbenchWorkspaceSection} from './agent-workbench-workspace-section';
import {WorkbenchTaskDraftSection} from './agent-workbench-task-draft-section';
import {WorkbenchDirectorySection} from './agent-workbench-directory-section';
import {WorkbenchSearchSection} from './agent-workbench-search-section';
import {WorkbenchThreadsSection} from './agent-workbench-threads-section';
import {WorkbenchInspectorSection} from './agent-workbench-inspector-section';
import {WorkbenchRunHistorySection} from './agent-workbench-run-history-section';
import {WorkbenchRunDetailSection} from './agent-workbench-run-detail-section';
import {WorkbenchTimelineSection} from './agent-workbench-timeline-section';
import {WorkbenchTerminalSection} from './agent-workbench-terminal-section';

export function AgentWorkbenchScreen() {
  const {width} = useWindowDimensions();
  const {palette} = useTheme();
  const screenStyles = useMemo(() => createScreenStyles(palette), [palette]);
  const isCompactLayout = width < appLayout.breakpoints.compact;
  const state = useAgentWorkbenchState();

  if (state.loading) {
    return (
      <View style={screenStyles.loadingShell}>
        <ActivityIndicator size='small' color={palette.accent} />
      </View>
    );
  }

  return (
    <View testID='agent-workbench.screen' style={screenStyles.screen}>
      <ScrollView
        style={screenStyles.scroll}
        contentContainerStyle={screenStyles.content}>
        <AppFrame
          eyebrow={appI18n.agentWorkbench.frame.eyebrow}
          title={appI18n.agentWorkbench.frame.title}
          description={appI18n.agentWorkbench.frame.description}>
          <Stack style={screenStyles.stack}>
            {/* ── Compact toolbar: status + primary controls ── */}
            <Toolbar
              testID='agent-workbench.toolbar'
              style={screenStyles.toolbar}>
              <SignalPill
                testID='agent-workbench.status.workspace'
                label={
                  state.trustedWorkspace
                    ? appI18n.agentWorkbench.workspace.ready
                    : appI18n.agentWorkbench.workspace.missing
                }
                tone={state.trustedWorkspace ? 'support' : 'warning'}
                size='sm'
              />
              <StatusBadge
                testID='agent-workbench.status.run'
                label={resolveRunStatusLabel(state.selectedRunStatus)}
                tone={resolveRunStatusTone(state.selectedRunStatus)}
                emphasis='soft'
                size='sm'
              />
              {state.activeRunInfo ? (
                <View style={screenStyles.toolbarBusy}>
                  <ActivityIndicator size='small' color={palette.accent} />
                </View>
              ) : null}
              <ActionButton
                testID='agent-workbench.action.run-git-status'
                label={
                  state.activeRunInfo
                    ? appI18n.agentWorkbench.actions.runningGitStatus
                    : appI18n.agentWorkbench.actions.runGitStatus
                }
                onPress={() => {
                  void state.handleRunGitStatus();
                }}
                disabled={!state.trustedWorkspace || state.activeRunInfo !== null}
              />
              <ActionButton
                testID='agent-workbench.action.request-write-approval'
                label={
                  state.approvalBusy === 'requesting'
                    ? appI18n.agentWorkbench.actions.requestingWriteApproval
                    : appI18n.agentWorkbench.actions.requestWriteApproval
                }
                onPress={() => {
                  void state.handleRequestWriteApproval();
                }}
                disabled={
                  !state.trustedWorkspace ||
                  state.activeRunInfo !== null ||
                  state.approvalBusy !== null
                }
              />
              <ActionButton
                testID='agent-workbench.action.cancel-run'
                label={appI18n.agentWorkbench.actions.cancelRun}
                onPress={() => {
                  void state.handleCancelRun();
                }}
                disabled={state.activeRunInfo === null}
                tone='ghost'
              />
              {state.selectedCwd ? (
                <ActionButton
                  testID='agent-workbench.action.browse-workspace-root'
                  label={appI18n.agentWorkbench.actions.browseWorkspaceRoot}
                  onPress={() => {
                    void state.handleBrowseDirectory('');
                  }}
                  tone='ghost'
                />
              ) : null}
              {state.previousThreadRunDocument && !state.viewingHistoricalRun ? (
                <ActionButton
                  testID='agent-workbench.action.view-previous-run'
                  label={appI18n.agentWorkbench.actions.viewPreviousRun}
                  onPress={state.handleViewPreviousRun}
                  tone='ghost'
                />
              ) : null}
              <ActionButton
                testID='agent-workbench.action.refresh'
                label={
                  state.refreshing
                    ? appI18n.agentWorkbench.actions.refreshing
                    : appI18n.agentWorkbench.actions.refresh
                }
                onPress={() => {
                  void state.handleRefresh();
                }}
                disabled={state.refreshing}
                tone='ghost'
              />
            </Toolbar>

            {/* ── Feedback panel ── */}
            {state.statusMessage ? (
              <InfoPanel
                testID='agent-workbench.status.panel'
                title={appI18n.agentWorkbench.feedback.title}
                tone={
                  state.statusTone === 'support'
                    ? 'accent'
                    : state.statusTone === 'danger'
                      ? 'danger'
                      : 'neutral'
                }>
                <Text
                  testID='agent-workbench.status.message'
                  style={[screenStyles.infoText, {color: palette.ink}]}>
                  {state.statusMessage}
                </Text>
              </InfoPanel>
            ) : null}

            {/* ── 3-zone layout: sidebar | main | context ── */}
            <View
              style={[
                screenStyles.contentShell,
                isCompactLayout ? screenStyles.contentShellCompact : null,
              ]}>

              {/* ── LEFT: Sidebar (threads, workspace) ── */}
              <View
                style={[
                  screenStyles.sidebar,
                  isCompactLayout ? screenStyles.sidebarCompact : null,
                ]}>
                <WorkbenchWorkspaceSection
                  trustedWorkspace={state.trustedWorkspace}
                  selectedCwd={state.selectedCwd}
                  selectedWorkspaceStat={state.selectedWorkspaceStat}
                  workspaceChoices={state.workspaceChoices}
                  onBrowseDirectory={relativePath => {
                    void state.handleBrowseDirectory(relativePath);
                  }}
                  screenStyles={screenStyles}
                />

                <WorkbenchThreadsSection
                  threads={state.threads}
                  selectedThreadId={state.selectedThreadId}
                  onSelectThread={state.handleSelectThread}
                  screenStyles={screenStyles}
                />

                <WorkbenchRunHistorySection
                  threadRunDocuments={state.threadRunDocuments}
                  selectedRunId={state.selectedRunId}
                  latestThreadRunDocument={state.latestThreadRunDocument}
                  onSelectRun={state.handleSelectRun}
                  screenStyles={screenStyles}
                />
              </View>

              {/* ── CENTRE: Main (task draft + timeline + terminal) ── */}
              <View
                style={[
                  screenStyles.mainPane,
                  isCompactLayout ? screenStyles.mainPaneCompact : null,
                ]}>
                <WorkbenchTaskDraftSection
                  trustedWorkspace={state.trustedWorkspace}
                  textInputsReady={state.textInputsReady}
                  draftGoal={state.draftGoal}
                  draftCommand={state.draftCommand}
                  draftRequiresApproval={state.draftRequiresApproval}
                  draftTask={state.draftTask}
                  taskDraftBusy={state.taskDraftBusy}
                  activeRunInfo={state.activeRunInfo}
                  approvalBusy={state.approvalBusy}
                  onDraftGoalChange={state.handleDraftGoalChange}
                  onDraftCommandChange={state.handleDraftCommandChange}
                  onSelectDirectMode={state.handleSelectDirectDraftMode}
                  onSelectApprovalMode={state.handleSelectApprovalDraftMode}
                  onPopulateWriteApprovalDraft={
                    state.handlePopulateWriteApprovalDraft
                  }
                  onStartDraftTask={() => {
                    void state.handleStartDraftTask();
                  }}
                  screenStyles={screenStyles}
                />

                <WorkbenchRunDetailSection
                  selectedRunDocument={state.selectedRunDocument}
                  selectedRunRequest={state.selectedRunRequest}
                  selectedPendingApproval={state.selectedPendingApproval}
                  selectedRunArtifactKind={state.selectedRunArtifactKind}
                  selectedRunArtifactLabel={state.selectedRunArtifactLabel}
                  selectedRunArtifactPath={state.selectedRunArtifactPath}
                  selectedRunArtifactHasStandaloneLabel={
                    state.selectedRunArtifactHasStandaloneLabel
                  }
                  canRetrySelectedRun={state.canRetrySelectedRun}
                  canRestoreSelectedRunWorkspace={
                    state.canRestoreSelectedRunWorkspace
                  }
                  canInspectSelectedRunArtifact={
                    state.canInspectSelectedRunArtifact
                  }
                  retryBusy={state.retryBusy}
                  approvalBusy={state.approvalBusy}
                  viewingHistoricalRun={state.viewingHistoricalRun}
                  latestThreadRunDocument={state.latestThreadRunDocument}
                  onRetry={() => {
                    void state.handleRetrySelectedRun();
                  }}
                  onRestore={() => {
                    void state.handleRestoreSelectedRunWorkspace();
                  }}
                  onInspectArtifact={() => {
                    void state.handleInspectSelectedRunArtifact();
                  }}
                  onApprove={() => {
                    void state.handleApproveSelectedRun();
                  }}
                  onReject={() => {
                    void state.handleRejectSelectedRun();
                  }}
                  onFocusLatestRun={state.handleFocusLatestRun}
                  screenStyles={screenStyles}
                />

                <WorkbenchTimelineSection
                  selectedRunDocument={state.selectedRunDocument}
                  selectedTimelineItems={state.selectedTimelineItems}
                  selectedTimelineSummary={state.selectedTimelineSummary}
                  screenStyles={screenStyles}
                />

                <WorkbenchTerminalSection
                  terminalTranscript={state.terminalTranscript}
                  screenStyles={screenStyles}
                />
              </View>

              {/* ── RIGHT: Context (inspector, directory, search) ── */}
              <View
                style={[
                  screenStyles.detailPane,
                  isCompactLayout ? screenStyles.detailPaneCompact : null,
                ]}>
                <WorkbenchInspectorSection
                  selectedInspectorEntry={state.selectedInspectorEntry}
                  selectedInspectorChildren={state.selectedInspectorChildren}
                  selectedInspectorContent={state.selectedInspectorContent}
                  inspectorLoading={state.inspectorLoading}
                  selectedCwd={state.selectedCwd}
                  selectedDiffPath={state.selectedDiffPath}
                  selectedDiffOutput={state.selectedDiffOutput}
                  selectedDiffError={state.selectedDiffError}
                  diffLoading={state.diffLoading}
                  selectedGitDiffCommand={state.selectedGitDiffCommand}
                  onInspectEntry={entry => {
                    void state.handleInspectWorkspaceEntry(entry);
                  }}
                  onBrowseDirectory={relativePath => {
                    void state.handleBrowseDirectory(relativePath);
                  }}
                  onLoadDiff={() => {
                    void state.handleLoadSelectedDiff();
                  }}
                  screenStyles={screenStyles}
                />

                <WorkbenchDirectorySection
                  trustedWorkspace={state.trustedWorkspace}
                  workspaceEntries={state.workspaceEntries}
                  selectedInspectorEntry={state.selectedInspectorEntry}
                  onInspectEntry={entry => {
                    void state.handleInspectWorkspaceEntry(entry);
                  }}
                  screenStyles={screenStyles}
                />

                <WorkbenchSearchSection
                  trustedWorkspace={state.trustedWorkspace}
                  textInputsReady={state.textInputsReady}
                  searchQuery={state.searchQuery}
                  searching={state.searching}
                  searchResults={state.searchResults}
                  selectedInspectorEntry={state.selectedInspectorEntry}
                  onSearchQueryChange={state.handleSearchQueryChange}
                  onSearch={() => {
                    void state.handleSearch();
                  }}
                  onInspectEntry={entry => {
                    void state.handleInspectWorkspaceEntry(entry);
                  }}
                  screenStyles={screenStyles}
                />
              </View>
            </View>
          </Stack>
        </AppFrame>
      </ScrollView>
    </View>
  );
}
