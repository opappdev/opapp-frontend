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
  StatusBadge,
  useTheme,
} from '@opapp/ui-native-primitives';
import {
  formatIsoTimestamp,
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
  viewingHistoricalRun: boolean;
  latestThreadRunDocument: AgentRunDocument | null;
  previousThreadRunDocument: AgentRunDocument | null;
  selectedCwd: string;
  onRetry: () => void;
  onRestore: () => void;
  onInspectArtifact: () => void;
  onViewPreviousRun: () => void;
  onFocusLatestRun: () => void;
  onBrowseWorkspaceRoot: () => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchRunDetailSection({
  selectedRunDocument,
  selectedRunRequest,
  selectedPendingApproval,
  canRetrySelectedRun,
  canRestoreSelectedRunWorkspace,
  canInspectSelectedRunArtifact,
  retryBusy,
  viewingHistoricalRun,
  latestThreadRunDocument,
  previousThreadRunDocument,
  selectedCwd,
  onRetry,
  onRestore,
  onInspectArtifact,
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
    viewingHistoricalRun &&
    latestThreadRunDocument !== null &&
    selectedPendingApproval === null;
  const showContextActions =
    selectedPendingApproval === null &&
    ((!viewingHistoricalRun && previousThreadRunDocument !== null) ||
      selectedCwd.length > 0);
  const showPrimaryActions =
    selectedPendingApproval === null &&
    (canInspectSelectedRunArtifact ||
      canRetrySelectedRun ||
      canRestoreSelectedRunWorkspace);
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
              {selectedPendingApproval ? (
                <Text
                  style={[
                    screenStyles.runHeaderDecisionLabel,
                    {color: palette.accent},
                  ]}>
                  {appI18n.agentWorkbench.approval.pendingTitle}
                </Text>
              ) : (
                <StatusBadge
                  label={resolveRunStatusLabel(selectedRunDocument.run.status)}
                  tone={resolveRunStatusTone(selectedRunDocument.run.status)}
                  emphasis='soft'
                  size='sm'
                />
              )}
              {!selectedPendingApproval &&
              selectedRunDocument.run.status === 'needs-approval' ? (
                <Text
                  style={[
                    screenStyles.runHeaderDecisionLabel,
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
    </View>
  );
}
