import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import type {
  AgentRunDocument,
  AgentTimelineEntry,
} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  EmptyState,
  Expander,
  SignalPill,
  StatusBadge,
  useTheme,
} from '@opapp/ui-native-primitives';
import type {
  WorkbenchTimelineDisplayItem,
  WorkbenchTimelineSummary,
} from './agent-workbench-model';
import {
  countCompletedPlanSteps,
  formatIsoTimestamp,
  resolveApprovalStatusLabel,
  resolveArtifactKindLabel,
  resolveMessageRoleLabel,
  resolvePermissionModeLabel,
  resolvePlanStepStatusLabel,
  resolvePlanStepStatusTone,
  resolveRetryableLabel,
  resolveTerminalEventLabel,
  resolveTimelineEntryTitle,
  resolveTimelineEntryTone,
  resolveTimelineEntryTrailingLabel,
  resolveToolCallStatusLabel,
  resolveToolInvocationTerminalEventsLabel,
  resolveToolInvocationTitle,
  resolveToolInvocationTone,
  resolveToolInvocationTrailingLabel,
  resolveToolInvocationUpdatedAt,
  resolveToolInvocationSessionId,
  resolveToolResultStatusLabel,
} from './agent-workbench-resolvers';
import {type createScreenStyles, terminalFontFamily} from './agent-workbench-styles';

type WorkbenchTimelineSectionProps = {
  selectedRunDocument: AgentRunDocument | null;
  selectedTimelineItems: ReadonlyArray<WorkbenchTimelineDisplayItem>;
  selectedTimelineSummary: WorkbenchTimelineSummary;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchTimelineSection({
  selectedRunDocument,
  selectedTimelineItems,
  selectedTimelineSummary,
  screenStyles,
}: WorkbenchTimelineSectionProps) {
  const {palette} = useTheme();

  return (
    <View style={screenStyles.sectionCard}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.timelineTitle}
      </Text>

      {!selectedRunDocument || selectedRunDocument.timeline.length === 0 ? (
        <EmptyState
          title={appI18n.agentWorkbench.empty.timelineTitle}
          description={appI18n.agentWorkbench.empty.timelineDescription}
        />
      ) : (
        <View style={screenStyles.timelineList}>
          <View style={screenStyles.summaryPillRow}>
            {selectedTimelineSummary.toolCallCount > 0 ? (
              <SignalPill
                label={appI18n.agentWorkbench.timelineSummary.toolCalls(
                  selectedTimelineSummary.toolCallCount,
                )}
                tone='accent'
                size='sm'
              />
            ) : null}
            {selectedTimelineSummary.messageCount > 0 ? (
              <SignalPill
                label={appI18n.agentWorkbench.timelineSummary.messages(
                  selectedTimelineSummary.messageCount,
                )}
                tone='support'
                size='sm'
              />
            ) : null}
            {selectedTimelineSummary.approvalCount > 0 ? (
              <SignalPill
                label={appI18n.agentWorkbench.timelineSummary.approvals(
                  selectedTimelineSummary.approvalCount,
                )}
                tone='warning'
                size='sm'
              />
            ) : null}
            {selectedTimelineSummary.errorCount > 0 ? (
              <SignalPill
                label={appI18n.agentWorkbench.timelineSummary.errors(
                  selectedTimelineSummary.errorCount,
                )}
                tone='danger'
                size='sm'
              />
            ) : null}
            {selectedTimelineSummary.artifactCount > 0 ? (
              <SignalPill
                label={appI18n.agentWorkbench.timelineSummary.artifacts(
                  selectedTimelineSummary.artifactCount,
                )}
                tone='support'
                size='sm'
              />
            ) : null}
          </View>
          {selectedTimelineItems.map(item => {
            if (item.kind === 'tool-invocation') {
              const toolCardBaseTestID = `agent-workbench.timeline.tool.${item.toolInvocationIndex}`;
              return (
                <Expander
                  key={item.key}
                  title={resolveToolInvocationTitle(item)}
                  defaultExpanded={
                    item.toolInvocationIndex === 0 ||
                    !item.result ||
                    item.result.status !== 'success' ||
                    item.call?.status !== 'completed'
                  }
                  headerTestID={`${toolCardBaseTestID}.toggle`}
                  contentTestID={`${toolCardBaseTestID}.content`}
                  trailing={
                    <SignalPill
                      label={resolveToolInvocationTrailingLabel(item)}
                      tone={resolveToolInvocationTone(item)}
                      size='sm'
                    />
                  }>
                  <View style={screenStyles.expanderBody}>
                    {/* Compact meta row instead of full detail grid */}
                    <View style={screenStyles.toolCardMeta}>
                      <Text
                        testID={`${toolCardBaseTestID}.name`}
                        style={[screenStyles.toolCardMetaItem, {color: palette.accent}]}>
                        {item.toolName ?? appI18n.agentWorkbench.values.unknownTool}
                      </Text>
                      <Text
                        testID={`${toolCardBaseTestID}.call-status`}
                        style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                        {item.call ? resolveToolCallStatusLabel(item.call.status) : appI18n.common.unknown}
                      </Text>
                      <Text
                        testID={`${toolCardBaseTestID}.result-status`}
                        style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                        {item.result ? resolveToolResultStatusLabel(item.result.status) : appI18n.agentWorkbench.values.noToolResultYet}
                      </Text>
                      {item.result?.exitCode !== null && item.result?.exitCode !== undefined ? (
                        <Text
                          testID={`${toolCardBaseTestID}.exit-code`}
                          style={[screenStyles.toolCardMetaItem, {color: item.result.exitCode === 0 ? palette.support : palette.errorRed}]}>
                          exit {item.result.exitCode}
                        </Text>
                      ) : (
                        <Text
                          testID={`${toolCardBaseTestID}.exit-code`}
                          style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                          {appI18n.common.unknown}
                        </Text>
                      )}
                    </View>
                    {/* Hidden fields for smoke test locators */}
                    <View style={{height: 0, overflow: 'hidden'}}>
                      <Text testID={`${toolCardBaseTestID}.terminal-events`}>
                        {resolveToolInvocationTerminalEventsLabel(item)}
                      </Text>
                      <Text testID={`${toolCardBaseTestID}.call-id`}>
                        {item.callId}
                      </Text>
                      {resolveToolInvocationSessionId(item) ? (
                        <Text testID={`${toolCardBaseTestID}.session-id`}>
                          {resolveToolInvocationSessionId(item)}
                        </Text>
                      ) : null}
                      <Text testID={`${toolCardBaseTestID}.updated-at`}>
                        {formatIsoTimestamp(resolveToolInvocationUpdatedAt(item))}
                      </Text>
                    </View>
                    <View
                      style={[
                        screenStyles.terminalBox,
                        {
                          backgroundColor: palette.canvasShade,
                          borderColor: palette.border,
                        },
                      ]}>
                      <Text
                        testID={`${toolCardBaseTestID}.input`}
                        style={[
                          screenStyles.terminalText,
                          {
                            color: palette.ink,
                            fontFamily: terminalFontFamily,
                          },
                        ]}>
                        {item.call?.inputText ??
                          appI18n.agentWorkbench.values
                            .noTextContent}
                      </Text>
                    </View>
                    <View
                      style={[
                        screenStyles.terminalBox,
                        {
                          backgroundColor: palette.canvasShade,
                          borderColor: palette.border,
                        },
                      ]}>
                      <Text
                        testID={`${toolCardBaseTestID}.output`}
                        style={[
                          screenStyles.terminalText,
                          {
                            color: palette.ink,
                            fontFamily: terminalFontFamily,
                          },
                        ]}>
                        {item.result
                          ? item.result.outputText ||
                            appI18n.agentWorkbench.values
                              .noTextContent
                          : appI18n.agentWorkbench.values
                              .noToolResultYet}
                      </Text>
                    </View>
                  </View>
                </Expander>
              );
            }

            const entry: AgentTimelineEntry = item.entry;
            return (
              <Expander
                key={item.key}
                title={resolveTimelineEntryTitle(entry)}
                defaultExpanded={
                  entry.kind === 'error' ||
                  entry.kind === 'approval' ||
                  entry.kind === 'artifact' ||
                  (entry.kind === 'plan' &&
                    countCompletedPlanSteps(entry.steps) !==
                      entry.steps.length)
                }
                trailing={
                  <SignalPill
                    label={resolveTimelineEntryTrailingLabel(entry)}
                    tone={resolveTimelineEntryTone(entry)}
                    size='sm'
                  />
                }>
              {entry.kind === 'message' ? (
                <View style={screenStyles.expanderBody}>
                  <View style={screenStyles.messageItemHeader}>
                    <Text style={[screenStyles.messageItemRole, {color: palette.accent}]}>
                      {resolveMessageRoleLabel(entry.role)}
                    </Text>
                    <Text style={screenStyles.messageItemTime}>
                      {formatIsoTimestamp(entry.createdAt)}
                    </Text>
                  </View>
                  <Text style={screenStyles.messageItemContent}>
                    {entry.content || appI18n.agentWorkbench.values.noTextContent}
                  </Text>
                </View>
              ) : entry.kind === 'plan' ? (
                <View style={screenStyles.expanderBody}>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                    {appI18n.agentWorkbench.values.planProgress(
                      countCompletedPlanSteps(entry.steps),
                      entry.steps.length,
                    )}
                  </Text>
                  <View style={screenStyles.timelineStepList}>
                    {entry.steps.map(step => (
                      <View
                        key={step.stepId}
                        style={[
                          screenStyles.timelineStepRow,
                          {
                            backgroundColor: palette.canvasShade,
                          },
                        ]}>
                        <StatusBadge
                          label={resolvePlanStepStatusLabel(
                            step.status,
                          )}
                          tone={resolvePlanStepStatusTone(step.status)}
                          emphasis='soft'
                          size='sm'
                        />
                        <Text
                          style={[
                            screenStyles.infoText,
                            screenStyles.timelineStepText,
                            {color: palette.ink},
                          ]}>
                          {step.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : entry.kind === 'terminal-event' ? (
                <View style={screenStyles.expanderBody}>
                  <View style={screenStyles.toolCardMeta}>
                    <Text style={[screenStyles.toolCardMetaItem, {color: palette.accent}]}>
                      {resolveTerminalEventLabel(entry.event)}
                    </Text>
                    {entry.command ? (
                      <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]} numberOfLines={1}>
                        {entry.command}
                      </Text>
                    ) : null}
                    {entry.exitCode !== null ? (
                      <Text style={[screenStyles.toolCardMetaItem, {color: entry.exitCode === 0 ? palette.support : palette.errorRed}]}>
                        exit {entry.exitCode}
                      </Text>
                    ) : null}
                  </View>
                  {entry.text ? (
                    <View
                      style={[
                        screenStyles.terminalBox,
                        {
                          backgroundColor: palette.canvasShade,
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
              ) : entry.kind === 'artifact' ? (
                <View style={screenStyles.expanderBody}>
                  <View style={screenStyles.toolCardMeta}>
                    <Text style={[screenStyles.toolCardMetaItem, {color: palette.accent}]}>
                      {resolveArtifactKindLabel(entry.artifactKind)}
                    </Text>
                    <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                      {entry.label}
                    </Text>
                    {entry.path ? (
                      <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]} numberOfLines={1}>
                        {entry.path}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : entry.kind === 'approval' ? (
                <View style={screenStyles.expanderBody}>
                  <View style={screenStyles.toolCardMeta}>
                    <Text style={[screenStyles.toolCardMetaItem, {color: palette.accent}]}>
                      {resolveApprovalStatusLabel(entry.status)}
                    </Text>
                    <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                      {resolvePermissionModeLabel(entry.permissionMode)}
                    </Text>
                    <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                      {formatIsoTimestamp(entry.createdAt)}
                    </Text>
                  </View>
                  {entry.details ? (
                    <View
                      style={[
                        screenStyles.terminalBox,
                        {
                          backgroundColor: palette.canvasShade,
                          borderColor: palette.border,
                        },
                      ]}>
                      <Text
                        style={[
                          screenStyles.infoText,
                          {color: palette.ink},
                        ]}>
                        {entry.details}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : entry.kind === 'error' ? (
                <View style={screenStyles.expanderBody}>
                  <View style={screenStyles.toolCardMeta}>
                    <Text style={[screenStyles.toolCardMetaItem, {color: palette.errorRed}]}>
                      {entry.code ?? appI18n.common.unknown}
                    </Text>
                    <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                      {resolveRetryableLabel(entry.retryable)}
                    </Text>
                  </View>
                  <View
                    style={[
                      screenStyles.terminalBox,
                      {
                        backgroundColor: palette.canvasShade,
                        borderColor: palette.border,
                      },
                    ]}>
                    <Text
                      style={[
                        screenStyles.infoText,
                        {color: palette.ink},
                      ]}>
                      {entry.message}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    screenStyles.terminalBox,
                    {
                      backgroundColor: palette.canvasShade,
                      borderColor: palette.border,
                    },
                  ]}>
                  <Text style={[screenStyles.infoText, {color: palette.ink}]}>
                    {appI18n.common.unknown}
                  </Text>
                </View>
              )}
            </Expander>
            );
          })}
        </View>
      )}
    </View>
  );
}
