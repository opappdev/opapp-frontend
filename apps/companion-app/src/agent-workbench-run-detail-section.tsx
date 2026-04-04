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
  InfoPanel,
  useTheme,
} from '@opapp/ui-native-primitives';
import {
  formatIsoTimestamp,
  resolveApprovalStatusLabel,
  resolveArtifactKindLabel,
  resolvePermissionModeLabel,
} from './agent-workbench-resolvers';
import {DetailField} from './agent-workbench-components';
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
            {selectedRunArtifactKind ? (
              <DetailField
                label={appI18n.agentWorkbench.labels.runArtifactKind}
                value={resolveArtifactKindLabel(
                  selectedRunArtifactKind,
                )}
                valueTestID='agent-workbench.run.artifact-kind'
              />
            ) : null}
            {selectedRunArtifactHasStandaloneLabel ? (
              <DetailField
                label={appI18n.agentWorkbench.labels.runArtifactLabel}
                value={
                  selectedRunArtifactLabel ??
                  appI18n.common.unknown
                }
                valueTestID='agent-workbench.run.artifact-label'
              />
            ) : null}
            {selectedRunArtifactPath ? (
              <DetailField
                label={appI18n.agentWorkbench.labels.runArtifactPath}
                value={selectedRunArtifactPath}
                valueTestID='agent-workbench.run.artifact-path'
              />
            ) : null}
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
