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
  InfoPanel,
  Icon,
  StatusBadge,
  iconCatalog,
  useTheme,
  appSpacing,
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
                      latestThreadRunDocument.run.runId,
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

            <View style={screenStyles.runHeaderMetaRow}>
              <View style={screenStyles.runMetaChip}>
                <Text
                  testID='agent-workbench.run.run-id'
                  style={screenStyles.runMetaChipLabel}
                  numberOfLines={1}>
                  {selectedRunDocument.run.runId}
                </Text>
              </View>
              <View style={screenStyles.runMetaChip}>
                <Icon icon={iconCatalog.clock} size={11} color={palette.inkSoft} />
                <Text style={screenStyles.runMetaChipLabel}>
                  {formatIsoTimestamp(selectedRunDocument.run.updatedAt)}
                </Text>
              </View>
              {workspacePath ? (
                <View style={screenStyles.runMetaChip}>
                  <Icon
                    icon={iconCatalog.folder}
                    size={11}
                    color={palette.inkSoft}
                  />
                  <Text style={screenStyles.runMetaChipLabel} numberOfLines={1}>
                    {workspacePath}
                  </Text>
                </View>
              ) : null}
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
          {/* IDs on a single line */}
          <Text
            style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}
            numberOfLines={1}>
            {selectedRunDocument.run.threadId} · {selectedRunDocument.run.sessionId ?? appI18n.common.unknown}
          </Text>
          {selectedRunDocument.run.resumedFromRunId ? (
            <Text
              style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}
              numberOfLines={1}>
              ↳ {selectedRunDocument.run.resumedFromRunId}
            </Text>
          ) : null}
          {/* Command + cwd */}
          <View style={[screenStyles.transcriptTerminal, {marginVertical: 0}]}>
            <Text
              style={[screenStyles.terminalText, {color: palette.ink, fontFamily: 'Consolas'}]}
              numberOfLines={2}>
              $ {selectedRunRequest?.command ?? appI18n.common.unknown}
            </Text>
            <Text
              style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft, marginTop: appSpacing.xxs}]}
              numberOfLines={1}>
              {selectedRunRequest?.cwd ?? appI18n.agentWorkbench.workspace.rootLabel}
            </Text>
          </View>
          {selectedRunArtifactKind ? (
            <Text
              testID='agent-workbench.run.artifact-kind'
              style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
              {resolveArtifactKindLabel(selectedRunArtifactKind)}
            </Text>
          ) : null}
          {selectedRunArtifactHasStandaloneLabel ? (
            <Text
              testID='agent-workbench.run.artifact-label'
              style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
              {selectedRunArtifactLabel ?? appI18n.common.unknown}
            </Text>
          ) : null}
          {selectedRunArtifactPath ? (
            <Text
              testID='agent-workbench.run.artifact-path'
              style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}
              numberOfLines={1}>
              {selectedRunArtifactPath}
            </Text>
          ) : null}
        </View>
      </Expander>

      {/* Pending approval — decision interrupt card */}
      {selectedPendingApproval ? (
        <InfoPanel
          testID='agent-workbench.approval.panel'
          title={appI18n.agentWorkbench.approval.pendingTitle}
          tone='accent'>
          <View style={{gap: appSpacing.sm2}}>
            <Text style={[screenStyles.infoText, {color: palette.ink}]}>
              {selectedPendingApproval.title}
            </Text>
            {selectedPendingApproval.details ? (
              <Text
                style={[
                  screenStyles.terminalText,
                  {color: palette.inkMuted, fontFamily: 'Consolas'},
                ]}
                numberOfLines={4}>
                {selectedPendingApproval.details}
              </Text>
            ) : null}
            <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted, opacity: 0.6}]}>
              {resolvePermissionModeLabel(
                selectedPendingApproval.permissionMode,
              )}
            </Text>
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
        </InfoPanel>
      ) : null}
    </View>
  );
}
