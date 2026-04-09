import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, Text, TextInput as RNTextInput, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {useOpenSurface} from '@opapp/framework-windowing';
import {ActionButton, StatusBadge, Toolbar, useTheme} from '@opapp/ui-native-primitives';
import {WorkbenchApprovalDockSection} from './agent-workbench-approval-dock-section';
import {type WorkbenchTimelineDisplayItem} from './agent-workbench-model';
import {useAgentWorkbenchState} from './agent-workbench-state';
import {createScreenStyles} from './agent-workbench-styles';
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
  const {palette} = useTheme();
  const screenStyles = useMemo(() => createScreenStyles(palette), [palette]);
  const state = useAgentWorkbenchState();
  const openSurface = useOpenSurface();
  const [returnMainBusy, setReturnMainBusy] = useState(false);
  const [showCommandInput, setShowCommandInput] = useState(false);
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
  const canStart =
    state.textInputsReady &&
    state.trustedWorkspace !== null &&
    state.activeRunInfo === null &&
    state.approvalBusy === null &&
    state.taskDraftBusy === null &&
    state.draftTask !== null &&
    (state.draftRequiresApproval || state.draftTask.canRunDirect);

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
      <Toolbar testID='agent-workbench.toolbar' style={screenStyles.toolbar}>
        <Pressable
          testID='agent-workbench.action.return-main'
          accessibilityRole='button'
          onPress={() => void handleReturnMain()}
          disabled={returnMainBusy}
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

      <View style={screenStyles.composerBar}>
        {state.selectedPendingApproval ? (
          <WorkbenchApprovalDockSection
            selectedPendingApproval={state.selectedPendingApproval}
            selectedRunRequest={selectedRunRequest}
            selectedCwd={state.selectedCwd}
            approvalBusy={state.approvalBusy}
            onSubmitDecision={decision => void state.handleResolveSelectedApproval(decision)}
            cardStyle={screenStyles.approvalFloatingCard}
            screenStyles={screenStyles}
          />
        ) : !state.textInputsReady ? (
          <View style={screenStyles.loadingInline}>
            <ActivityIndicator size='small' color={palette.accent} />
          </View>
        ) : (
          <View style={[screenStyles.composerShell, {borderColor: palette.border, backgroundColor: palette.panel}]}>
            <View style={screenStyles.composerAssistRow}>
              <View style={screenStyles.composerAssistCluster}>
                <ActionButton testID='agent-workbench.action.run-git-status' label={appI18n.agentWorkbench.actions.runGitStatus} onPress={() => void state.handleRunGitStatus()} tone='ghost' />
                <ActionButton testID='agent-workbench.action.populate-write-approval-draft' label={appI18n.agentWorkbench.actions.populateWriteApprovalDraft} onPress={state.handlePopulateWriteApprovalDraft} tone='ghost' />
                <ActionButton testID='agent-workbench.action.toggle-command-input' label={showCommandInput ? appI18n.agentWorkbench.taskDraft.collapseAdvancedCommand : appI18n.agentWorkbench.taskDraft.expandAdvancedCommand} onPress={() => setShowCommandInput(value => !value)} tone='ghost' />
              </View>
              <View style={screenStyles.composerModeCluster}>
                <ActionButton label={appI18n.agentWorkbench.taskDraft.directRuntimeLabel} onPress={state.handleSelectDirectDraftMode} tone={state.draftRequiresApproval ? 'ghost' : 'accent'} />
                <ActionButton label={appI18n.agentWorkbench.taskDraft.approvalRuntimeLabel} onPress={state.handleSelectApprovalDraftMode} tone={state.draftRequiresApproval ? 'accent' : 'ghost'} />
              </View>
            </View>
            <RNTextInput testID='agent-workbench.task.goal-input' value={state.draftGoal} onChangeText={state.handleDraftGoalChange} placeholder={appI18n.agentWorkbench.taskDraft.goalPlaceholder} placeholderTextColor={palette.inkSoft} style={[screenStyles.textInputField, {color: palette.ink}]} />
            {showCommandInput ? (
              <RNTextInput testID='agent-workbench.task.command-input' value={state.draftCommand} onChangeText={state.handleDraftCommandChange} placeholder={appI18n.agentWorkbench.taskDraft.commandPlaceholder} placeholderTextColor={palette.inkSoft} multiline textAlignVertical='top' style={[screenStyles.textInputField, screenStyles.textInputMultiline, {color: palette.ink}]} />
            ) : null}
            <View style={screenStyles.composerShellFooter}>
              <Text style={[screenStyles.composerRuntimeMeta, {color: palette.inkSoft}]}>
                {state.trustedWorkspace?.rootPath || appI18n.agentWorkbench.empty.workspaceDescription}
              </Text>
              <ActionButton
                testID='agent-workbench.action.start-draft-task'
                label={
                  state.activeRunInfo
                    ? appI18n.agentWorkbench.actions.cancelRun
                    : state.taskDraftBusy
                      ? appI18n.agentWorkbench.actions.runningDraftTask
                      : appI18n.agentWorkbench.actions.runDraftTask
                }
                onPress={() => void (state.activeRunInfo ? state.handleCancelRun() : state.handleStartDraftTask())}
                disabled={!state.activeRunInfo && !canStart}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
