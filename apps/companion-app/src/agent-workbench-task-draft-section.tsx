import React, {useState} from 'react';
import {Pressable, Text, TextInput as RNTextInput, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  Icon,
  InfoPanel,
  useTheme,
  iconCatalog,
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

      {/* ─── Layer 1: Main input ─── */}
      <View style={screenStyles.composerInputRow}>
        {textInputsReady ? (
          <View
            style={[
              screenStyles.textInputShell,
              {
                flex: 1,
                borderColor: palette.border,
                backgroundColor: palette.panel,
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
                backgroundColor: palette.panel,
              },
            ]}>
            <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
              {appI18n.agentWorkbench.taskDraft.goalPlaceholder}
            </Text>
          </View>
        )}

        {/* Send button inline with input */}
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
          icon={draftRequiresApproval ? iconCatalog.shieldTask : iconCatalog.send}
        />
      </View>

      {/* ─── Layer 2: Runtime contract row ─── */}
      <View style={screenStyles.composerActionsRow}>
        {/* Environment chip — static "Local" for now */}
        <View style={[screenStyles.composerChip, {backgroundColor: palette.canvasShade}]}>
          <Icon icon={iconCatalog.code} size={11} color={palette.inkSoft} />
          <Text style={[screenStyles.composerChipLabel, {color: palette.inkSoft}]}>
            Local
          </Text>
        </View>

        {/* Mode toggle chips */}
        <Pressable
          testID='agent-workbench.task.mode.direct'
          onPress={onSelectDirectMode}
          style={[
            screenStyles.composerChip,
            !draftRequiresApproval
              ? {backgroundColor: palette.panelEmphasis, borderColor: palette.accent, borderWidth: 1}
              : {backgroundColor: palette.canvasShade},
          ]}>
          <Icon icon={iconCatalog.play} size={11} color={!draftRequiresApproval ? palette.accent : palette.inkSoft} />
          <Text
            style={[
              screenStyles.composerChipLabel,
              !draftRequiresApproval ? {color: palette.accent, fontWeight: '600'} : {color: palette.inkSoft},
            ]}>
            {appI18n.agentWorkbench.taskDraft.directMode}
          </Text>
        </Pressable>
        <Pressable
          testID='agent-workbench.task.mode.approval'
          onPress={onSelectApprovalMode}
          style={[
            screenStyles.composerChip,
            draftRequiresApproval
              ? {backgroundColor: palette.panelEmphasis, borderColor: palette.accent, borderWidth: 1}
              : {backgroundColor: palette.canvasShade},
          ]}>
          <Icon icon={iconCatalog.shieldTask} size={11} color={draftRequiresApproval ? palette.accent : palette.inkSoft} />
          <Text
            style={[
              screenStyles.composerChipLabel,
              draftRequiresApproval ? {color: palette.accent, fontWeight: '600'} : {color: palette.inkSoft},
            ]}>
            {appI18n.agentWorkbench.taskDraft.approvalMode}
          </Text>
        </Pressable>

        <View style={{flex: 1}} />

        {/* Advanced: command toggle */}
        <Pressable
          testID='agent-workbench.action.toggle-command-input'
          accessibilityRole='button'
          onPress={() => {
            setShowAdvanced(prev => !prev);
          }}
          style={[screenStyles.composerChip, {backgroundColor: palette.canvasShade}]}>
          <Icon icon={iconCatalog.code} size={11} color={palette.inkSoft} />
          <Text style={[screenStyles.composerChipLabel, {color: palette.inkSoft}]}>
            {showAdvanced ? '▾ command' : '▸ command'}
          </Text>
        </Pressable>

        {/* Quick action: populate approval draft */}
        <Pressable
          testID='agent-workbench.action.populate-write-approval-draft'
          accessibilityRole='button'
          onPress={onPopulateWriteApprovalDraft}
          disabled={
            !trustedWorkspace ||
            activeRunInfo !== null ||
            approvalBusy !== null ||
            taskDraftBusy !== null
          }
          style={[
            screenStyles.composerChip,
            {backgroundColor: palette.canvasShade},
            (!trustedWorkspace || activeRunInfo !== null || approvalBusy !== null || taskDraftBusy !== null)
              ? {opacity: 0.4} : null,
          ]}>
          <Icon icon={iconCatalog.edit} size={11} color={palette.inkSoft} />
          <Text style={[screenStyles.composerChipLabel, {color: palette.inkSoft}]}>
            {appI18n.agentWorkbench.actions.populateWriteApprovalDraft}
          </Text>
        </Pressable>
      </View>

      {/* ─── Layer 3: Advanced command input (progressive disclosure) ─── */}
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
