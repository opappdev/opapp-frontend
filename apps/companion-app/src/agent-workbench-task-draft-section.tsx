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
  selectedCwd: string;
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
  onRunGitStatus: () => void;
  onStartDraftTask: () => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchTaskDraftSection({
  trustedWorkspace,
  selectedCwd,
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
  onRunGitStatus,
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
  const canUseStarter =
    trustedWorkspace &&
    activeRunInfo === null &&
    approvalBusy === null &&
    taskDraftBusy === null;
  const currentWorkspaceLabel =
    selectedCwd.trim() ||
    trustedWorkspace.displayName ||
    appI18n.agentWorkbench.workspace.rootLabel;
  const runtimeModeLabel = draftRequiresApproval
    ? appI18n.agentWorkbench.taskDraft.approvalRuntimeLabel
    : appI18n.agentWorkbench.taskDraft.directRuntimeLabel;
  const advancedCommandLabel = showAdvanced
    ? appI18n.agentWorkbench.taskDraft.collapseAdvancedCommand
    : appI18n.agentWorkbench.taskDraft.expandAdvancedCommand;

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

      {/* ─── Layer 1: Context / starter rail ─── */}
      <View style={screenStyles.composerAssistRow}>
        <View style={screenStyles.composerAssistCluster}>
          <View
            style={[
              screenStyles.composerChip,
              screenStyles.composerContextChip,
              {
                backgroundColor: palette.panel,
                borderColor: palette.border,
              },
            ]}>
            <Icon icon={iconCatalog.folderOpen} size={12} color={palette.inkSoft} />
            <Text
              style={[
                screenStyles.composerChipLabel,
                screenStyles.composerContextChipLabel,
                {color: palette.inkMuted},
              ]}
              numberOfLines={1}>
              {appI18n.agentWorkbench.taskDraft.selectedWorkspacePrefix}
              {currentWorkspaceLabel}
            </Text>
          </View>
        </View>

        <View style={screenStyles.composerAssistCluster}>
          <Pressable
            testID='agent-workbench.action.run-git-status'
            accessibilityRole='button'
            onPress={onRunGitStatus}
            disabled={!canUseStarter}
            style={[
              screenStyles.composerChip,
              screenStyles.composerStarterChip,
              {
                backgroundColor: palette.canvasShade,
                borderColor: palette.border,
              },
              !canUseStarter ? {opacity: 0.45} : null,
            ]}>
            <Icon icon={iconCatalog.terminal} size={12} color={palette.inkSoft} />
            <Text
              style={[
                screenStyles.composerChipLabel,
                screenStyles.composerStarterChipLabel,
                {color: palette.inkSoft},
              ]}>
              {appI18n.agentWorkbench.actions.runGitStatus}
            </Text>
          </Pressable>

          <Pressable
            testID='agent-workbench.action.populate-write-approval-draft'
            accessibilityRole='button'
            onPress={onPopulateWriteApprovalDraft}
            disabled={!canUseStarter}
            style={[
              screenStyles.composerChip,
              screenStyles.composerStarterChip,
              {
                backgroundColor: palette.canvasShade,
                borderColor: palette.border,
              },
              !canUseStarter ? {opacity: 0.45} : null,
            ]}>
            <Icon icon={iconCatalog.shieldTask} size={12} color={palette.inkSoft} />
            <Text
              style={[
                screenStyles.composerChipLabel,
                screenStyles.composerStarterChipLabel,
                {color: palette.inkSoft},
              ]}>
              {appI18n.agentWorkbench.actions.populateWriteApprovalDraft}
            </Text>
          </Pressable>

          <Pressable
            testID='agent-workbench.action.toggle-command-input'
            accessibilityRole='button'
            onPress={() => {
              setShowAdvanced(prev => !prev);
            }}
            style={[
              screenStyles.composerChip,
              screenStyles.composerStarterChip,
              {
                backgroundColor: showAdvanced
                  ? palette.panelEmphasis
                  : palette.canvasShade,
                borderColor: showAdvanced ? palette.accent : palette.border,
              },
            ]}>
            <Icon
              icon={iconCatalog.code}
              size={12}
              color={showAdvanced ? palette.accent : palette.inkSoft}
            />
            <Text
              style={[
                screenStyles.composerChipLabel,
                screenStyles.composerStarterChipLabel,
                showAdvanced
                  ? {color: palette.accent, fontWeight: '600'}
                  : {color: palette.inkSoft},
              ]}>
              {advancedCommandLabel}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Layer 2: Main input ─── */}
      <View
        style={[
          screenStyles.composerShell,
          {
            borderColor: palette.border,
            backgroundColor: palette.panel,
          },
        ]}>
        {textInputsReady ? (
          <RNTextInput
            testID='agent-workbench.task.goal-input'
            value={draftGoal}
            onChangeText={onDraftGoalChange}
            placeholder={appI18n.agentWorkbench.taskDraft.goalPlaceholder}
            placeholderTextColor={palette.inkSoft}
            multiline
            numberOfLines={4}
            textAlignVertical='top'
            style={[
              screenStyles.textInputField,
              screenStyles.composerPromptInput,
              {color: palette.ink},
            ]}
          />
        ) : (
          <View
            style={[
              screenStyles.textInputPlaceholder,
              screenStyles.composerPromptPlaceholder,
              {
                borderColor: 'transparent',
                backgroundColor: 'transparent',
              },
            ]}>
            <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
              {appI18n.agentWorkbench.taskDraft.goalPlaceholder}
            </Text>
          </View>
        )}

        <View
          style={[
            screenStyles.composerShellDivider,
            {backgroundColor: palette.border},
          ]}
        />

        <View style={screenStyles.composerShellFooter}>
          <View style={screenStyles.composerModeCluster}>
            <Pressable
              testID='agent-workbench.task.mode.direct'
              onPress={onSelectDirectMode}
              style={[
                screenStyles.composerChip,
                screenStyles.composerModeChip,
                !draftRequiresApproval
                  ? {
                      backgroundColor: palette.panelEmphasis,
                      borderColor: palette.accent,
                    }
                  : {
                      backgroundColor: palette.canvasShade,
                      borderColor: palette.border,
                    },
              ]}>
              <Icon
                icon={iconCatalog.play}
                size={12}
                color={!draftRequiresApproval ? palette.accent : palette.inkSoft}
              />
              <Text
                style={[
                  screenStyles.composerChipLabel,
                  screenStyles.composerModeChipLabel,
                  !draftRequiresApproval
                    ? {color: palette.accent, fontWeight: '600'}
                    : {color: palette.inkSoft},
                ]}>
                {appI18n.agentWorkbench.taskDraft.directMode}
              </Text>
            </Pressable>

            <Pressable
              testID='agent-workbench.task.mode.approval'
              onPress={onSelectApprovalMode}
              style={[
                screenStyles.composerChip,
                screenStyles.composerModeChip,
                draftRequiresApproval
                  ? {
                      backgroundColor: palette.panelEmphasis,
                      borderColor: palette.accent,
                    }
                  : {
                      backgroundColor: palette.canvasShade,
                      borderColor: palette.border,
                    },
              ]}>
              <Icon
                icon={iconCatalog.shieldTask}
                size={12}
                color={draftRequiresApproval ? palette.accent : palette.inkSoft}
              />
              <Text
                style={[
                  screenStyles.composerChipLabel,
                  screenStyles.composerModeChipLabel,
                  draftRequiresApproval
                    ? {color: palette.accent, fontWeight: '600'}
                    : {color: palette.inkSoft},
                ]}>
                {appI18n.agentWorkbench.taskDraft.approvalMode}
              </Text>
            </Pressable>
          </View>

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
            icon={
              draftRequiresApproval ? iconCatalog.shieldTask : iconCatalog.send
            }
          />
        </View>
      </View>

      {/* ─── Layer 3: Advanced command input (progressive disclosure) ─── */}
      {showAdvanced ? (
        textInputsReady ? (
          <View
            style={[
              screenStyles.composerAdvancedPanel,
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
                screenStyles.composerAdvancedInput,
                {color: palette.ink},
              ]}
            />
          </View>
        ) : (
          <View
            style={[
              screenStyles.textInputPlaceholder,
              screenStyles.composerAdvancedPanel,
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

      {/* ─── Layer 4: Runtime contract row ─── */}
      <View style={screenStyles.composerRuntimeRow}>
        <View style={screenStyles.composerRuntimeCluster}>
          <View
            style={[
              screenStyles.composerChip,
              screenStyles.composerRuntimeChip,
              {
                backgroundColor: palette.canvasShade,
                borderColor: palette.border,
              },
            ]}>
            <Icon icon={iconCatalog.code} size={12} color={palette.inkSoft} />
            <Text style={[screenStyles.composerChipLabel, {color: palette.inkSoft}]}>
              {appI18n.agentWorkbench.taskDraft.localRuntimeLabel}
            </Text>
          </View>

          <View
            style={[
              screenStyles.composerChip,
              screenStyles.composerRuntimeChip,
              {
                backgroundColor: palette.canvasShade,
                borderColor: draftRequiresApproval ? palette.accent : palette.border,
              },
            ]}>
            <Icon
              icon={draftRequiresApproval ? iconCatalog.shieldTask : iconCatalog.play}
              size={12}
              color={draftRequiresApproval ? palette.accent : palette.inkSoft}
            />
            <Text
              style={[
                screenStyles.composerChipLabel,
                {color: draftRequiresApproval ? palette.accent : palette.inkSoft},
              ]}>
              {runtimeModeLabel}
            </Text>
          </View>

          <View
            style={[
              screenStyles.composerChip,
              screenStyles.composerRuntimeChip,
              {
                backgroundColor: palette.canvasShade,
                borderColor: palette.border,
              },
            ]}>
            <Icon icon={iconCatalog.folder} size={12} color={palette.inkSoft} />
            <Text
              style={[
                screenStyles.composerChipLabel,
                screenStyles.composerRuntimeWorkspaceLabel,
                {color: palette.inkSoft},
              ]}
              numberOfLines={1}>
              {currentWorkspaceLabel}
            </Text>
          </View>
        </View>

        <Text
          style={[
            screenStyles.composerRuntimeMeta,
            {color: palette.inkSoft},
          ]}
          numberOfLines={1}>
          {appI18n.agentWorkbench.taskDraft.contextUsagePending}
        </Text>
      </View>
    </View>
  );
}
