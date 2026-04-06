import React from 'react';
import {Text, View} from 'react-native';
import type {
  AgentRunDocument,
  AgentTimelineEntry,
} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  Expander,
  Icon,
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
  resolveApprovalTargetDescription,
  resolveArtifactKindLabel,
  resolveMessageRoleLabel,
  resolvePermissionModeLabel,
  resolvePlanStepStatusLabel,
  resolvePlanStepStatusTone,
  resolveRetryableLabel,
  resolveTerminalEventLabel,
  resolveTimelineEntryIcon,
  resolveTimelineEntryTitle,
  resolveTimelineEntryTone,
  resolveTimelineEntryTrailingLabel,
  resolveToolCallStatusLabel,
  resolveToolInvocationHumanTitle,
  resolveToolInvocationIcon,
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
        <Text style={screenStyles.conversationEmptyHint}>
          {appI18n.agentWorkbench.empty.timelineDescription}
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.sectionCard}>
      {/* Compact summary — single muted line */}
      {(selectedTimelineSummary.toolCallCount > 0 || selectedTimelineSummary.errorCount > 0) ? (
        <View style={screenStyles.summaryPillRow}>
          {selectedTimelineSummary.toolCallCount > 0 ? (
            <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted, opacity: 0.6}]}>
              {appI18n.agentWorkbench.timelineSummary.toolCalls(
                selectedTimelineSummary.toolCallCount,
              )}
            </Text>
          ) : null}
          {selectedTimelineSummary.errorCount > 0 ? (
            <Text style={[screenStyles.toolCardMetaItem, {color: palette.errorRed, opacity: 0.8}]}>
              {appI18n.agentWorkbench.timelineSummary.errors(
                selectedTimelineSummary.errorCount,
              )}
            </Text>
          ) : null}
        </View>
      ) : null}

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
                    ? {backgroundColor: palette.panelEmphasis, borderLeftWidth: 2, borderLeftColor: palette.accent}
                    : {backgroundColor: palette.panel},
                ]}>
                <View style={screenStyles.messageItemHeader}>
                  <Icon icon={resolveTimelineEntryIcon(entry)} size={12} color={isUser ? palette.accent : palette.inkMuted} />
                  <Text style={[screenStyles.messageItemRole, isUser ? {color: palette.accent} : null]}>
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

          /* Plan entries — clean step list */
          if (entry.kind === 'plan') {
            return (
              <View key={item.key} style={screenStyles.transcriptTerminal}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm, marginBottom: appSpacing.sm}}>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                    {appI18n.agentWorkbench.values.planProgress(
                      countCompletedPlanSteps(entry.steps),
                      entry.steps.length,
                    )}
                  </Text>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                    {resolveTimelineEntryTrailingLabel(entry)}
                  </Text>
                </View>
                <View style={screenStyles.timelineStepList}>
                  {entry.steps.map(step => (
                    <View
                      key={step.stepId}
                      style={[
                        screenStyles.timelineStepRow,
                        {
                          backgroundColor: step.status === 'completed' ? palette.panelEmphasis : palette.panel,
                        },
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

          /* Terminal events — compact inline */
          if (entry.kind === 'terminal-event') {
            return (
              <View key={item.key} style={screenStyles.transcriptTerminal}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.xs, marginBottom: entry.text ? appSpacing.xxs : 0}}>
                  <Icon icon={resolveTimelineEntryIcon(entry)} size={11} color={palette.inkMuted} />
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
                    {resolveTerminalEventLabel(entry.event)}
                  </Text>
                  {entry.command ? (
                    <Text style={[screenStyles.terminalText, {color: palette.ink, fontFamily: terminalFontFamily, flex: 1}]} numberOfLines={1}>
                      $ {entry.command}
                    </Text>
                  ) : null}
                  {entry.exitCode !== null ? (
                    <Text style={[screenStyles.toolCardMetaItem, {color: entry.exitCode === 0 ? palette.support : palette.errorRed, fontFamily: terminalFontFamily}]}>
                      exit {entry.exitCode}
                    </Text>
                  ) : null}
                </View>
                {entry.text ? (
                  <Text
                    style={[
                      screenStyles.terminalText,
                      {color: palette.inkMuted, fontFamily: terminalFontFamily},
                    ]}
                    numberOfLines={8}>
                    {entry.text}
                  </Text>
                ) : null}
              </View>
            );
          }

          /* Approval — clean decision interrupt */
          if (entry.kind === 'approval') {
            const approvalTarget = resolveApprovalTargetDescription(entry);
            return (
              <View
                key={item.key}
                style={[
                  screenStyles.transcriptTerminal,
                  {backgroundColor: palette.panelEmphasis, paddingVertical: appSpacing.sm2},
                ]}>
                {entry.title ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.xs}}>
                    <Icon icon={resolveTimelineEntryIcon(entry)} size={13} color={palette.accent} />
                    <Text style={[screenStyles.infoText, {color: palette.ink, fontWeight: '600'}]}>
                      {entry.title}
                    </Text>
                  </View>
                ) : null}
                {approvalTarget ? (
                  <Text
                    style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted, marginTop: appSpacing.xxs}]}
                    numberOfLines={1}>
                    {approvalTarget}
                  </Text>
                ) : null}
                {entry.details ? (
                  <Text
                    style={[screenStyles.terminalText, {color: palette.inkMuted, fontFamily: terminalFontFamily}]}
                    numberOfLines={4}>
                    {entry.details}
                  </Text>
                ) : null}
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm, marginTop: appSpacing.xs}}>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.accent}]}>
                    {resolveApprovalStatusLabel(entry.status)}
                  </Text>
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                    {resolvePermissionModeLabel(entry.permissionMode)}
                  </Text>
                </View>
              </View>
            );
          }

          /* Error — message first, code as secondary meta */
          if (entry.kind === 'error') {
            return (
              <View
                key={item.key}
                style={[screenStyles.transcriptTerminal, {backgroundColor: `${palette.errorRed}08`}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.xs}}>
                  <Icon icon={resolveTimelineEntryIcon(entry)} size={12} color={palette.errorRed} />
                  <Text style={[screenStyles.infoText, {color: palette.ink, flex: 1}]}>
                    {entry.message}
                  </Text>
                </View>
                {entry.code ? (
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.errorRed, marginTop: appSpacing.xxs}]}>
                    {entry.code}
                  </Text>
                ) : null}
              </View>
            );
          }

          /* Artifact — compact inline */
          if (entry.kind === 'artifact') {
            return (
              <View
                key={item.key}
                style={screenStyles.transcriptTerminal}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm}}>
                  <Icon icon={resolveTimelineEntryIcon(entry)} size={12} color={palette.support} />
                  <Text style={[screenStyles.toolCardMetaItem, {color: palette.support, fontWeight: '600'}]}>
                    {resolveArtifactKindLabel(entry.artifactKind)}
                  </Text>
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
  const isComplete = item.result?.status === 'success' && item.call?.status === 'completed';
  const hasError = item.result?.status === 'error' || (item.result?.exitCode !== null && item.result?.exitCode !== undefined && item.result.exitCode !== 0);
  const toolIcon = resolveToolInvocationIcon(item);

  return (
    <Expander
      key={item.key}
      title={resolveToolInvocationHumanTitle(item)}
      icon={toolIcon}
      defaultExpanded={
        item.toolInvocationIndex === 0 ||
        !item.result ||
        item.result.status !== 'success' ||
        item.call?.status !== 'completed'
      }
      headerTestID={`${toolCardBaseTestID}.toggle`}
      contentTestID={`${toolCardBaseTestID}.content`}
      trailing={
        <StatusBadge
          label={resolveToolInvocationTrailingLabel(item)}
          tone={resolveToolInvocationTone(item)}
          emphasis='soft'
          size='sm'
        />
      }>
      <View style={screenStyles.expanderBody}>
        {/* Hidden fields for smoke test locators — all testIDs preserved */}
        <View style={{height: 0, overflow: 'hidden'}}>
          <Text testID={`${toolCardBaseTestID}.name`}>
            {item.toolName ?? appI18n.agentWorkbench.values.unknownTool}
          </Text>
          <Text testID={`${toolCardBaseTestID}.call-status`}>
            {item.call ? resolveToolCallStatusLabel(item.call.status) : appI18n.common.unknown}
          </Text>
          <Text testID={`${toolCardBaseTestID}.result-status`}>
            {item.result ? resolveToolResultStatusLabel(item.result.status) : appI18n.agentWorkbench.values.noToolResultYet}
          </Text>
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
        {/* Compact result summary — just exit code when available */}
        {item.result?.exitCode !== null && item.result?.exitCode !== undefined ? (
          <View style={screenStyles.toolCardMeta}>
            <Text
              testID={`${toolCardBaseTestID}.exit-code`}
              style={[screenStyles.toolCardMetaItem, {color: item.result.exitCode === 0 ? palette.support : palette.errorRed, fontFamily: terminalFontFamily}]}>
              exit {item.result.exitCode}
            </Text>
          </View>
        ) : null}
        {/* Input — inline command preview */}
        <View style={[screenStyles.transcriptTerminal, {marginVertical: 0}]}>
          <Text
            testID={`${toolCardBaseTestID}.input`}
            style={[
              screenStyles.terminalText,
              {color: palette.ink, fontFamily: terminalFontFamily},
            ]}
            numberOfLines={8}>
            {'$ '}{item.call?.inputText ?? appI18n.agentWorkbench.values.noTextContent}
          </Text>
        </View>
        {/* Output — result block */}
        <View style={[screenStyles.transcriptTerminal, {marginVertical: 0, backgroundColor: hasError ? `${palette.errorRed}08` : palette.canvasShade}]}>
          <Text
            testID={`${toolCardBaseTestID}.output`}
            style={[
              screenStyles.terminalText,
              {color: hasError ? palette.errorRed : palette.ink, fontFamily: terminalFontFamily},
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
