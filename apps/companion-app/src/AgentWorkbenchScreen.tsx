import React, {useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  useCurrentWindowId,
  useOpenSurface,
  useTitleBarPassthroughTargets,
  useTitleBarMetrics,
} from '@opapp/framework-windowing';
import {StatusBadge, Toolbar, useTheme} from '@opapp/ui-native-primitives';
import {type WorkbenchTimelineDisplayItem} from './agent-workbench-model';
import {useAgentWorkbenchState} from './agent-workbench-state';
import {createScreenStyles} from './agent-workbench-styles';
import {WorkbenchTaskDraftSection} from './agent-workbench-task-draft-section';
import {
  formatIsoTimestamp,
  resolveArtifactKindLabel,
  resolveMessageRoleLabel,
  resolveRunStatusLabel,
  resolveRunStatusTone,
  resolveToolCallStatusLabel,
  resolveToolResultStatusLabel,
} from './agent-workbench-resolvers';

function renderTimelineItem(
  item: WorkbenchTimelineDisplayItem,
  palette: ReturnType<typeof useTheme>['palette'],
  screenStyles: ReturnType<typeof createScreenStyles>,
) {
  if (item.kind === 'tool-invocation') {
    const command = item.call?.inputText || appI18n.agentWorkbench.values.noTextContent;
    const output = item.result?.outputText || appI18n.agentWorkbench.values.noToolResultYet;
    return (
      <View key={item.key} style={screenStyles.planCard}>
        <View style={screenStyles.runHeaderTop}>
          <Text style={screenStyles.runHeaderTitle} numberOfLines={2}>
            {item.toolName || appI18n.agentWorkbench.values.unknownTool}
          </Text>
          <View style={screenStyles.runHeaderActionCluster}>
            {item.call ? (
              <StatusBadge
                label={resolveToolCallStatusLabel(item.call.status)}
                tone='accent'
                emphasis='soft'
                size='sm'
              />
            ) : null}
            <StatusBadge
              label={
                item.result
                  ? resolveToolResultStatusLabel(item.result.status)
                  : appI18n.agentWorkbench.values.noToolResultYet
              }
              tone={
                item.result?.status === 'success'
                  ? 'support'
                  : item.result?.status === 'error'
                    ? 'danger'
                    : 'warning'
              }
              emphasis='soft'
              size='sm'
            />
          </View>
        </View>
        <View style={[screenStyles.terminalBox, {backgroundColor: palette.canvasShade}]}>
          <Text style={[screenStyles.terminalText, {color: palette.ink}]}>$ {command}</Text>
          <Text style={[screenStyles.terminalText, {color: palette.inkSoft}]}>{output}</Text>
        </View>
      </View>
    );
  }

  let title = '';
  let body = '';
  let tone = palette.ink;
  switch (item.entry.kind) {
    case 'message':
      title = resolveMessageRoleLabel(item.entry.role);
      body = item.entry.content || appI18n.agentWorkbench.values.noTextContent;
      break;
    case 'plan':
      title = appI18n.agentWorkbench.events.plan;
      body = item.entry.steps.map(step => `${step.status === 'completed' ? '✓' : '•'} ${step.title}`).join('\n');
      break;
    case 'artifact':
      title = `${resolveArtifactKindLabel(item.entry.artifactKind)} · ${item.entry.label}`;
      body = item.entry.path || '';
      break;
    case 'error':
      title = appI18n.agentWorkbench.status.failed;
      body = item.entry.message;
      tone = palette.errorRed;
      break;
    case 'terminal-event':
      if (!item.entry.text) return null;
      title = item.entry.event;
      body = item.entry.text;
      tone = palette.inkSoft;
      break;
    default:
      return null;
  }

  return (
    <View key={item.key} style={screenStyles.transcriptTerminal}>
      <Text style={screenStyles.sectionDescription}>{title}</Text>
      <Text style={[screenStyles.terminalText, {color: tone}]}>{body}</Text>
    </View>
  );
}

export function AgentWorkbenchScreen() {
  const {appearancePreset, palette} = useTheme();
  const screenStyles = useMemo(() => createScreenStyles(palette), [palette]);
  const titleBarMetrics = useTitleBarMetrics(appearancePreset);
  const currentWindowId = useCurrentWindowId();
  const returnMainButtonRef = useRef<View>(null);
  const [navigationLayoutVersion, setNavigationLayoutVersion] = useState(0);
  const state = useAgentWorkbenchState();
  const openSurface = useOpenSurface();
  const [returnMainBusy, setReturnMainBusy] = useState(false);
  const [navigationErrorMessage, setNavigationErrorMessage] = useState<string | null>(null);
  const latestTool = useMemo(
    () =>
      state.selectedTimelineItems.find(
        (
          item,
        ): item is Extract<WorkbenchTimelineDisplayItem, {kind: 'tool-invocation'}> =>
          item.kind === 'tool-invocation' && item.toolInvocationIndex === 0,
      ) ?? null,
    [state.selectedTimelineItems],
  );
  const inlineStatusMessage = navigationErrorMessage ?? state.statusMessage;
  const selectedRunDocument = state.selectedRunDocument;
  const selectedRunRequest = state.selectedRunRequest;
  const runHeadline =
    selectedRunDocument?.run.goal ||
    selectedRunRequest?.command ||
    state.draftGoal ||
    appI18n.agentWorkbench.empty.timelineIdleTitle;
  const selectedCwdLabel =
    state.selectedCwd || state.trustedWorkspace?.displayName || appI18n.agentWorkbench.workspace.rootLabel;

  const titleBarPassthroughTargets = useMemo(
    () => [returnMainButtonRef],
    [],
  );

  useTitleBarPassthroughTargets({
    windowId: currentWindowId,
    enabled: Boolean(titleBarMetrics?.extendsContentIntoTitleBar),
    targets: titleBarPassthroughTargets,
    refreshKey: `${appearancePreset}:${titleBarMetrics?.height ?? 0}:${navigationLayoutVersion}`,
  });

  async function handleReturnMain() {
    if (returnMainBusy) return;
    setReturnMainBusy(true);
    setNavigationErrorMessage(null);
    try {
      await openSurface({
        surfaceId: 'companion.main',
        presentation: 'current-window',
        initialProps: {skipStartupAutoOpen: true},
      });
    } catch (error) {
      setNavigationErrorMessage(
        error instanceof Error
          ? error.message
          : appI18n.agentWorkbench.feedback.returnMainFailed,
      );
    } finally {
      setReturnMainBusy(false);
    }
  }

  if (state.loading) {
    return (
      <View style={screenStyles.loadingShell}>
        <ActivityIndicator size='small' color={palette.accent} />
      </View>
    );
  }

  return (
    <View testID='agent-workbench.screen' style={screenStyles.screen}>
      <Toolbar
        testID='agent-workbench.toolbar'
        style={screenStyles.toolbar}>
        <Pressable
          ref={returnMainButtonRef}
          testID='agent-workbench.action.return-main'
          accessibilityRole='button'
          onPress={() => void handleReturnMain()}
          disabled={returnMainBusy}
          onLayout={() => {
            setNavigationLayoutVersion(version => version + 1);
          }}
          style={screenStyles.toolbarBackButton}>
          <Text style={screenStyles.toolbarBackLabel}>
            ← {returnMainBusy ? appI18n.agentWorkbench.actions.returnMainBusy : appI18n.agentWorkbench.actions.returnMain}
          </Text>
        </Pressable>
      </Toolbar>

      <View style={screenStyles.hiddenAutomationText}>
        {[
          ['agent-workbench.status.message', inlineStatusMessage ?? ''],
          ['agent-workbench.run.run-id', selectedRunDocument?.run.runId ?? ''],
          ['agent-workbench.run.command', selectedRunRequest?.command ?? ''],
          ['agent-workbench.run.cwd', selectedRunRequest?.cwd ?? ''],
          ['agent-workbench.run.resumed-from', selectedRunDocument?.run.resumedFromRunId ?? ''],
          ['agent-workbench.terminal.transcript', state.terminalTranscript],
          ['agent-workbench.timeline.tool.0.name', latestTool?.toolName ?? ''],
          ['agent-workbench.timeline.tool.0.call-status', latestTool?.call ? resolveToolCallStatusLabel(latestTool.call.status) : ''],
          ['agent-workbench.timeline.tool.0.result-status', latestTool?.result ? resolveToolResultStatusLabel(latestTool.result.status) : ''],
          ['agent-workbench.timeline.tool.0.input', latestTool?.call?.inputText ?? ''],
          ['agent-workbench.timeline.tool.0.output', latestTool?.result?.outputText ?? ''],
        ].map(([testID, value]) => (
          <Text key={testID} testID={testID}>
            {value}
          </Text>
        ))}
      </View>

      <ScrollView contentContainerStyle={screenStyles.mainPaneInner}>
        <View style={screenStyles.sectionCardPrimary}>
          <View style={screenStyles.runHeaderTop}>
            <View style={screenStyles.runHeaderIntro}>
              <StatusBadge
                label={resolveRunStatusLabel(selectedRunDocument?.run.status ?? null)}
                tone={resolveRunStatusTone(selectedRunDocument?.run.status ?? null)}
                emphasis='soft'
                size='sm'
              />
              <Text testID='agent-workbench.run.goal' style={screenStyles.runHeaderTitle}>
                {runHeadline}
              </Text>
              <Text testID='agent-workbench.detail.selected-cwd' style={screenStyles.runHeaderSummaryText}>
                {`${appI18n.agentWorkbench.labels.cwd} ${selectedCwdLabel}`}
              </Text>
              <Text style={screenStyles.runHeaderSummaryText}>
                {selectedRunDocument
                  ? `${appI18n.agentWorkbench.labels.updatedAt} ${formatIsoTimestamp(selectedRunDocument.run.updatedAt)}`
                  : appI18n.agentWorkbench.empty.timelineIdleDescription}
              </Text>
            </View>
          </View>
          {inlineStatusMessage ? (
            <Text style={[screenStyles.sectionDescription, {color: navigationErrorMessage ? palette.errorRed : palette.inkSoft}]}>
              {inlineStatusMessage}
            </Text>
          ) : null}
        </View>

        {!selectedRunDocument ? (
          <View style={screenStyles.conversationEmptyCard}>
            <Text style={screenStyles.conversationEmptyTitle}>
              {appI18n.agentWorkbench.empty.timelineIdleTitle}
            </Text>
            <Text style={screenStyles.conversationEmptyHint}>
              {appI18n.agentWorkbench.empty.timelineIdleDescription}
            </Text>
          </View>
        ) : (
          <View style={screenStyles.sectionCard}>
            {state.selectedTimelineItems.map(item => renderTimelineItem(item, palette, screenStyles))}
          </View>
        )}

      </ScrollView>

      <WorkbenchTaskDraftSection
        trustedWorkspace={state.trustedWorkspace}
        selectedCwd={state.selectedCwd}
        selectedPendingApproval={state.selectedPendingApproval}
        selectedRunRequest={selectedRunRequest}
        textInputsReady={state.textInputsReady}
        draftGoal={state.draftGoal}
        draftCommand={state.draftCommand}
        draftRequiresApproval={state.draftRequiresApproval}
        draftTask={state.draftTask}
        taskDraftBusy={state.taskDraftBusy}
        activeRunInfo={state.activeRunInfo}
        pendingApprovalActive={state.selectedPendingApproval !== null}
        approvalBusy={state.approvalBusy}
        workspaceRootDraft={state.workspaceRootDraft}
        workspaceRecoveryTarget={state.workspaceRecoveryTarget}
        workspaceConfigBusy={state.workspaceConfigBusy}
        onDraftGoalChange={state.handleDraftGoalChange}
        onDraftCommandChange={state.handleDraftCommandChange}
        onSelectDirectMode={state.handleSelectDirectDraftMode}
        onSelectApprovalMode={state.handleSelectApprovalDraftMode}
        onPopulateWriteApprovalDraft={state.handlePopulateWriteApprovalDraft}
        onRunGitStatus={() => void state.handleRunGitStatus()}
        onStartDraftTask={() => void state.handleStartDraftTask()}
        onSubmitApprovalDecision={decision => void state.handleResolveSelectedApproval(decision)}
        onCancelRun={() => void state.handleCancelRun()}
        onWorkspaceRootDraftChange={state.handleWorkspaceRootDraftChange}
        onTrustWorkspaceRoot={() => void state.handleTrustWorkspaceRoot()}
        onClearTrustedWorkspaceRoot={() => void state.handleClearTrustedWorkspaceRoot()}
        onTrustRecoveredWorkspace={() => void state.handleTrustRecoveredWorkspace()}
        allowWorkspaceManagement={false}
        screenStyles={screenStyles}
      />
    </View>
  );
}
