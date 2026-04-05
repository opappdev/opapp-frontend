import React, {useState} from 'react';
import {Pressable, Text, TextInput as RNTextInput, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  InfoPanel,
  useTheme,
  appSpacing,
  appRadius,
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!trustedWorkspace) {
    return null;
  }

  const canSubmit =
    textInputsReady &&
    trustedWorkspace &&
    activeRunInfo === null &&
    approvalBusy === null &&
    taskDraftBusy === null &&
    draftTask !== null &&
    (draftRequiresApproval || draftTask.canRunDirect);

  return (
    <View style={screenStyles.composerBar}>
      {/* Direct mode guard */}
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

      {/* Primary input: goal (task description) — always visible */}
      <View style={screenStyles.composerInputRow}>
        {textInputsReady ? (
          <View
            style={[
              screenStyles.textInputShell,
              {
                flex: 1,
                borderColor: palette.border,
                backgroundColor: palette.canvasShade,
              },
            ]}>
            <RNTextInput
              testID='agent-workbench.task.goal-input'
              value={draftGoal}
              onChangeText={onDraftGoalChange}
              placeholder={appI18n.agentWorkbench.taskDraft.goalPlaceholder}
              placeholderTextColor={palette.inkSoft}
              style={[
                screenStyles.textInputField,
                {color: palette.ink},
              ]}
            />
          </View>
        ) : (
          <View
            style={[
              screenStyles.textInputPlaceholder,
              {
                flex: 1,
                borderColor: palette.border,
                backgroundColor: palette.canvasShade,
              },
            ]}>
            <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
              {appI18n.agentWorkbench.taskDraft.goalPlaceholder}
            </Text>
          </View>
        )}

        {/* Submit button inline with input */}
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
          disabled={!canSubmit}
        />
      </View>

      {/* Secondary controls row — progressive disclosure */}
      <View style={screenStyles.composerActionsRow}>
        {/* Mode toggle */}
        <View style={screenStyles.modeToggleRow}>
          <Pressable
            testID='agent-workbench.task.mode.direct'
            onPress={onSelectDirectMode}
            style={[
              screenStyles.modeToggleItem,
              !draftRequiresApproval ? screenStyles.modeToggleItemActive : null,
            ]}>
            <Text
              style={[
                screenStyles.modeToggleLabel,
                !draftRequiresApproval ? screenStyles.modeToggleLabelActive : null,
              ]}>
              {appI18n.agentWorkbench.taskDraft.directMode}
            </Text>
          </Pressable>
          <Pressable
            testID='agent-workbench.task.mode.approval'
            onPress={onSelectApprovalMode}
            style={[
              screenStyles.modeToggleItem,
              draftRequiresApproval ? screenStyles.modeToggleItemActive : null,
            ]}>
            <Text
              style={[
                screenStyles.modeToggleLabel,
                draftRequiresApproval ? screenStyles.modeToggleLabelActive : null,
              ]}>
              {appI18n.agentWorkbench.taskDraft.approvalMode}
            </Text>
          </Pressable>
        </View>

        <Pressable
          testID='agent-workbench.action.toggle-command-input'
          accessibilityRole='button'
          onPress={() => {
            setShowAdvanced(prev => !prev);
          }}
          style={{
            paddingHorizontal: appSpacing.sm2,
            paddingVertical: appSpacing.xxs,
            borderRadius: appRadius.badge,
          }}>
          <Text style={[screenStyles.listRowMeta, {color: palette.inkSoft}]}>
            {showAdvanced ? '▾ command' : '▸ command'}
          </Text>
        </Pressable>

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

        <View style={{flex: 1}} />
      </View>

      {/* Command input — hidden by default, progressive disclosure */}
      {showAdvanced ? (
        textInputsReady ? (
          <View
            style={[
              screenStyles.textInputShell,
              screenStyles.textInputMultilineShell,
              {
                borderColor: palette.border,
                backgroundColor: palette.canvasShade,
              },
            ]}>
            <RNTextInput
              testID='agent-workbench.task.command-input'
              value={draftCommand}
              onChangeText={onDraftCommandChange}
              placeholder={appI18n.agentWorkbench.taskDraft.commandPlaceholder}
              placeholderTextColor={palette.inkSoft}
              multiline
              textAlignVertical='top'
              style={[
                screenStyles.textInputField,
                screenStyles.textInputMultiline,
                {color: palette.ink},
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
                backgroundColor: palette.canvasShade,
              },
            ]}>
            <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
              {appI18n.agentWorkbench.taskDraft.commandPlaceholder}
            </Text>
          </View>
        )
      ) : null}
    </View>
  );
}
