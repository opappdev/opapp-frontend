import React, {useEffect, useRef, useState} from 'react';
import {
  Pressable,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  type AgentApprovalTimelineEntry,
  type AgentRunDocument,
} from '@opapp/framework-agent-runtime';
import {
  ActionButton,
  Icon,
  InfoPanel,
  Spinner,
  Tooltip,
  desktopCursor,
  useDiscretePressableState,
  useTheme,
  windowsFocusProps,
  iconCatalog,
  type IconDefinition,
} from '@opapp/ui-native-primitives';
import {WorkbenchApprovalDockSection} from './agent-workbench-approval-dock-section';
import {WorkbenchTaskDraftRuntimeSection} from './agent-workbench-task-draft-runtime-section';
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
  selectedPendingApproval: AgentApprovalTimelineEntry | null;
  selectedRunRequest: AgentRunDocument['run']['request'] | null;
  textInputsReady: boolean;
  draftGoal: string;
  draftCommand: string;
  draftRequiresApproval: boolean;
  draftTask: WorkbenchTaskDraft | null;
  taskDraftBusy: AgentWorkbenchTaskDraftBusy;
  activeRunInfo: {threadId: string; runId: string} | null;
  pendingApprovalActive: boolean;
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
  onSubmitApprovalDecision: (decision: {
    decisionMode: 'approve-once' | 'approve-prefix' | 'reject';
    reason?: string;
  }) => void;
  onCancelRun: () => void;
  onWorkspaceRootDraftChange: (value: string) => void;
  onTrustWorkspaceRoot: () => void;
  onClearTrustedWorkspaceRoot: () => void;
  onTrustRecoveredWorkspace: () => void;
  allowWorkspaceManagement?: boolean;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

type StarterActionButtonProps = {
  testID: string;
  label: string;
  icon: IconDefinition;
  disabled: boolean;
  active?: boolean;
  onPress: () => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

function StarterActionButton({
  testID,
  label,
  icon,
  disabled,
  active = false,
  onPress,
  screenStyles,
}: StarterActionButtonProps) {
  const {palette} = useTheme();
  const {
    hovered,
    focusVisible,
    handleHoverIn,
    handleHoverOut,
    handlePointerDown,
    handlePointerUp,
    handlePressIn,
    handlePressOut,
    handleFocus,
    handleKeyDownCapture,
    handleBlur,
  } = useDiscretePressableState();
  const suppressPressForKeyboardActivationRef = useRef(false);

  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{disabled, selected: active}}
      focusable={!disabled}
      {...windowsFocusProps({nativeFocusRing: false})}
      onPress={() => {
        if (disabled) {
          return;
        }
        if (suppressPressForKeyboardActivationRef.current) {
          suppressPressForKeyboardActivationRef.current = false;
          return;
        }
        onPress();
      }}
      onKeyUp={(event: any) => {
        if (disabled) {
          return;
        }
        const key = event?.nativeEvent?.key;
        if (
          key === 'Enter' ||
          key === ' ' ||
          key === 'Space' ||
          key === 'Spacebar'
        ) {
          suppressPressForKeyboardActivationRef.current = true;
          onPress();
        }
      }}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onKeyDownCapture={handleKeyDownCapture}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      style={({pressed}: any) => [
        screenStyles.composerPresetButton,
        {
          backgroundColor: active
            ? palette.panelEmphasis
            : hovered && !pressed
              ? palette.panel
              : palette.canvasShade,
          borderColor: active
            ? palette.accent
            : hovered && !pressed
              ? palette.borderStrong
              : palette.border,
        },
        focusVisible && !disabled
          ? {borderColor: palette.focusRing, borderWidth: 2}
          : null,
        disabled ? {opacity: 0.45} : null,
        pressed && !disabled ? screenStyles.composerPresetButtonPressed : null,
        !disabled ? desktopCursor : null,
      ]}>
      <Icon
        icon={icon}
        size={12}
        color={active ? palette.accent : palette.inkMuted}
      />
      <Text
        style={[
          screenStyles.composerPresetButtonLabel,
          {
            color: active ? palette.accent : palette.ink,
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function WorkbenchTaskDraftSection({
  trustedWorkspace,
  selectedCwd,
  selectedPendingApproval,
  selectedRunRequest,
  textInputsReady,
  draftGoal,
  draftCommand,
  draftRequiresApproval,
  draftTask,
  taskDraftBusy,
  activeRunInfo,
  pendingApprovalActive,
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
  onSubmitApprovalDecision,
  onCancelRun,
  onWorkspaceRootDraftChange,
  onTrustWorkspaceRoot,
  onClearTrustedWorkspaceRoot,
  onTrustRecoveredWorkspace,
  allowWorkspaceManagement = true,
  screenStyles,
}: WorkbenchTaskDraftSectionProps) {
  const {palette} = useTheme();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const collapsedAdvancedDuringActiveRunRef = useRef(false);
  const previousActiveRunRef = useRef(false);
  const hasActiveRun = activeRunInfo !== null;
  const shouldCollapseAuxiliaryUi = hasActiveRun || pendingApprovalActive;

  useEffect(() => {
    if (shouldCollapseAuxiliaryUi && !previousActiveRunRef.current) {
      collapsedAdvancedDuringActiveRunRef.current = showAdvanced;
      setShowAdvanced(false);
    }

    if (!shouldCollapseAuxiliaryUi && previousActiveRunRef.current) {
      if (collapsedAdvancedDuringActiveRunRef.current) {
        setShowAdvanced(true);
      }
      collapsedAdvancedDuringActiveRunRef.current = false;
    }

    previousActiveRunRef.current = shouldCollapseAuxiliaryUi;
  }, [shouldCollapseAuxiliaryUi, showAdvanced]);

  const hasTrustedWorkspace = trustedWorkspace !== null;
  const canSubmit =
    textInputsReady &&
    hasTrustedWorkspace &&
    !hasActiveRun &&
    approvalBusy === null &&
    taskDraftBusy === null &&
    draftTask !== null &&
    (draftRequiresApproval || draftTask.canRunDirect);
  const canUseStarter =
    hasTrustedWorkspace &&
    !hasActiveRun &&
    approvalBusy === null &&
    taskDraftBusy === null;
  const approvalOverlayVisible =
    pendingApprovalActive && selectedPendingApproval !== null;
  const advancedCommandLabel = showAdvanced
    ? appI18n.agentWorkbench.taskDraft.collapseAdvancedCommand
    : appI18n.agentWorkbench.taskDraft.expandAdvancedCommand;
  const showStopAction = hasActiveRun;
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
  const primaryActionHint = showStopAction
    ? appI18n.agentWorkbench.taskDraft.footerRunningHint
    : draftTask && !draftRequiresApproval && !draftTask.canRunDirect
      ? appI18n.agentWorkbench.taskDraft.footerDirectBlockedHint
      : canSubmit
        ? draftRequiresApproval
          ? appI18n.agentWorkbench.taskDraft.footerApprovalReadyHint
          : appI18n.agentWorkbench.taskDraft.footerDirectReadyHint
        : appI18n.agentWorkbench.taskDraft.footerIdleHint;

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

      <View
        style={[
          screenStyles.composerShell,
          {
            borderColor: palette.border,
            backgroundColor: palette.panel,
          },
        ]}>
        <View
          pointerEvents={approvalOverlayVisible ? 'none' : 'auto'}
          importantForAccessibility={
            approvalOverlayVisible ? 'no-hide-descendants' : 'auto'
          }
          style={approvalOverlayVisible ? screenStyles.composerShellContentHidden : null}>
          <>
            {!shouldCollapseAuxiliaryUi ? (
              <>
                <View style={screenStyles.composerAssistRow}>
                  <View style={screenStyles.composerAssistCluster}>
                    <StarterActionButton
                      testID='agent-workbench.action.run-git-status'
                      label={appI18n.agentWorkbench.actions.runGitStatus}
                      icon={iconCatalog.terminal}
                      disabled={!canUseStarter}
                      onPress={onRunGitStatus}
                      screenStyles={screenStyles}
                    />
                  </View>

                  <View style={screenStyles.composerAssistCluster}>
                    <StarterActionButton
                      testID='agent-workbench.action.toggle-command-input'
                      label={advancedCommandLabel}
                      icon={iconCatalog.code}
                      disabled={false}
                      active={showAdvanced}
                      onPress={() => {
                        setShowAdvanced(prev => !prev);
                      }}
                      screenStyles={screenStyles}
                    />
                  </View>
                </View>

                <View
                  style={[
                    screenStyles.composerShellDivider,
                    {backgroundColor: palette.border},
                  ]}
                />
              </>
            ) : null}

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

            {showAdvanced ? (
              <>
                <View
                  style={[
                    screenStyles.composerShellDivider,
                    {backgroundColor: palette.border},
                  ]}
                />

                <View
                  style={[
                    screenStyles.composerAdvancedPanel,
                    {
                      backgroundColor: palette.canvasShade,
                    },
                  ]}>
                  <View style={screenStyles.composerAdvancedHeader}>
                    <View style={screenStyles.composerAdvancedHeadingCluster}>
                      <Text style={screenStyles.composerAdvancedEyebrow}>
                        {appI18n.agentWorkbench.taskDraft.advancedPanelTitle}
                      </Text>
                      <Text style={screenStyles.composerAdvancedHint}>
                        {appI18n.agentWorkbench.taskDraft.advancedPanelDescription}
                      </Text>
                    </View>

                    <View style={screenStyles.composerAdvancedPresetRow}>
                      <Text style={screenStyles.composerAdvancedEyebrow}>
                        {appI18n.agentWorkbench.taskDraft.diagnosticPresetLabel}
                      </Text>
                      <StarterActionButton
                        testID='agent-workbench.action.populate-write-approval-draft'
                        label={appI18n.agentWorkbench.actions.populateWriteApprovalDraft}
                        icon={iconCatalog.shieldTask}
                        disabled={!canUseStarter}
                        onPress={onPopulateWriteApprovalDraft}
                        screenStyles={screenStyles}
                      />
                    </View>
                  </View>

                  <Text style={screenStyles.composerAdvancedEyebrow}>
                    {appI18n.agentWorkbench.labels.command}
                  </Text>

                  {textInputsReady ? (
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
                  ) : (
                    <View
                      style={[
                        screenStyles.textInputPlaceholder,
                        {
                          borderColor: 'transparent',
                          backgroundColor: 'transparent',
                        },
                      ]}>
                      <Text
                        style={[screenStyles.infoText, {color: palette.inkMuted}]}>
                        {appI18n.agentWorkbench.taskDraft.commandPlaceholder}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : null}

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
                  numberOfLines={2}>
                  {primaryActionHint}
                </Text>
              </View>
              <Tooltip text={primaryActionLabel}>
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
                    <Spinner
                      size='sm'
                      color={primaryActionForegroundColor}
                    />
                  ) : (
                    <Icon
                      icon={primaryActionIcon}
                      size={15}
                      color={primaryActionForegroundColor}
                    />
                  )}
                </Pressable>
              </Tooltip>
            </View>
          </>
        </View>

        {approvalOverlayVisible ? (
          <View
            style={screenStyles.composerApprovalHost}
            importantForAccessibility='yes'
            collapsable={false}>
            <WorkbenchApprovalDockSection
              selectedPendingApproval={selectedPendingApproval}
              selectedRunRequest={selectedRunRequest}
              selectedCwd={selectedCwd}
              approvalBusy={approvalBusy}
              onSubmitDecision={onSubmitApprovalDecision}
              cardStyle={screenStyles.composerApprovalSheet}
              screenStyles={screenStyles}
            />
          </View>
        ) : null}
      </View>

      <WorkbenchTaskDraftRuntimeSection
        trustedWorkspace={trustedWorkspace}
        selectedCwd={selectedCwd}
        draftRequiresApproval={draftRequiresApproval}
        pendingApprovalActive={pendingApprovalActive}
        collapsed={shouldCollapseAuxiliaryUi}
        textInputsReady={textInputsReady}
        workspaceRootDraft={workspaceRootDraft}
        workspaceRecoveryTarget={workspaceRecoveryTarget}
        workspaceConfigBusy={workspaceConfigBusy}
        allowWorkspaceManagement={allowWorkspaceManagement}
        onSelectDirectMode={onSelectDirectMode}
        onSelectApprovalMode={onSelectApprovalMode}
        onWorkspaceRootDraftChange={onWorkspaceRootDraftChange}
        onTrustWorkspaceRoot={onTrustWorkspaceRoot}
        onClearTrustedWorkspaceRoot={onClearTrustedWorkspaceRoot}
        onTrustRecoveredWorkspace={onTrustRecoveredWorkspace}
        screenStyles={screenStyles}
      />
    </View>
  );
}
