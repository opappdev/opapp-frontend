import React from 'react';
import {Text, View} from 'react-native';
import type {
  AgentRunDocument,
  AgentTimelineEntry,
} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  Expander,
  SignalPill,
  StatusBadge,
  useTheme,
  appSpacing,
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

  if (!selectedRunDocument || selectedRunDocument.timeline.length === 0) {
    return (
      <View style={screenStyles.conversationEmpty}>
        <Text style={screenStyles.conversationEmptyTitle}>
          {appI18n.agentWorkbench.empty.timelineTitle}
        </Text>
        <View style={{width: 40, height: 2, backgroundColor: palette.border, opacity: 0.4}} />
        <Text style={screenStyles.conversationEmptyHint}>
          {appI18n.agentWorkbench.empty.timelineDescription}
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.sectionCard}>
      {/* Compact summary pills */}
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

      {/* Timeline items as a unified conversation stream */}
      <View style={screenStyles.timelineList}>
        {selectedTimelineItems.map(item => {
          if (item.kind === 'tool-invocation') {
            return renderToolInvocation(item, screenStyles, palette);
          }

          const entry: AgentTimelineEntry = item.entry;

          /* Messages render inline as conversation bubbles */
          if (entry.kind === 'message') {
            const isUser = entry.role === 'user';
            return (
              <View
                key={item.key}
                style={[
                  screenStyles.messageItem,
                  isUser
                    ? {borderLeftWidth: 3, borderLeftColor: palette.support, backgroundColor: palette.panelEmphasis}
                    : {backgroundColor: palette.canvasShade},
                ]}>
                <View style={screenStyles.messageItemHeader}>
                  <Text style={[screenStyles.messageItemRole, isUser ? {color: palette.support} : null]}>
                    {resolveMessageRoleLabel(entry.role)}
                  </Text>
                  <Text style={screenStyles.messageItemTime}>
                    {formatIsoTimestamp(entry.createdAt)}
                  </Text>
                </View>
                <Text style={screenStyles.messageItemContent} selectable>
                  {entry.content || appI18n.agentWorkbench.values.noTextContent}
                </Text>
              </View>
            );
          }

          /* Plan entries — inline step list */
          if (entry.kind === 'plan') {
            return (
              <View key={item.key} style={[screenStyles.transcriptTerminal, {borderLeftWidth: 2, borderLeftColor: palette.support}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm, marginBottom: appSpacing.sm}}>
                  <Text style={[screenStyles.messageItemRole, {color: palette.inkMuted}]}>
                    {appI18n.agentWorkbench.values.planProgress(
                      countCompletedPlanSteps(entry.steps),
                      entry.steps.length,
                    )}
                  </Text>
                  <SignalPill
                    label={resolveTimelineEntryTrailingLabel(entry)}
                    tone={resolveTimelineEntryTone(entry)}
                    size='sm'
                  />
                </View>
                <View style={screenStyles.timelineStepList}>
                  {entry.steps.map(step => (
                    <View
                      key={step.stepId}
                      style={[
                        screenStyles.timelineStepRow,
                        {backgroundColor: palette.panel},
                      ]}>
                      <StatusBadge
                        label={resolvePlanStepStatusLabel(step.status)}
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
            );
          }

          /* Terminal events — inline terminal block */
          if (entry.kind === 'terminal-event') {
            return (
              <View key={item.key} style={[screenStyles.transcriptTerminal, {borderLeftWidth: 2, borderLeftColor: palette.inkSoft}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm, marginBottom: appSpacing.xs}}>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.accent, fontWeight: '700'}]}>
                    {resolveTerminalEventLabel(entry.event)}
                  </Text>
                  {entry.command ? (
                    <Text style={[screenStyles.terminalText, {color: palette.inkMuted, fontFamily: terminalFontFamily}]} numberOfLines={1}>
                      {entry.command}
                    </Text>
                  ) : null}
                  <View style={{flex: 1}} />
                  {entry.exitCode !== null ? (
                    <Text style={[screenStyles.toolCardMetaItem, {color: entry.exitCode === 0 ? palette.support : palette.errorRed, fontWeight: '700'}]}>
                      exit {entry.exitCode}
                    </Text>
                  ) : null}
                </View>
                {entry.text ? (
                  <Text
                    style={[
                      screenStyles.terminalText,
                      {color: palette.ink, fontFamily: terminalFontFamily},
                    ]}
                    numberOfLines={12}>
                    {entry.text}
                  </Text>
                ) : null}
              </View>
            );
          }

          /* Approval — inline panel with strong accent */
          if (entry.kind === 'approval') {
            return (
              <View
                key={item.key}
                style={[
                  screenStyles.transcriptTerminal,
                  {
                    borderLeftWidth: 3,
                    borderLeftColor: palette.accent,
                  },
                ]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm, marginBottom: appSpacing.xs}}>
                  <SignalPill
                    label={resolveApprovalStatusLabel(entry.status)}
                    tone='warning'
                    size='sm'
                  />
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                    {resolvePermissionModeLabel(entry.permissionMode)}
                  </Text>
                  <View style={{flex: 1}} />
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                    {formatIsoTimestamp(entry.createdAt)}
                  </Text>
                </View>
                {entry.title ? (
                  <Text style={[screenStyles.infoText, {color: palette.ink, marginTop: appSpacing.xxs}]}>
                    {entry.title}
                  </Text>
                ) : null}
                {entry.details ? (
                  <Text
                    style={[screenStyles.terminalText, {color: palette.inkMuted, fontFamily: terminalFontFamily, marginTop: appSpacing.xs}]}
                    numberOfLines={6}>
                    {entry.details}
                  </Text>
                ) : null}
              </View>
            );
          }

          /* Error — inline with strong error accent */
          if (entry.kind === 'error') {
            return (
              <View
                key={item.key}
                style={[
                  screenStyles.transcriptTerminal,
                  {
                    borderLeftWidth: 3,
                    borderLeftColor: palette.errorRed,
                  },
                ]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm}}>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.errorRed, fontWeight: '700'}]}>
                    {entry.code ?? appI18n.common.unknown}
                  </Text>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                    {resolveRetryableLabel(entry.retryable)}
                  </Text>
                </View>
                <Text style={[screenStyles.infoText, {color: palette.ink, marginTop: appSpacing.xs}]}>
                  {entry.message}
                </Text>
              </View>
            );
          }

          /* Artifact — compact inline with support accent */
          if (entry.kind === 'artifact') {
            return (
              <View
                key={item.key}
                style={[
                  screenStyles.transcriptTerminal,
                  {borderLeftWidth: 3, borderLeftColor: palette.support},
                ]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm}}>
                  <SignalPill
                    label={resolveArtifactKindLabel(entry.artifactKind)}
                    tone='support'
                    size='sm'
                  />
                  <Text style={[screenStyles.infoText, {color: palette.ink}]} numberOfLines={1}>
                    {entry.label}
                  </Text>
                  {entry.path ? (
                    <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft, flex: 1}]} numberOfLines={1}>
                      {entry.path}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }

          /* Fallback for unknown entry types */
          return (
            <Expander
              key={item.key}
              title={resolveTimelineEntryTitle(entry)}
              defaultExpanded={false}
              trailing={
                <SignalPill
                  label={resolveTimelineEntryTrailingLabel(entry)}
                  tone={resolveTimelineEntryTone(entry)}
                  size='sm'
                />
              }>
              <View style={screenStyles.transcriptTerminal}>
                <Text style={[screenStyles.infoText, {color: palette.ink}]}>
                  {appI18n.common.unknown}
                </Text>
              </View>
            </Expander>
          );
        })}
      </View>
    </View>
  );
}

function renderToolInvocation(
  item: WorkbenchTimelineDisplayItem & {kind: 'tool-invocation'},
  screenStyles: ReturnType<typeof createScreenStyles>,
  palette: ReturnType<typeof useTheme>['palette'],
) {
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
      style={{borderLeftWidth: 2, borderLeftColor: palette.accent}}
      trailing={
        <SignalPill
          label={resolveToolInvocationTrailingLabel(item)}
          tone={resolveToolInvocationTone(item)}
          size='sm'
        />
      }>
      <View style={screenStyles.expanderBody}>
        {/* Compact meta */}
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
        {/* Input block */}
        <View style={[screenStyles.transcriptTerminal, {marginVertical: 0}]}>
          <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft, marginBottom: appSpacing.xs, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 10}]}>$ input</Text>
          <Text
            testID={`${toolCardBaseTestID}.input`}
            style={[
              screenStyles.terminalText,
              {color: palette.ink, fontFamily: terminalFontFamily},
            ]}
            numberOfLines={15}>
            {item.call?.inputText ?? appI18n.agentWorkbench.values.noTextContent}
          </Text>
        </View>
        {/* Output block */}
        <View style={[screenStyles.transcriptTerminal, {marginVertical: 0}]}>
          <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft, marginBottom: appSpacing.xs, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 10}]}>→ output</Text>
          <Text
            testID={`${toolCardBaseTestID}.output`}
            style={[
              screenStyles.terminalText,
              {color: palette.ink, fontFamily: terminalFontFamily},
            ]}
            numberOfLines={15}>
            {item.result
              ? item.result.outputText || appI18n.agentWorkbench.values.noTextContent
              : appI18n.agentWorkbench.values.noToolResultYet}
          </Text>
        </View>
      </View>
    </Expander>
  );
}
