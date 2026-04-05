import React from 'react';
import {Text, TextInput as RNTextInput, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  ChoiceChip,
  EmptyState,
  InfoPanel,
  useTheme,
} from '@opapp/ui-native-primitives';
import type {TrustedWorkspaceTarget} from '@opapp/framework-filesystem';
import type {WorkbenchTaskDraft} from './agent-workbench-model';
import type {createScreenStyles} from './agent-workbench-styles';
import type {
  AgentWorkbenchApprovalBusy,
  AgentWorkbenchTaskDraftBusy,
} from './agent-workbench-state';

type WorkbenchTaskDraftSectionProps = {
  trustedWorkspace: TrustedWorkspaceTarget | null;
  textInputsReady: boolean;
  draftGoal: string;
  draftCommand: string;
  draftRequiresApproval: boolean;
  draftTask: WorkbenchTaskDraft | null;
  taskDraftBusy: AgentWorkbenchTaskDraftBusy;
  activeRunInfo: {threadId: string; runId: string} | null;
  approvalBusy: AgentWorkbenchApprovalBusy;
  onDraftGoalChange: (value: string) => void;
  onDraftCommandChange: (value: string) => void;
  onSelectDirectMode: () => void;
  onSelectApprovalMode: () => void;
  onPopulateWriteApprovalDraft: () => void;
  onStartDraftTask: () => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchTaskDraftSection({
  trustedWorkspace,
  textInputsReady,
  draftGoal,
  draftCommand,
  draftRequiresApproval,
  draftTask,
  taskDraftBusy,
  activeRunInfo,
  approvalBusy,
  onDraftGoalChange,
  onDraftCommandChange,
  onSelectDirectMode,
  onSelectApprovalMode,
  onPopulateWriteApprovalDraft,
  onStartDraftTask,
  screenStyles,
}: WorkbenchTaskDraftSectionProps) {
  const {palette} = useTheme();

  return (
    <View style={screenStyles.sectionCardPrimary}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.taskDraftTitle}
      </Text>

      {!trustedWorkspace ? (
        <EmptyState
          title={appI18n.agentWorkbench.empty.workspaceTitle}
          description={appI18n.agentWorkbench.empty.workspaceDescription}
        />
      ) : (
        <View style={screenStyles.sectionBody}>
          {/* Goal input — no label, placeholder-only */}
          {textInputsReady ? (
            <View
              style={[
                screenStyles.textInputShell,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}>
              <RNTextInput
                testID='agent-workbench.task.goal-input'
                value={draftGoal}
                onChangeText={onDraftGoalChange}
                placeholder={
                  appI18n.agentWorkbench.taskDraft.goalPlaceholder
                }
                placeholderTextColor={palette.inkSoft}
                style={[
                  screenStyles.textInputField,
                  {
                    color: palette.ink,
                  },
                ]}
              />
            </View>
          ) : (
            <View
              style={[
                screenStyles.textInputPlaceholder,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}>
              <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
                {appI18n.agentWorkbench.taskDraft.goalPlaceholder}
              </Text>
            </View>
          )}

          {/* Command input — no label */}
          {textInputsReady ? (
            <View
              style={[
                screenStyles.textInputShell,
                screenStyles.textInputMultilineShell,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}>
              <RNTextInput
                testID='agent-workbench.task.command-input'
                value={draftCommand}
                onChangeText={onDraftCommandChange}
                placeholder={
                  appI18n.agentWorkbench.taskDraft.commandPlaceholder
                }
                placeholderTextColor={palette.inkSoft}
                multiline
                textAlignVertical='top'
                style={[
                  screenStyles.textInputField,
                  screenStyles.textInputMultiline,
                  {
                    color: palette.ink,
                  },
                ]}
              />
            </View>
          ) : (
            <View
              style={[
                screenStyles.textInputPlaceholder,
                screenStyles.textInputMultilineShell,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}>
              <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
                {appI18n.agentWorkbench.taskDraft.commandPlaceholder}
              </Text>
            </View>
          )}

          <View style={screenStyles.choiceGrid}>
            <ChoiceChip
              testID='agent-workbench.task.mode.direct'
              label={appI18n.agentWorkbench.taskDraft.directMode}
              detail={appI18n.agentWorkbench.taskDraft.directModeDetail}
              active={!draftRequiresApproval}
              activeBadgeLabel={appI18n.agentWorkbench.taskDraft.activeBadge}
              inactiveBadgeLabel={appI18n.agentWorkbench.taskDraft.availableBadge}
              onPress={onSelectDirectMode}
              style={screenStyles.choiceChip}
            />
            <ChoiceChip
              testID='agent-workbench.task.mode.approval'
              label={appI18n.agentWorkbench.taskDraft.approvalMode}
              detail={appI18n.agentWorkbench.taskDraft.approvalModeDetail}
              active={draftRequiresApproval}
              activeBadgeLabel={appI18n.agentWorkbench.taskDraft.activeBadge}
              inactiveBadgeLabel={appI18n.agentWorkbench.taskDraft.availableBadge}
              onPress={onSelectApprovalMode}
              style={screenStyles.choiceChip}
            />
          </View>

          <ActionButton
            testID='agent-workbench.action.populate-write-approval-draft'
            label={appI18n.agentWorkbench.actions.populateWriteApprovalDraft}
            onPress={onPopulateWriteApprovalDraft}
            disabled={
              !trustedWorkspace ||
              activeRunInfo !== null ||
              approvalBusy !== null ||
              taskDraftBusy !== null
            }
            tone='ghost'
          />

          {!draftRequiresApproval && draftTask && !draftTask.canRunDirect ? (
            <InfoPanel
              title={appI18n.agentWorkbench.taskDraft.directModeGuardTitle}
              tone='accent'>
              <Text
                style={[
                  screenStyles.sectionDescription,
                  {color: palette.inkMuted},
                ]}>
                {appI18n.agentWorkbench.taskDraft.directModeGuardDetail}
              </Text>
            </InfoPanel>
          ) : null}

          <ActionButton
            testID='agent-workbench.action.start-draft-task'
            label={
              draftRequiresApproval
                ? taskDraftBusy === 'requesting'
                  ? appI18n.agentWorkbench.actions.requestingDraftApproval
                  : appI18n.agentWorkbench.actions.requestDraftApproval
                : taskDraftBusy === 'running'
                  ? appI18n.agentWorkbench.actions.runningDraftTask
                  : appI18n.agentWorkbench.actions.runDraftTask
            }
            onPress={onStartDraftTask}
            disabled={
              !textInputsReady ||
              !trustedWorkspace ||
              activeRunInfo !== null ||
              approvalBusy !== null ||
              taskDraftBusy !== null ||
              draftTask === null ||
              (!draftRequiresApproval && !draftTask.canRunDirect)
            }
          />
        </View>
      )}
    </View>
  );
}
