import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  Icon,
  InfoPanel,
  useTheme,
  iconCatalog,
} from '@opapp/ui-native-primitives';
import type {TrustedWorkspaceTarget} from '@opapp/framework-filesystem';
import type {
  WorkbenchTaskDraft,
  WorkbenchWorkspaceRecoveryTarget,
} from './agent-workbench-model';
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
  workspaceRootDraft: string;
  workspaceRecoveryTarget: WorkbenchWorkspaceRecoveryTarget | null;
  workspaceConfigBusy: boolean;
  onDraftGoalChange: (value: string) => void;
  onDraftCommandChange: (value: string) => void;
  onSelectDirectMode: () => void;
  onSelectApprovalMode: () => void;
  onPopulateWriteApprovalDraft: () => void;
  onRunGitStatus: () => void;
  onStartDraftTask: () => void;
  onCancelRun: () => void;
  onWorkspaceRootDraftChange: (value: string) => void;
  onTrustWorkspaceRoot: () => void;
  onClearTrustedWorkspaceRoot: () => void;
  onTrustRecoveredWorkspace: () => void;
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
  workspaceRootDraft,
  workspaceRecoveryTarget,
  workspaceConfigBusy,
  onDraftGoalChange,
  onDraftCommandChange,
  onSelectDirectMode,
  onSelectApprovalMode,
  onPopulateWriteApprovalDraft,
  onRunGitStatus,
  onStartDraftTask,
  onCancelRun,
  onWorkspaceRootDraftChange,
  onTrustWorkspaceRoot,
  onClearTrustedWorkspaceRoot,
  onTrustRecoveredWorkspace,
  screenStyles,
}: WorkbenchTaskDraftSectionProps) {
  const {palette} = useTheme();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showWorkspaceConfig, setShowWorkspaceConfig] = useState(false);
  const [showExecutionModePanel, setShowExecutionModePanel] = useState(false);
  const hadWorkspaceRef = useRef(Boolean(trustedWorkspace));

  useEffect(() => {
    const hasWorkspace = trustedWorkspace !== null;
    if (!hasWorkspace) {
      setShowWorkspaceConfig(true);
    } else if (!hadWorkspaceRef.current && hasWorkspace) {
      setShowWorkspaceConfig(false);
    }
    hadWorkspaceRef.current = hasWorkspace;
  }, [trustedWorkspace]);

  const hasTrustedWorkspace = trustedWorkspace !== null;
  const canSubmit =
    textInputsReady &&
    hasTrustedWorkspace &&
    activeRunInfo === null &&
    approvalBusy === null &&
    taskDraftBusy === null &&
    draftTask !== null &&
    (draftRequiresApproval || draftTask.canRunDirect);
  const canUseStarter =
    hasTrustedWorkspace &&
    activeRunInfo === null &&
    approvalBusy === null &&
    taskDraftBusy === null;
  const currentWorkspaceLabel =
    selectedCwd.trim() ||
    trustedWorkspace?.displayName ||
    trustedWorkspace?.rootPath ||
    appI18n.agentWorkbench.workspace.missing;
  const runtimeModeLabel = draftRequiresApproval
    ? appI18n.agentWorkbench.taskDraft.approvalRuntimeLabel
    : appI18n.agentWorkbench.taskDraft.directRuntimeLabel;
  const advancedCommandLabel = showAdvanced
    ? appI18n.agentWorkbench.taskDraft.collapseAdvancedCommand
    : appI18n.agentWorkbench.taskDraft.expandAdvancedCommand;
  const workspaceActionLabel = hasTrustedWorkspace
    ? appI18n.agentWorkbench.taskDraft.manageWorkspaceAction
    : appI18n.agentWorkbench.taskDraft.chooseWorkspaceAction;
  const showWorkspacePanel = showWorkspaceConfig || !hasTrustedWorkspace;
  const showStopAction = activeRunInfo !== null;
  const primaryActionBusy = !showStopAction && taskDraftBusy !== null;
  const primaryActionDisabled = showStopAction ? false : !canSubmit;
  const primaryActionIcon = showStopAction ? iconCatalog.stop : iconCatalog.send;
  const primaryActionLabel = showStopAction
    ? appI18n.agentWorkbench.actions.cancelRun
    : taskDraftBusy === null
      ? appI18n.agentWorkbench.actions.runDraftTask
      : appI18n.agentWorkbench.actions.runningDraftTask;
  const primaryActionTone = showStopAction ? palette.errorRed : palette.accent;
  const primaryActionBackgroundColor = primaryActionBusy
    ? primaryActionTone
    : primaryActionDisabled
      ? palette.canvasShade
      : primaryActionTone;
  const primaryActionBorderColor = primaryActionBusy
    ? primaryActionTone
    : primaryActionDisabled
      ? palette.border
      : primaryActionTone;
  const primaryActionForegroundColor =
    primaryActionBusy || !primaryActionDisabled ? palette.canvas : palette.inkSoft;

  return (
    <View style={screenStyles.composerBar}>
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

      <View style={screenStyles.composerAssistRow}>
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
        </View>

        <View style={screenStyles.composerAssistCluster}>
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
          <View style={screenStyles.composerShellFooterMeta}>
            <Text
              style={[
                screenStyles.composerRuntimeMeta,
                {color: palette.inkSoft},
              ]}
              numberOfLines={1}>
              {primaryActionLabel}
            </Text>
          </View>
          <Pressable
            testID='agent-workbench.action.start-draft-task'
            accessibilityRole='button'
            accessibilityLabel={primaryActionLabel}
            onPress={showStopAction ? onCancelRun : onStartDraftTask}
            disabled={primaryActionDisabled}
            style={({pressed}) => [
              screenStyles.composerPrimaryAction,
              {
                backgroundColor: primaryActionBackgroundColor,
                borderColor: primaryActionBorderColor,
              },
              pressed && !primaryActionDisabled
                ? screenStyles.composerPrimaryActionPressed
                : null,
            ]}>
            {primaryActionBusy ? (
              <ActivityIndicator size='small' color={primaryActionForegroundColor} />
            ) : (
              <Icon
                icon={primaryActionIcon}
                size={15}
                color={primaryActionForegroundColor}
              />
            )}
          </Pressable>
        </View>
      </View>

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

          <Pressable
            testID='agent-workbench.action.toggle-execution-mode'
            accessibilityRole='button'
            onPress={() => {
              setShowExecutionModePanel(prev => !prev);
              setShowWorkspaceConfig(false);
            }}
            style={[
              screenStyles.composerChip,
              screenStyles.composerRuntimeChip,
              {
                backgroundColor:
                  showExecutionModePanel || draftRequiresApproval
                    ? palette.panelEmphasis
                    : palette.canvasShade,
                borderColor:
                  showExecutionModePanel || draftRequiresApproval
                    ? palette.accent
                    : palette.border,
              },
            ]}>
            <Icon
              icon={draftRequiresApproval ? iconCatalog.shieldTask : iconCatalog.play}
              size={12}
              color={
                showExecutionModePanel || draftRequiresApproval
                  ? palette.accent
                  : palette.inkSoft
              }
            />
            <Text
              style={[
                screenStyles.composerChipLabel,
                {
                  color:
                    showExecutionModePanel || draftRequiresApproval
                      ? palette.accent
                      : palette.inkSoft,
                },
              ]}>
              {runtimeModeLabel}
            </Text>
          </Pressable>

          <Pressable
            testID='agent-workbench.action.toggle-workspace-config'
            accessibilityRole='button'
            onPress={() => {
              setShowWorkspaceConfig(prev => !prev);
              setShowExecutionModePanel(false);
            }}
            style={[
              screenStyles.composerChip,
              screenStyles.composerRuntimeChip,
              {
                backgroundColor:
                  showWorkspacePanel || !hasTrustedWorkspace
                    ? palette.panelEmphasis
                    : palette.canvasShade,
                borderColor:
                  showWorkspacePanel || !hasTrustedWorkspace
                    ? palette.accent
                    : palette.border,
              },
            ]}>
            <Icon
              icon={hasTrustedWorkspace ? iconCatalog.folder : iconCatalog.folderOpen}
              size={12}
              color={
                showWorkspacePanel || !hasTrustedWorkspace
                  ? palette.accent
                  : palette.inkSoft
              }
            />
            <Text
              style={[
                screenStyles.composerChipLabel,
                screenStyles.composerRuntimeWorkspaceLabel,
                {
                  color:
                    showWorkspacePanel || !hasTrustedWorkspace
                      ? palette.accent
                      : palette.inkSoft,
                },
              ]}
              numberOfLines={1}>
              {hasTrustedWorkspace ? currentWorkspaceLabel : workspaceActionLabel}
            </Text>
          </Pressable>
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

      {showExecutionModePanel ? (
        <View
          style={[
            screenStyles.workspaceSetupCard,
            {
              borderColor: palette.border,
              backgroundColor: palette.panel,
            },
          ]}>
          <Text style={[screenStyles.inputLabel, {color: palette.inkSoft}]}>
            {appI18n.agentWorkbench.taskDraft.executionModePanelTitle}
          </Text>
          <Text style={[screenStyles.sectionDescription, {color: palette.inkMuted}]}>
            {appI18n.agentWorkbench.taskDraft.executionModePanelDescription}
          </Text>
          <View style={screenStyles.choiceGrid}>
            <Pressable
              testID='agent-workbench.task.mode.direct'
              accessibilityRole='button'
              onPress={() => {
                onSelectDirectMode();
                setShowExecutionModePanel(false);
              }}
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
              accessibilityRole='button'
              onPress={() => {
                onSelectApprovalMode();
                setShowExecutionModePanel(false);
              }}
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
        </View>
      ) : null}

      {showWorkspacePanel ? (
        <View
          style={[
            screenStyles.workspaceSetupCard,
            {
              borderColor: palette.border,
              backgroundColor: palette.panel,
            },
          ]}>
          <Text style={[screenStyles.inputLabel, {color: palette.inkSoft}]}>
            {hasTrustedWorkspace
              ? appI18n.agentWorkbench.workspace.currentRootLabel
              : appI18n.agentWorkbench.taskDraft.chooseWorkspaceAction}
          </Text>

          {hasTrustedWorkspace ? (
            <Text
              style={[screenStyles.infoText, {color: palette.ink}]}
              numberOfLines={2}>
              {trustedWorkspace.rootPath}
            </Text>
          ) : (
            <Text style={[screenStyles.sectionDescription, {color: palette.inkMuted}]}>
              {appI18n.agentWorkbench.empty.workspaceDescription}
            </Text>
          )}

          {!hasTrustedWorkspace && workspaceRecoveryTarget ? (
            <View style={screenStyles.actionRow}>
              <ActionButton
                testID='agent-workbench.action.trust-recovered-workspace-root'
                label={
                  workspaceConfigBusy
                    ? appI18n.agentWorkbench.workspace.savingRootAction
                    : appI18n.agentWorkbench.workspace.recoveryAction
                }
                onPress={onTrustRecoveredWorkspace}
                disabled={workspaceConfigBusy}
                tone='ghost'
              />
            </View>
          ) : null}

          <View style={screenStyles.inputFieldGroup}>
            <Text style={[screenStyles.inputLabel, {color: palette.inkSoft}]}>
              {appI18n.agentWorkbench.workspace.rootInputLabel}
            </Text>
            {textInputsReady ? (
              <View
                style={[
                  screenStyles.textInputShell,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.canvasShade,
                  },
                ]}>
                <RNTextInput
                  testID='agent-workbench.workspace.root-input'
                  value={workspaceRootDraft}
                  onChangeText={onWorkspaceRootDraftChange}
                  placeholder={appI18n.agentWorkbench.workspace.rootInputPlaceholder}
                  placeholderTextColor={palette.inkSoft}
                  style={[screenStyles.textInputField, {color: palette.ink}]}
                />
              </View>
            ) : (
              <View
                style={[
                  screenStyles.textInputPlaceholder,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.canvasShade,
                  },
                ]}>
                <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
                  {appI18n.agentWorkbench.workspace.rootInputPlaceholder}
                </Text>
              </View>
            )}
          </View>

          <View style={screenStyles.actionRow}>
            <ActionButton
              testID='agent-workbench.action.set-trusted-workspace-root'
              label={
                workspaceConfigBusy
                  ? appI18n.agentWorkbench.workspace.savingRootAction
                  : hasTrustedWorkspace
                    ? appI18n.agentWorkbench.workspace.updateRootAction
                    : appI18n.agentWorkbench.workspace.saveRootAction
              }
              onPress={onTrustWorkspaceRoot}
              disabled={workspaceConfigBusy}
              tone='ghost'
            />
            {hasTrustedWorkspace ? (
              <ActionButton
                testID='agent-workbench.action.clear-trusted-workspace-root'
                label={
                  workspaceConfigBusy
                    ? appI18n.agentWorkbench.workspace.clearingRootAction
                    : appI18n.agentWorkbench.workspace.clearRootAction
                }
                onPress={onClearTrustedWorkspaceRoot}
                disabled={workspaceConfigBusy}
                tone='ghost'
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
