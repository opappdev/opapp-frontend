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
  StatusBadge,
  useTheme,
  appSpacing,
} from '@opapp/ui-native-primitives';
import type {WorkbenchTimelineDisplayItem} from './agent-workbench-model';
import {
  countCompletedPlanSteps,
  formatIsoTimestamp,
  resolveApprovalStatusLabel,
  resolveApprovalStatusTone,
  resolveApprovalTargetDescription,
  resolveArtifactKindLabel,
  resolveMessageRoleLabel,
  resolvePermissionModeLabel,
  resolvePlanStepStatusLabel,
  resolvePlanStepStatusTone,
  resolveTerminalEventLabel,
  resolveTimelineEntryIcon,
  resolveTimelineEntryTitle,
  resolveTimelineEntryTone,
  resolveTimelineEntryTrailingLabel,
  resolveToolCallStatusLabel,
  resolveToolInvocationHumanTitle,
  resolveToolInvocationIcon,
  resolveToolInvocationTerminalEventsLabel,
  resolveToolInvocationTrailingLabel,
  resolveToolInvocationUpdatedAt,
  resolveToolInvocationSessionId,
  resolveToolResultStatusLabel,
} from './agent-workbench-resolvers';
import {type createScreenStyles, terminalFontFamily} from './agent-workbench-styles';

type WorkbenchTimelineSectionProps = {
  selectedRunDocument: AgentRunDocument | null;
  selectedTimelineItems: ReadonlyArray<WorkbenchTimelineDisplayItem>;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchTimelineSection({
  selectedRunDocument,
  selectedTimelineItems,
  screenStyles,
}: WorkbenchTimelineSectionProps) {
  const {palette} = useTheme();

  if (!selectedRunDocument) {
    return (
      <View style={screenStyles.conversationEmpty}>
        <View style={screenStyles.conversationEmptyCard}>
          <Text style={screenStyles.conversationEmptyEyebrow}>
            {appI18n.agentWorkbench.sections.timelineTitle}
          </Text>
          <Text style={screenStyles.conversationEmptyTitle}>
            {appI18n.agentWorkbench.empty.timelineIdleTitle}
          </Text>
          <Text style={screenStyles.conversationEmptyHint}>
            {appI18n.agentWorkbench.empty.timelineIdleDescription}
          </Text>
          <View style={screenStyles.conversationEmptyList}>
            {[
              appI18n.agentWorkbench.empty.timelineIdleStepDescribe,
              appI18n.agentWorkbench.empty.timelineIdleStepWorkspace,
              appI18n.agentWorkbench.empty.timelineIdleStepFollow,
            ].map((step, index) => (
              <View key={step} style={screenStyles.conversationEmptyItem}>
                <View style={screenStyles.conversationEmptyItemMarker}>
                  <Text style={screenStyles.conversationEmptyItemMarkerLabel}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={screenStyles.conversationEmptyItemText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (selectedRunDocument.timeline.length === 0) {
    return (
      <View style={screenStyles.conversationEmpty}>
        <View style={screenStyles.conversationEmptyCard}>
          <Text style={screenStyles.conversationEmptyEyebrow}>
            {appI18n.agentWorkbench.sections.timelineTitle}
          </Text>
          <Text style={screenStyles.conversationEmptyTitle}>
            {appI18n.agentWorkbench.empty.timelinePendingTitle}
          </Text>
          <Text style={screenStyles.conversationEmptyHint}>
            {appI18n.agentWorkbench.empty.timelinePendingDescription}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={screenStyles.sectionCard}>
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
            const completedStepCount = countCompletedPlanSteps(entry.steps);
            const planProgressLabel = appI18n.agentWorkbench.values.planProgress(
              completedStepCount,
              entry.steps.length,
            );
            return (
              <View key={item.key} style={screenStyles.planCard}>
                <View style={screenStyles.planCardHeader}>
                  <View style={screenStyles.planCardIntro}>
                    <View style={screenStyles.planCardEyebrowRow}>
                      <Icon
                        icon={resolveTimelineEntryIcon(entry)}
                        size={12}
                        color={palette.inkMuted}
                      />
                      <Text style={screenStyles.planCardEyebrow}>
                        {appI18n.agentWorkbench.events.plan}
                      </Text>
                    </View>
                    <View style={screenStyles.planCardMetaRow}>
                      <View style={screenStyles.planProgressChip}>
                        <Text
                          style={[
                            screenStyles.planProgressChipLabel,
                            {
                              color:
                                completedStepCount === entry.steps.length &&
                                entry.steps.length > 0
                                  ? palette.support
                                  : palette.inkSoft,
                            },
                          ]}>
                          {planProgressLabel}
                        </Text>
                      </View>
                      <Text style={screenStyles.messageItemTime}>
                        {formatIsoTimestamp(entry.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={screenStyles.timelineStepList}>
                  {entry.steps.map(step => (
                    <View
                      key={step.stepId}
                      style={[
                        screenStyles.timelineStepRow,
                        {
                          backgroundColor:
                            step.status === 'completed'
                              ? palette.panelEmphasis
                              : palette.canvasShade,
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
            if (
              entry.status === 'pending' &&
              selectedRunDocument.run.status === 'needs-approval'
            ) {
              return null;
            }

            const approvalTarget = resolveApprovalTargetDescription(entry);
            const approvalStatusTone = resolveApprovalStatusTone(entry.status);
            const approvalCardToneStyle =
              entry.status === 'approved'
                ? screenStyles.decisionInterruptCardApproved
                : entry.status === 'rejected'
                  ? screenStyles.decisionInterruptCardRejected
                  : null;
            return (
              <View
                key={item.key}
                style={[
                  screenStyles.decisionInterruptCard,
                  approvalCardToneStyle,
                ]}>
                <View style={screenStyles.decisionInterruptHeader}>
                  <View style={screenStyles.decisionInterruptBody}>
                    <View style={screenStyles.decisionInterruptEyebrowRow}>
                      <Icon
                        icon={resolveTimelineEntryIcon(entry)}
                        size={13}
                        color={palette.accent}
                      />
                      <Text
                        style={[
                          screenStyles.decisionInterruptEyebrow,
                          {color: palette.accent},
                        ]}>
                        {appI18n.agentWorkbench.events.approval}
                      </Text>
                    </View>
                    {entry.title ? (
                      <Text style={screenStyles.decisionInterruptTitle}>
                        {entry.title}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={screenStyles.messageItemTime}>
                    {formatIsoTimestamp(entry.createdAt)}
                  </Text>
                </View>
                <View style={screenStyles.decisionInterruptMetaRow}>
                  <StatusBadge
                    label={resolveApprovalStatusLabel(entry.status)}
                    tone={approvalStatusTone}
                    emphasis='soft'
                    size='sm'
                  />
                  <View style={screenStyles.decisionInterruptMetaChip}>
                    <Text style={screenStyles.decisionInterruptMetaChipLabel}>
                      {resolvePermissionModeLabel(entry.permissionMode)}
                    </Text>
                  </View>
                  {approvalTarget ? (
                    <Text
                      style={screenStyles.decisionInterruptMetaText}
                      numberOfLines={1}>
                      {approvalTarget}
                    </Text>
                  ) : null}
                </View>
                {entry.details ? (
                  <View style={screenStyles.decisionInterruptDetailsShell}>
                    <Text
                      style={[
                        screenStyles.terminalText,
                        screenStyles.decisionInterruptDetailsText,
                      ]}
                      numberOfLines={entry.status === 'pending' ? 4 : 2}>
                      {entry.details}
                    </Text>
                  </View>
                ) : null}
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
                <StatusBadge
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
  const isSuccess =
    item.result?.status === 'success' && item.call?.status === 'completed';
  const hasError =
    item.result?.status === 'error' ||
    (item.result?.exitCode !== null &&
      item.result?.exitCode !== undefined &&
      item.result.exitCode !== 0);
  const isCancelled =
    item.result?.status === 'cancelled' || item.call?.status === 'cancelled';
  const isRunning = !item.result && item.call?.status === 'running';
  const toolIcon = resolveToolInvocationIcon(item);
  const commandPreview = resolveToolInvocationCommandPreview(item);
  const humanTitle = isRunning
    ? appI18n.agentWorkbench.timeline.runningCommand(commandPreview)
    : isSuccess
      ? appI18n.agentWorkbench.timeline.ranCommand(commandPreview)
      : isCancelled
        ? appI18n.agentWorkbench.timeline.cancelledCommand(commandPreview)
        : hasError
          ? appI18n.agentWorkbench.timeline.failedCommand(commandPreview)
          : resolveToolInvocationHumanTitle(item);

  // Determine result label for the collapsed header
  const resultTag = isRunning
    ? appI18n.agentWorkbench.status.running
    : isSuccess
      ? appI18n.agentWorkbench.toolResultStatus.success
      : isCancelled
        ? appI18n.agentWorkbench.toolResultStatus.cancelled
      : hasError
        ? (item.result?.exitCode !== null && item.result?.exitCode !== undefined
            ? appI18n.agentWorkbench.timeline.exitCode(item.result.exitCode)
            : appI18n.agentWorkbench.toolResultStatus.error)
        : resolveToolInvocationTrailingLabel(item);

  const resultColor = isRunning
    ? palette.accent
    : isSuccess
      ? palette.support
      : hasError
        ? palette.errorRed
        : palette.inkSoft;

  // Success steps auto-collapse; failures/running/pending stay expanded
  const defaultExpanded = !isSuccess;
  const expanderKey = [
    item.key,
    item.call?.status ?? 'no-call',
    item.result?.status ?? 'no-result',
    item.result?.exitCode ?? 'no-exit',
  ].join(':');

  return (
    <View key={expanderKey}>
      {/* Hidden fields for smoke test locators — keep mounted even when success cards collapse. */}
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
        <Text testID={`${toolCardBaseTestID}.input`}>
          {item.call?.inputText ?? appI18n.agentWorkbench.values.noTextContent}
        </Text>
        <Text testID={`${toolCardBaseTestID}.output`}>
          {item.result
            ? item.result.outputText || appI18n.agentWorkbench.values.noTextContent
            : isRunning
              ? '...'
              : appI18n.agentWorkbench.values.noToolResultYet}
        </Text>
        {item.result?.exitCode !== null && item.result?.exitCode !== undefined ? (
          <Text testID={`${toolCardBaseTestID}.exit-code`}>
            {item.result.exitCode}
          </Text>
        ) : null}
      </View>

      <Expander
        title={humanTitle}
        icon={toolIcon}
        defaultExpanded={defaultExpanded}
        headerTestID={`${toolCardBaseTestID}.toggle`}
        contentTestID={`${toolCardBaseTestID}.content`}
        trailing={
          <Text style={[screenStyles.toolCardMetaItem, {color: resultColor, fontWeight: '500'}]}>
            {resultTag}
          </Text>
        }>
        <View style={screenStyles.expanderBody}>
        {/* Unified transcript block — command + output + exit as one continuous terminal */}
        <View style={[screenStyles.transcriptTerminal, {
          marginVertical: 0,
          backgroundColor: hasError ? `${palette.errorRed}08` : palette.canvasShade,
        }]}>
          {/* Command input */}
          <Text
            style={[
              screenStyles.terminalText,
              {color: palette.accent, fontFamily: terminalFontFamily, marginBottom: appSpacing.xxs},
            ]}
            numberOfLines={4}>
            {'$ '}{item.call?.inputText ?? appI18n.agentWorkbench.values.noTextContent}
          </Text>
          {/* Output */}
          <Text
            style={[
              screenStyles.terminalText,
              {color: hasError ? palette.errorRed : palette.ink, fontFamily: terminalFontFamily},
            ]}
            numberOfLines={15}>
            {item.result
              ? item.result.outputText || appI18n.agentWorkbench.values.noTextContent
              : isRunning
                ? '...'
                : appI18n.agentWorkbench.values.noToolResultYet}
          </Text>
          {/* Exit code at the bottom of the block */}
          {item.result?.exitCode !== null && item.result?.exitCode !== undefined ? (
            <Text
              style={[
                screenStyles.toolCardMetaItem,
                {
                  color: item.result.exitCode === 0 ? palette.support : palette.errorRed,
                  fontFamily: terminalFontFamily,
                  marginTop: appSpacing.xxs,
                  textAlign: 'right',
                },
              ]}>
              exit {item.result.exitCode}
            </Text>
          ) : null}
        </View>
        </View>
      </Expander>
    </View>
  );
}

function resolveToolInvocationCommandPreview(
  item: WorkbenchTimelineDisplayItem & {kind: 'tool-invocation'},
) {
  const firstLine = item.call?.inputText
    ?.split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0);

  if (!firstLine) {
    return resolveToolInvocationHumanTitle(item);
  }

  return item.toolName === 'shell_command'
    ? firstLine
    : resolveToolInvocationHumanTitle(item);
}
