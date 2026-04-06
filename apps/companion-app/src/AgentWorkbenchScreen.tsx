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
  StatusBadge,
  Toolbar,
  useTheme,
  appLayout,
  iconCatalog,
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

  // Detail pane is contextual — only show when user has actively opened a file,
  // is browsing a specific directory entry, or has search results to review.
  // The default state is hidden to maximize conversation space (Copilot/Codex pattern).
  const hasDetailContent =
    state.selectedInspectorEntry !== null ||
    state.searchResults.length > 0;

  if (state.loading) {
    return (
      <View style={screenStyles.loadingShell}>
        <ActivityIndicator size='small' color={palette.accent} />
      </View>
    );
  }

  return (
    <View testID='agent-workbench.screen' style={screenStyles.screen}>
      {/* ── Toolbar — minimal status bar ── */}
      <Toolbar
        testID='agent-workbench.toolbar'
        style={screenStyles.toolbar}>
        {/* Status group — left aligned, minimal */}
        <View style={screenStyles.toolbarGroup}>
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
        </View>

        <View style={{flex: 1}} />

        {/* Contextual actions — only show when relevant */}
        <View style={screenStyles.toolbarGroup}>
          {state.activeRunInfo ? (
            <ActionButton
              testID='agent-workbench.action.cancel-run'
              label={appI18n.agentWorkbench.actions.cancelRun}
              onPress={() => {
                void state.handleCancelRun();
              }}
              icon={iconCatalog.stop}
              tone='ghost'
            />
          ) : null}
          <View style={screenStyles.toolbarDivider} />
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
            icon={iconCatalog.refresh}
            tone='ghost'
          />
        </View>
      </Toolbar>

      {/* ── Feedback bar ── */}
      {state.statusMessage ? (
        <View style={screenStyles.feedbackBar}>
          <Text
            testID='agent-workbench.status.message'
            style={[screenStyles.infoText, {color: state.statusTone === 'danger' ? palette.errorRed : palette.inkMuted}]}>
            {state.statusMessage}
          </Text>
        </View>
      ) : null}

      {/* ── Historical run banner ── */}
      {state.viewingHistoricalRun && state.latestThreadRunDocument ? (
        <View style={screenStyles.historicalBanner}>
          <Text style={[screenStyles.infoText, {color: palette.inkMuted, flex: 1}]} numberOfLines={1}>
            {appI18n.agentWorkbench.runHistory.viewingHistoricalDescription(
              state.latestThreadRunDocument.run.runId,
            )}
          </Text>
          <ActionButton
            testID='agent-workbench.action.focus-latest-run'
            label={appI18n.agentWorkbench.actions.focusLatestRun}
            onPress={state.handleFocusLatestRun}
            tone='ghost'
          />
        </View>
      ) : null}

      {/* ── Layout: sidebar (threads-first) | conversation | contextual detail ── */}
      <View
        style={[
          screenStyles.contentShell,
          isCompactLayout ? screenStyles.contentShellCompact : null,
        ]}>

        {/* ── LEFT: Threads-first sidebar ── */}
        <View
          style={[
            screenStyles.sidebar,
            isCompactLayout ? screenStyles.sidebarCompact : null,
          ]}>
          <ScrollView contentContainerStyle={screenStyles.sidebarInner}>
            {/* Threads come first — primary navigation */}
            <WorkbenchThreadsSection
              threads={state.threads}
              selectedThreadId={state.selectedThreadId}
              onSelectThread={state.handleSelectThread}
              screenStyles={screenStyles}
            />

            <View style={screenStyles.sectionDivider} />

            {/* Run history — second priority */}
            <WorkbenchRunHistorySection
              threadRunDocuments={state.threadRunDocuments}
              selectedRunId={state.selectedRunId}
              latestThreadRunDocument={state.latestThreadRunDocument}
              onSelectRun={state.handleSelectRun}
              screenStyles={screenStyles}
            />

            <View style={screenStyles.sectionDivider} />

            {/* Workspace selector — collapsed, tertiary priority */}
            <WorkbenchWorkspaceSection
              trustedWorkspace={state.trustedWorkspace}
              textInputsReady={state.textInputsReady}
              selectedCwd={state.selectedCwd}
              selectedWorkspaceStat={state.selectedWorkspaceStat}
              workspaceChoices={state.workspaceChoices}
              workspaceRootDraft={state.workspaceRootDraft}
              workspaceRecoveryTarget={state.workspaceRecoveryTarget}
              workspaceConfigBusy={state.workspaceConfigBusy}
              onBrowseDirectory={relativePath => {
                void state.handleBrowseDirectory(relativePath);
              }}
              onWorkspaceRootDraftChange={state.handleWorkspaceRootDraftChange}
              onTrustWorkspaceRoot={() => {
                void state.handleTrustWorkspaceRoot();
              }}
              onClearTrustedWorkspaceRoot={() => {
                void state.handleClearTrustedWorkspaceRoot();
              }}
              onTrustRecoveredWorkspace={() => {
                void state.handleTrustRecoveredWorkspace();
              }}
              screenStyles={screenStyles}
            />
          </ScrollView>
        </View>

        {/* ── CENTRE: Unified conversation transcript ── */}
        <View
          style={[
            screenStyles.mainPane,
            isCompactLayout ? screenStyles.mainPaneCompact : null,
          ]}>
          <ScrollView contentContainerStyle={screenStyles.mainPaneInner}>
            {/* Run header + inline actions */}
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
              previousThreadRunDocument={state.previousThreadRunDocument}
              selectedCwd={state.selectedCwd}
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
              onViewPreviousRun={state.handleViewPreviousRun}
              onBrowseWorkspaceRoot={() => {
                void state.handleBrowseDirectory('');
              }}
              screenStyles={screenStyles}
            />

            {/* Timeline items inline in the conversation flow */}
            <WorkbenchTimelineSection
              selectedRunDocument={state.selectedRunDocument}
              selectedTimelineItems={state.selectedTimelineItems}
              selectedTimelineSummary={state.selectedTimelineSummary}
              screenStyles={screenStyles}
            />

            {/* Terminal transcript inline at the end */}
            <WorkbenchTerminalSection
              terminalTranscript={state.terminalTranscript}
              screenStyles={screenStyles}
            />
          </ScrollView>

          {/* ── Composer bar pinned to bottom ── */}
          <WorkbenchTaskDraftSection
            trustedWorkspace={state.trustedWorkspace}
            selectedCwd={state.selectedCwd}
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
            onRunGitStatus={() => {
              void state.handleRunGitStatus();
            }}
            onStartDraftTask={() => {
              void state.handleStartDraftTask();
            }}
            screenStyles={screenStyles}
          />
        </View>

        {/* ── RIGHT: Truly contextual detail (only when a specific item selected) ── */}
        {(hasDetailContent || isCompactLayout) ? (
          <View
            style={[
              screenStyles.detailPane,
              isCompactLayout ? screenStyles.detailPaneCompact : null,
            ]}>
            <ScrollView contentContainerStyle={screenStyles.detailPaneInner}>
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
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}
