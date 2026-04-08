import React from 'react';
import {Pressable, Text, View} from 'react-native';
import type {
  AgentApprovalTimelineEntry,
  AgentArtifactKind,
  AgentRunDocument,
} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  Expander,
  Icon,
  StatusBadge,
  iconCatalog,
  useTheme,
} from '@opapp/ui-native-primitives';
import {
  formatIsoTimestamp,
  resolveArtifactKindLabel,
  resolvePermissionModeLabel,
  resolveRunStatusLabel,
  resolveRunStatusTone,
} from './agent-workbench-resolvers';
import type {createScreenStyles} from './agent-workbench-styles';

type WorkbenchRunDetailSectionProps = {
  selectedRunDocument: AgentRunDocument | null;
  selectedRunRequest: AgentRunDocument['run']['request'] | null;
  selectedPendingApproval: AgentApprovalTimelineEntry | null;
  selectedRunArtifactKind: AgentArtifactKind | null;
  selectedRunArtifactLabel: string | null;
  selectedRunArtifactPath: string | null;
  selectedRunArtifactHasStandaloneLabel: boolean;
  canRetrySelectedRun: boolean;
  canRestoreSelectedRunWorkspace: boolean;
  canInspectSelectedRunArtifact: boolean;
  retryBusy: boolean;
  approvalBusy: 'requesting' | 'approving' | 'rejecting' | null;
  viewingHistoricalRun: boolean;
  latestThreadRunDocument: AgentRunDocument | null;
  previousThreadRunDocument: AgentRunDocument | null;
  selectedCwd: string;
  onRetry: () => void;
  onRestore: () => void;
  onInspectArtifact: () => void;
  onApprove: () => void;
  onReject: () => void;
  onViewPreviousRun: () => void;
  onFocusLatestRun: () => void;
  onBrowseWorkspaceRoot: () => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchRunDetailSection({
  selectedRunDocument,
  selectedRunRequest,
  selectedPendingApproval,
  selectedRunArtifactKind,
  selectedRunArtifactLabel,
  selectedRunArtifactPath,
  selectedRunArtifactHasStandaloneLabel,
  canRetrySelectedRun,
  canRestoreSelectedRunWorkspace,
  canInspectSelectedRunArtifact,
  retryBusy,
  approvalBusy,
  viewingHistoricalRun,
  latestThreadRunDocument,
  previousThreadRunDocument,
  selectedCwd,
  onRetry,
  onRestore,
  onInspectArtifact,
  onApprove,
  onReject,
  onViewPreviousRun,
  onFocusLatestRun,
  onBrowseWorkspaceRoot,
  screenStyles,
}: WorkbenchRunDetailSectionProps) {
  const {palette} = useTheme();
  const runHeadline =
    selectedRunDocument?.run.goal ||
    selectedRunRequest?.command ||
    selectedRunDocument?.run.runId ||
    appI18n.common.unknown;
  const workspacePath =
    selectedRunRequest?.cwd?.trim() || selectedCwd.trim() || null;
  const showHistoricalContext =
    viewingHistoricalRun && latestThreadRunDocument !== null;
  const showContextActions =
    (!viewingHistoricalRun && previousThreadRunDocument !== null) ||
    selectedCwd.length > 0;
  const showPrimaryActions =
    canInspectSelectedRunArtifact ||
    canRetrySelectedRun ||
    canRestoreSelectedRunWorkspace;
  const runSummaryParts = [
    `${appI18n.agentWorkbench.labels.updatedAt} ${formatIsoTimestamp(
      selectedRunDocument?.run.updatedAt ?? null,
    )}`,
    workspacePath
      ? `${appI18n.agentWorkbench.labels.cwd} ${workspacePath}`
      : null,
  ].filter((value): value is string => Boolean(value));

  if (!selectedRunDocument) {
    return null;
  }

  return (
    <View style={screenStyles.sectionCard}>
      <View style={screenStyles.runHeader}>
        <View style={screenStyles.runHeaderTop}>
          <View style={screenStyles.runHeaderIntro}>
            <View style={screenStyles.runHeaderEyebrowRow}>
              <StatusBadge
                label={resolveRunStatusLabel(selectedRunDocument.run.status)}
                tone={resolveRunStatusTone(selectedRunDocument.run.status)}
                emphasis='soft'
                size='sm'
              />
              {selectedPendingApproval ? (
                <Text
                  style={[
                    screenStyles.toolCardMetaItem,
                    {color: palette.accent},
                  ]}>
                  {appI18n.agentWorkbench.approval.pendingTitle}
                </Text>
              ) : null}
            </View>

            <Text
              testID='agent-workbench.run.goal'
              style={screenStyles.runHeaderTitle}
              numberOfLines={3}>
              {runHeadline}
            </Text>

            {showHistoricalContext ? (
              <View style={screenStyles.runHeaderContextRow}>
                <View style={screenStyles.runHeaderContextCopy}>
                  <Text style={screenStyles.runHeaderContextLabel}>
                    {appI18n.agentWorkbench.runHistory.viewingHistoricalTitle}
                  </Text>
                  <Text
                    style={screenStyles.runHeaderContextMeta}
                    numberOfLines={1}>
                    {appI18n.agentWorkbench.runHistory.latest(
                      formatIsoTimestamp(latestThreadRunDocument.run.updatedAt),
                    )}
                  </Text>
                </View>
                <Pressable
                  testID='agent-workbench.action.focus-latest-run'
                  accessibilityRole='button'
                  onPress={onFocusLatestRun}
                  style={({pressed}) => [
                    screenStyles.runHeaderContextLink,
                    pressed ? screenStyles.runHeaderContextLinkPressed : null,
                  ]}>
                  <Text style={screenStyles.runHeaderContextLinkLabel}>
                    {appI18n.agentWorkbench.actions.focusLatestRun}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={screenStyles.runHeaderSummaryRow}>
              <Text
                numberOfLines={2}
                style={screenStyles.runHeaderSummaryText}>
                {runSummaryParts.join('  ·  ')}
              </Text>
            </View>

            {showContextActions ? (
              <View style={screenStyles.runHeaderContextActions}>
                {!viewingHistoricalRun && previousThreadRunDocument ? (
                  <Pressable
                    testID='agent-workbench.action.view-previous-run'
                    accessibilityRole='button'
                    onPress={onViewPreviousRun}
                    style={({pressed}) => [
                      screenStyles.runHeaderContextLink,
                      pressed ? screenStyles.runHeaderContextLinkPressed : null,
                    ]}>
                    <Text style={screenStyles.runHeaderContextLinkLabel}>
                      {appI18n.agentWorkbench.actions.viewPreviousRun}
                    </Text>
                  </Pressable>
                ) : null}
                {selectedCwd ? (
                  <Pressable
                    testID='agent-workbench.action.browse-workspace-root'
                    accessibilityRole='button'
                    onPress={onBrowseWorkspaceRoot}
                    style={({pressed}) => [
                      screenStyles.runHeaderContextLink,
                      pressed ? screenStyles.runHeaderContextLinkPressed : null,
                    ]}>
                    <Text style={screenStyles.runHeaderContextLinkLabel}>
                      {appI18n.agentWorkbench.actions.browseWorkspaceRoot}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          {selectedRunRequest && showPrimaryActions ? (
            <View style={screenStyles.runHeaderActionCluster}>
              {canInspectSelectedRunArtifact ? (
                <ActionButton
                  testID='agent-workbench.action.inspect-run-artifact'
                  label={appI18n.agentWorkbench.actions.inspectRunArtifact}
                  onPress={onInspectArtifact}
                  disabled={!canInspectSelectedRunArtifact}
                  tone='ghost'
                />
              ) : null}
              {canRetrySelectedRun ? (
                <ActionButton
                  testID='agent-workbench.action.retry-selected-run'
                  label={
                    retryBusy
                      ? appI18n.agentWorkbench.actions.retryingRun
                      : appI18n.agentWorkbench.actions.retryRun
                  }
                  onPress={onRetry}
                  disabled={!canRetrySelectedRun}
                  tone='ghost'
                />
              ) : null}
              {canRestoreSelectedRunWorkspace ? (
                <ActionButton
                  testID='agent-workbench.action.restore-run-workspace'
                  label={appI18n.agentWorkbench.actions.restoreRunWorkspace}
                  onPress={onRestore}
                  disabled={!canRestoreSelectedRunWorkspace}
                  tone='ghost'
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {/* Hidden locators for smoke test accessibility */}
      <View style={{height: 0, overflow: 'hidden'}}>
        <Text testID='agent-workbench.run.run-id'>
          {selectedRunDocument.run.runId}
        </Text>
        <Text testID='agent-workbench.run.command'>
          {selectedRunRequest?.command ?? appI18n.common.unknown}
        </Text>
        <Text testID='agent-workbench.run.cwd'>
          {selectedRunRequest?.cwd ?? appI18n.agentWorkbench.workspace.rootLabel}
        </Text>
        <Text testID='agent-workbench.run.thread-id'>
          {selectedRunDocument.run.threadId}
        </Text>
        <Text testID='agent-workbench.run.session-id'>
          {selectedRunDocument.run.sessionId ?? appI18n.common.unknown}
        </Text>
        {selectedRunDocument.run.resumedFromRunId ? (
          <Text testID='agent-workbench.run.resumed-from'>
            {selectedRunDocument.run.resumedFromRunId}
          </Text>
        ) : null}
      </View>

      {/* Collapsed details — minimal chrome */}
      <Expander
        title={appI18n.agentWorkbench.labels.runDetailExpanderTitle ?? 'Details'}
        defaultExpanded={false}>
        <View style={screenStyles.expanderBody}>
          <View style={screenStyles.runDetailGrid}>
            <View style={screenStyles.runDetailField}>
              <Text style={screenStyles.runDetailFieldLabel}>
                {appI18n.agentWorkbench.labels.threadId}
              </Text>
              <Text
                style={screenStyles.runDetailFieldValue}
                numberOfLines={1}>
                {selectedRunDocument.run.threadId}
              </Text>
            </View>
            <View style={screenStyles.runDetailField}>
              <Text style={screenStyles.runDetailFieldLabel}>
                {appI18n.agentWorkbench.labels.sessionId}
              </Text>
              <Text
                style={screenStyles.runDetailFieldValue}
                numberOfLines={1}>
                {selectedRunDocument.run.sessionId ?? appI18n.common.unknown}
              </Text>
            </View>
            {selectedRunDocument.run.resumedFromRunId ? (
              <View style={screenStyles.runDetailField}>
                <Text style={screenStyles.runDetailFieldLabel}>
                  {appI18n.agentWorkbench.labels.resumedFromRunId}
                </Text>
                <Text
                  style={screenStyles.runDetailFieldValue}
                  numberOfLines={1}>
                  {selectedRunDocument.run.resumedFromRunId}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={screenStyles.runDetailCommandShell}>
            <Text style={screenStyles.runDetailFieldLabel}>
              {appI18n.agentWorkbench.labels.command}
            </Text>
            <Text
              style={[
                screenStyles.terminalText,
                screenStyles.runDetailCommandText,
              ]}
              numberOfLines={2}>
              $ {selectedRunRequest?.command ?? appI18n.common.unknown}
            </Text>
            <Text
              style={screenStyles.runDetailCommandMeta}
              numberOfLines={1}>
              {appI18n.agentWorkbench.labels.cwd} ·{' '}
              {selectedRunRequest?.cwd ??
                appI18n.agentWorkbench.workspace.rootLabel}
            </Text>
          </View>

          {selectedRunArtifactKind ||
          selectedRunArtifactHasStandaloneLabel ||
          selectedRunArtifactPath ? (
            <View style={screenStyles.runDetailGrid}>
              {selectedRunArtifactKind ? (
                <View style={screenStyles.runDetailField}>
                  <Text style={screenStyles.runDetailFieldLabel}>
                    {appI18n.agentWorkbench.labels.runArtifactKind}
                  </Text>
                  <Text
                    testID='agent-workbench.run.artifact-kind'
                    style={screenStyles.runDetailFieldValue}
                    numberOfLines={1}>
                    {resolveArtifactKindLabel(selectedRunArtifactKind)}
                  </Text>
                </View>
              ) : null}
              {selectedRunArtifactHasStandaloneLabel ? (
                <View style={screenStyles.runDetailField}>
                  <Text style={screenStyles.runDetailFieldLabel}>
                    {appI18n.agentWorkbench.labels.runArtifactLabel}
                  </Text>
                  <Text
                    testID='agent-workbench.run.artifact-label'
                    style={screenStyles.runDetailFieldValue}
                    numberOfLines={1}>
                    {selectedRunArtifactLabel ?? appI18n.common.unknown}
                  </Text>
                </View>
              ) : null}
              {selectedRunArtifactPath ? (
                <View
                  style={[
                    screenStyles.runDetailField,
                    screenStyles.runDetailFieldWide,
                  ]}>
                  <Text style={screenStyles.runDetailFieldLabel}>
                    {appI18n.agentWorkbench.labels.runArtifactPath}
                  </Text>
                  <Text
                    testID='agent-workbench.run.artifact-path'
                    style={screenStyles.runDetailFieldValue}
                    numberOfLines={2}>
                    {selectedRunArtifactPath}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Expander>

      {/* Pending approval — decision interrupt card */}
      {selectedPendingApproval ? (
        <View
          testID='agent-workbench.approval.panel'
          style={[
            screenStyles.decisionInterruptCard,
            screenStyles.decisionInterruptCardPending,
          ]}>
          <View style={screenStyles.decisionInterruptHeader}>
            <View style={screenStyles.decisionInterruptBody}>
              <View style={screenStyles.decisionInterruptEyebrowRow}>
                <Icon
                  icon={iconCatalog.shieldTask}
                  size={13}
                  color={palette.accent}
                />
                <Text
                  style={[
                    screenStyles.decisionInterruptEyebrow,
                    {color: palette.accent},
                  ]}>
                  {appI18n.agentWorkbench.approval.pendingTitle}
                </Text>
              </View>
              <Text style={screenStyles.decisionInterruptTitle}>
                {selectedPendingApproval.title}
              </Text>
              <View style={screenStyles.decisionInterruptMetaRow}>
                <View style={screenStyles.decisionInterruptMetaChip}>
                  <Text style={screenStyles.decisionInterruptMetaChipLabel}>
                    {resolvePermissionModeLabel(
                      selectedPendingApproval.permissionMode,
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {selectedPendingApproval.details ? (
            <View style={screenStyles.decisionInterruptDetailsShell}>
              <Text
                style={[
                  screenStyles.terminalText,
                  screenStyles.decisionInterruptDetailsText,
                ]}
                numberOfLines={4}>
                {selectedPendingApproval.details}
              </Text>
            </View>
          ) : null}
          <View style={screenStyles.actionRow}>
            <ActionButton
              testID='agent-workbench.action.approve-request'
              label={
                approvalBusy === 'approving'
                  ? appI18n.agentWorkbench.actions.approvingRequest
                  : appI18n.agentWorkbench.actions.approveRequest
              }
              onPress={onApprove}
              disabled={approvalBusy !== null}
            />
            <ActionButton
              testID='agent-workbench.action.reject-request'
              label={
                approvalBusy === 'rejecting'
                  ? appI18n.agentWorkbench.actions.rejectingRequest
                  : appI18n.agentWorkbench.actions.rejectRequest
              }
              onPress={onReject}
              disabled={approvalBusy !== null}
              tone='ghost'
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
