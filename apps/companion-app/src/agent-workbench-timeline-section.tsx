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
import {DetailField} from './agent-workbench-components';
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
      <Text style={screenStyles.sectionDescription}>
        {appI18n.agentWorkbench.sections.timelineDescription}
      </Text>

      {!selectedRunDocument || selectedRunDocument.timeline.length === 0 ? (
        <EmptyState
          title={appI18n.agentWorkbench.empty.timelineTitle}
          description={appI18n.agentWorkbench.empty.timelineDescription}
        />
      ) : (
        <View style={screenStyles.timelineList}>
          <View style={screenStyles.choiceGrid}>
            <SignalPill
              label={appI18n.agentWorkbench.timelineSummary.messages(
                selectedTimelineSummary.messageCount,
              )}
              tone={
                selectedTimelineSummary.messageCount > 0
                  ? 'support'
                  : 'neutral'
              }
              size='sm'
            />
            <SignalPill
              label={appI18n.agentWorkbench.timelineSummary.plans(
                selectedTimelineSummary.planCount,
              )}
              tone={
                selectedTimelineSummary.planCount > 0
                  ? 'accent'
                  : 'neutral'
              }
              size='sm'
            />
            <SignalPill
              label={appI18n.agentWorkbench.timelineSummary.toolCalls(
                selectedTimelineSummary.toolCallCount,
              )}
              tone={
                selectedTimelineSummary.toolCallCount > 0
                  ? 'accent'
                  : 'neutral'
              }
              size='sm'
            />
            <SignalPill
              label={appI18n.agentWorkbench.timelineSummary.toolResults(
                selectedTimelineSummary.toolResultCount,
              )}
              tone={
                selectedTimelineSummary.toolResultCount > 0
                  ? 'support'
                  : 'neutral'
              }
              size='sm'
            />
            <SignalPill
              label={appI18n.agentWorkbench.timelineSummary.terminalEvents(
                selectedTimelineSummary.terminalEventCount,
              )}
              tone={
                selectedTimelineSummary.terminalEventCount > 0
                  ? 'accent'
                  : 'neutral'
              }
              size='sm'
            />
            <SignalPill
              label={appI18n.agentWorkbench.timelineSummary.approvals(
                selectedTimelineSummary.approvalCount,
              )}
              tone={
                selectedTimelineSummary.approvalCount > 0
                  ? 'warning'
                  : 'neutral'
              }
              size='sm'
            />
            <SignalPill
              label={appI18n.agentWorkbench.timelineSummary.artifacts(
                selectedTimelineSummary.artifactCount,
              )}
              tone={
                selectedTimelineSummary.artifactCount > 0
                  ? 'support'
                  : 'neutral'
              }
              size='sm'
            />
            <SignalPill
              label={appI18n.agentWorkbench.timelineSummary.errors(
                selectedTimelineSummary.errorCount,
              )}
              tone={
                selectedTimelineSummary.errorCount > 0
                  ? 'danger'
                  : 'neutral'
              }
              size='sm'
            />
            <SignalPill
              label={appI18n.agentWorkbench.timelineSummary.other(
                selectedTimelineSummary.otherCount,
              )}
              tone='neutral'
              size='sm'
            />
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
                    <View style={screenStyles.detailGrid}>
                      <DetailField
                        label={appI18n.agentWorkbench.labels.toolName}
                        value={
                          item.toolName ??
                          appI18n.agentWorkbench.values.unknownTool
                        }
                        valueTestID={`${toolCardBaseTestID}.name`}
                      />
                      <DetailField
                        label={
                          appI18n.agentWorkbench.labels
                            .terminalEvents
                        }
                        value={resolveToolInvocationTerminalEventsLabel(
                          item,
                        )}
                        valueTestID={`${toolCardBaseTestID}.terminal-events`}
                      />
                      <DetailField
                        label={appI18n.agentWorkbench.labels.toolCallStatus}
                        value={
                          item.call
                            ? resolveToolCallStatusLabel(
                                item.call.status,
                              )
                            : appI18n.common.unknown
                        }
                        valueTestID={`${toolCardBaseTestID}.call-status`}
                      />
                      <DetailField
                        label={appI18n.agentWorkbench.labels.toolResultStatus}
                        value={
                          item.result
                            ? resolveToolResultStatusLabel(
                                item.result.status,
                              )
                            : appI18n.agentWorkbench.values
                                .noToolResultYet
                        }
                        valueTestID={`${toolCardBaseTestID}.result-status`}
                      />
                      <DetailField
                        label={appI18n.agentWorkbench.labels.callId}
                        value={item.callId}
                        valueTestID={`${toolCardBaseTestID}.call-id`}
                      />
                      {resolveToolInvocationSessionId(item) ? (
                        <DetailField
                          label={appI18n.agentWorkbench.labels.sessionId}
                          value={
                            resolveToolInvocationSessionId(item) ??
                            appI18n.common.unknown
                          }
                          valueTestID={`${toolCardBaseTestID}.session-id`}
                        />
                      ) : null}
                      <DetailField
                        label={appI18n.agentWorkbench.labels.exitCode}
                        value={
                          item.result?.exitCode === null ||
                          item.result?.exitCode === undefined
                            ? appI18n.common.unknown
                            : `${item.result.exitCode}`
                        }
                        valueTestID={`${toolCardBaseTestID}.exit-code`}
                      />
                      <DetailField
                        label={appI18n.agentWorkbench.labels.updatedAt}
                        value={formatIsoTimestamp(
                          resolveToolInvocationUpdatedAt(item),
                        )}
                        valueTestID={`${toolCardBaseTestID}.updated-at`}
                      />
                    </View>
                    <Text
                      style={[
                        screenStyles.sectionDescription,
                        {color: palette.inkMuted},
                      ]}>
                      {appI18n.agentWorkbench.labels.inputText}
                    </Text>
                    <View
                      style={[
                        screenStyles.terminalBox,
                        {
                          backgroundColor: palette.canvas,
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
                    <Text
                      style={[
                        screenStyles.sectionDescription,
                        {color: palette.inkMuted},
                      ]}>
                      {appI18n.agentWorkbench.labels.outputText}
                    </Text>
                    <View
                      style={[
                        screenStyles.terminalBox,
                        {
                          backgroundColor: palette.canvas,
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
                  <View style={screenStyles.detailGrid}>
                    <DetailField
                      label={appI18n.agentWorkbench.labels.messageRole}
                      value={resolveMessageRoleLabel(entry.role)}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.updatedAt}
                      value={formatIsoTimestamp(entry.createdAt)}
                    />
                  </View>
                  <View
                    style={[
                      screenStyles.terminalBox,
                      {
                        backgroundColor: palette.canvas,
                        borderColor: palette.border,
                      },
                    ]}>
                    <Text
                      style={[
                        screenStyles.infoText,
                        {color: palette.ink},
                      ]}>
                      {entry.content ||
                        appI18n.agentWorkbench.values.noTextContent}
                    </Text>
                  </View>
                </View>
              ) : entry.kind === 'plan' ? (
                <View style={screenStyles.expanderBody}>
                  <View style={screenStyles.detailGrid}>
                    <DetailField
                      label={appI18n.agentWorkbench.labels.stepCount}
                      value={`${entry.steps.length}`}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.planProgress}
                      value={appI18n.agentWorkbench.values.planProgress(
                        countCompletedPlanSteps(entry.steps),
                        entry.steps.length,
                      )}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.updatedAt}
                      value={formatIsoTimestamp(entry.createdAt)}
                    />
                  </View>
                  <View style={screenStyles.timelineStepList}>
                    {entry.steps.map(step => (
                      <View
                        key={step.stepId}
                        style={[
                          screenStyles.timelineStepRow,
                          {
                            backgroundColor: palette.canvas,
                            borderColor: palette.border,
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
                  <View style={screenStyles.detailGrid}>
                    <DetailField
                      label={appI18n.agentWorkbench.labels.event}
                      value={resolveTerminalEventLabel(entry.event)}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.command}
                      value={entry.command ?? appI18n.common.unknown}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.cwd}
                      value={entry.cwd ?? appI18n.common.unknown}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.exitCode}
                      value={
                        entry.exitCode === null
                          ? appI18n.common.unknown
                          : `${entry.exitCode}`
                      }
                    />
                  </View>
                  {entry.text ? (
                    <View
                      style={[
                        screenStyles.terminalBox,
                        {
                          backgroundColor: palette.canvas,
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
                  <View style={screenStyles.detailGrid}>
                    <DetailField
                      label={appI18n.agentWorkbench.labels.artifactKind}
                      value={resolveArtifactKindLabel(
                        entry.artifactKind,
                      )}
                    />
                    {entry.label !== entry.path ? (
                      <DetailField
                        label={appI18n.agentWorkbench.labels.artifactLabel}
                        value={entry.label}
                      />
                    ) : null}
                    <DetailField
                      label={appI18n.agentWorkbench.labels.artifactPath}
                      value={entry.path ?? appI18n.common.unknown}
                    />
                    {entry.mimeType ? (
                      <DetailField
                        label={appI18n.agentWorkbench.labels.mimeType}
                        value={entry.mimeType}
                      />
                    ) : null}
                    <DetailField
                      label={appI18n.agentWorkbench.labels.updatedAt}
                      value={formatIsoTimestamp(entry.createdAt)}
                    />
                  </View>
                </View>
              ) : entry.kind === 'approval' ? (
                <View style={screenStyles.expanderBody}>
                  <View style={screenStyles.detailGrid}>
                    <DetailField
                      label={appI18n.agentWorkbench.labels.approvalStatus}
                      value={resolveApprovalStatusLabel(entry.status)}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.permissionMode}
                      value={resolvePermissionModeLabel(
                        entry.permissionMode,
                      )}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.updatedAt}
                      value={formatIsoTimestamp(entry.createdAt)}
                    />
                  </View>
                  {entry.details ? (
                    <View
                      style={[
                        screenStyles.terminalBox,
                        {
                          backgroundColor: palette.canvas,
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
                  <View style={screenStyles.detailGrid}>
                    <DetailField
                      label={appI18n.agentWorkbench.labels.errorCode}
                      value={entry.code ?? appI18n.common.unknown}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.retryable}
                      value={resolveRetryableLabel(entry.retryable)}
                    />
                    <DetailField
                      label={appI18n.agentWorkbench.labels.updatedAt}
                      value={formatIsoTimestamp(entry.createdAt)}
                    />
                  </View>
                  <View
                    style={[
                      screenStyles.terminalBox,
                      {
                        backgroundColor: palette.canvas,
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
                      backgroundColor: palette.canvas,
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
