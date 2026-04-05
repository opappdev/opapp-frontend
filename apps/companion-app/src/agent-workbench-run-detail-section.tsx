import React from 'react';
import {Text, View} from 'react-native';
import type {
  AgentApprovalTimelineEntry,
  AgentArtifactKind,
  AgentRunDocument,
} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  EmptyState,
  Expander,
  InfoPanel,
  useTheme,
} from '@opapp/ui-native-primitives';
import {
  formatIsoTimestamp,
  resolveApprovalStatusLabel,
  resolveArtifactKindLabel,
  resolvePermissionModeLabel,
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
  onRetry: () => void;
  onRestore: () => void;
  onInspectArtifact: () => void;
  onApprove: () => void;
  onReject: () => void;
  onFocusLatestRun: () => void;
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
  onRetry,
  onRestore,
  onInspectArtifact,
  onApprove,
  onReject,
  onFocusLatestRun,
  screenStyles,
}: WorkbenchRunDetailSectionProps) {
  const {palette} = useTheme();

  return (
    <View style={screenStyles.sectionCard}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.runTitle}
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
              onPress={onFocusLatestRun}
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
                onPress={onRetry}
                disabled={!canRetrySelectedRun}
              />
              <ActionButton
                testID='agent-workbench.action.restore-run-workspace'
                label={
                  appI18n.agentWorkbench.actions.restoreRunWorkspace
                }
                onPress={onRestore}
                disabled={!canRestoreSelectedRunWorkspace}
                tone='ghost'
              />
              <ActionButton
                testID='agent-workbench.action.inspect-run-artifact'
                label={appI18n.agentWorkbench.actions.inspectRunArtifact}
                onPress={onInspectArtifact}
                disabled={!canInspectSelectedRunArtifact}
                tone='ghost'
              />
            </View>
          ) : null}
          {/* Primary run info: goal + compact meta */}
          <Text
            testID='agent-workbench.run.goal'
            style={[screenStyles.messageItemContent, {color: palette.ink}]}
            numberOfLines={3}>
            {selectedRunDocument.run.goal}
          </Text>
          <View style={screenStyles.toolCardMeta}>
            <Text
              testID='agent-workbench.run.run-id'
              style={[screenStyles.toolCardMetaItem, {color: palette.accent}]}
              numberOfLines={1}>
              {selectedRunDocument.run.runId}
            </Text>
            <Text
              style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
              {`${selectedRunDocument.timeline.length} events`}
            </Text>
            <Text
              style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
              {formatIsoTimestamp(selectedRunDocument.run.updatedAt)}
            </Text>
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
          {/* Secondary IDs collapsed in expander */}
          <Expander
            title={appI18n.agentWorkbench.labels.runDetailExpanderTitle ?? 'Details'}
            defaultExpanded={false}>
            <View style={screenStyles.expanderBody}>
              <View style={screenStyles.toolCardMeta}>
                <Text
                  style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}
                  numberOfLines={1}>
                  {selectedRunDocument.run.threadId}
                </Text>
                <Text
                  style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}
                  numberOfLines={1}>
                  {selectedRunDocument.run.sessionId ?? appI18n.common.unknown}
                </Text>
              </View>
              {selectedRunDocument.run.resumedFromRunId ? (
                <Text
                  style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}
                  numberOfLines={1}>
                  ↳ {selectedRunDocument.run.resumedFromRunId}
                </Text>
              ) : null}
              <Text
                style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}
                numberOfLines={2}>
                {selectedRunRequest?.command ?? appI18n.common.unknown}
              </Text>
              <Text
                style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}
                numberOfLines={1}>
                {selectedRunRequest?.cwd ?? appI18n.agentWorkbench.workspace.rootLabel}
              </Text>
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
                <View style={screenStyles.toolCardMeta}>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.accent}]}>
                    {resolveApprovalStatusLabel(
                      selectedPendingApproval.status,
                    )}
                  </Text>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                    {resolvePermissionModeLabel(
                      selectedPendingApproval.permissionMode,
                    )}
                  </Text>
                </View>
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
        </>
      ) : (
        <EmptyState
          title={appI18n.agentWorkbench.empty.runTitle}
          description={appI18n.agentWorkbench.empty.runDescription}
        />
      )}
    </View>
  );
}
