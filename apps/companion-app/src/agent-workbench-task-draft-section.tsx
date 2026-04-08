import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Platform,
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
  MenuList,
  Popover,
  SelectableRow,
  Spinner,
  TextInput,
  Tooltip,
  desktopCursor,
  useDiscretePressableState,
  useTheme,
  windowsFocusProps,
  iconCatalog,
  type IconDefinition,
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

type StarterActionButtonProps = {
  testID: string;
  label: string;
  icon: IconDefinition;
  disabled: boolean;
  active?: boolean;
  onPress: () => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

type ExecutionModeKey = 'direct' | 'approval';

type ExecutionModeSelectorOptionProps = {
  testID: string;
  label: string;
  detail: string;
  badge: string;
  icon: IconDefinition;
  selected: boolean;
  onPress: () => void;
  onKeyDown: (event: {nativeEvent: {key: string}}) => void;
  optionRef: (ref: View | null) => void;
  keyDownEvents?: readonly {code: string}[];
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

function ExecutionModeSelectorOption({
  testID,
  label,
  detail,
  badge,
  icon,
  selected,
  onPress,
  onKeyDown,
  optionRef,
  keyDownEvents,
  screenStyles,
}: ExecutionModeSelectorOptionProps) {
  const {palette} = useTheme();

  return (
    <SelectableRow
      testID={testID}
      ref={optionRef as any}
      title={label}
      subtitle={detail}
      titleStyle={screenStyles.runtimeSelectorOptionLabel}
      subtitleStyle={[
        screenStyles.runtimeSelectorOptionDetail,
        {color: selected ? palette.ink : palette.inkMuted},
      ]}
      titleNumberOfLines={2}
      leading={
        <Icon
          icon={icon}
          size={13}
          color={selected ? palette.accent : palette.inkSoft}
        />
      }
      trailing={
        <View
          style={[
            screenStyles.runtimeSelectorOptionBadge,
            {
              borderColor: selected ? palette.accent : palette.border,
              backgroundColor: selected ? palette.accentSoft : palette.panel,
            },
          ]}>
          <Text
            style={[
              screenStyles.runtimeSelectorOptionBadgeLabel,
              {color: selected ? palette.accent : palette.inkSoft},
            ]}>
            {badge}
          </Text>
        </View>
      }
      selected={selected}
      onPress={onPress}
      onKeyDown={onKeyDown as any}
      keyDownEvents={keyDownEvents}
      style={screenStyles.runtimeSelectorOption}
    />
  );
}

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
  const [showWorkspaceActionMenu, setShowWorkspaceActionMenu] = useState(false);
  const hadWorkspaceRef = useRef(Boolean(trustedWorkspace));
  const executionModeTriggerRef = useRef<View | null>(null);
  const executionModeOptionRefs = useRef<Record<ExecutionModeKey, View | null>>({
    direct: null,
    approval: null,
  });

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
  const executionModeKeyDownEvents = useMemo(
    () =>
      Platform.OS === 'windows'
        ? [
            {code: 'ArrowDown'},
            {code: 'ArrowUp'},
            {code: 'Enter'},
            {code: 'Space'},
            {code: 'Escape'},
          ]
        : undefined,
    [],
  );
  const currentExecutionMode: ExecutionModeKey = draftRequiresApproval
    ? 'approval'
    : 'direct';
  const executionModeOptions = useMemo(
    () => [
      {
        key: 'direct' as const,
        label: appI18n.agentWorkbench.taskDraft.directRuntimeLabel,
        detail: appI18n.agentWorkbench.taskDraft.directModeDetail,
        badge:
          currentExecutionMode === 'direct'
            ? appI18n.agentWorkbench.taskDraft.activeBadge
            : appI18n.agentWorkbench.taskDraft.availableBadge,
        icon: iconCatalog.play,
      },
      {
        key: 'approval' as const,
        label: appI18n.agentWorkbench.taskDraft.approvalRuntimeLabel,
        detail: appI18n.agentWorkbench.taskDraft.approvalModeDetail,
        badge:
          currentExecutionMode === 'approval'
            ? appI18n.agentWorkbench.taskDraft.activeBadge
            : appI18n.agentWorkbench.taskDraft.availableBadge,
        icon: iconCatalog.shieldTask,
      },
    ],
    [currentExecutionMode],
  );
  useEffect(() => {
    if (!showWorkspacePanel || trustedWorkspace === null) {
      setShowWorkspaceActionMenu(false);
    }
  }, [showWorkspacePanel, trustedWorkspace]);
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
  const primaryActionHint = showStopAction
    ? appI18n.agentWorkbench.taskDraft.footerRunningHint
    : draftTask && !draftRequiresApproval && !draftTask.canRunDirect
      ? appI18n.agentWorkbench.taskDraft.footerDirectBlockedHint
      : canSubmit
        ? draftRequiresApproval
          ? appI18n.agentWorkbench.taskDraft.footerApprovalReadyHint
          : appI18n.agentWorkbench.taskDraft.footerDirectReadyHint
        : appI18n.agentWorkbench.taskDraft.footerIdleHint;
  const focusExecutionModeTrigger = useCallback(() => {
    const ref = executionModeTriggerRef.current as any;
    if (ref && typeof ref.focus === 'function') {
      ref.focus();
    }
  }, []);
  const focusExecutionModeOption = useCallback((key: ExecutionModeKey) => {
    const ref = executionModeOptionRefs.current[key] as any;
    if (ref && typeof ref.focus === 'function') {
      ref.focus();
    }
  }, []);
  const closeExecutionModeSelector = useCallback(
    (restoreFocus = false) => {
      setShowExecutionModePanel(false);
      if (restoreFocus) {
        setTimeout(() => {
          focusExecutionModeTrigger();
        }, 0);
      }
    },
    [focusExecutionModeTrigger],
  );
  const openExecutionModeSelector = useCallback(
    (preferredKey: ExecutionModeKey = currentExecutionMode) => {
      setShowWorkspaceConfig(false);
      setShowWorkspaceActionMenu(false);
      setShowExecutionModePanel(true);
      setTimeout(() => {
        focusExecutionModeOption(preferredKey);
      }, 0);
    },
    [currentExecutionMode, focusExecutionModeOption],
  );
  const handleSelectExecutionMode = useCallback(
    (key: ExecutionModeKey) => {
      if (key === 'direct') {
        onSelectDirectMode();
      } else {
        onSelectApprovalMode();
      }
      closeExecutionModeSelector(true);
    },
    [closeExecutionModeSelector, onSelectApprovalMode, onSelectDirectMode],
  );
  const handleExecutionModeTriggerKeyDown = useCallback(
    (event: {nativeEvent: {key: string}}) => {
      const key = event.nativeEvent.key;
      if (key === 'ArrowDown') {
        openExecutionModeSelector(currentExecutionMode);
      } else if (key === 'ArrowUp') {
        openExecutionModeSelector('approval');
      } else if (
        key === 'Enter' ||
        key === ' ' ||
        key === 'Spacebar' ||
        key === 'Space'
      ) {
        if (showExecutionModePanel) {
          closeExecutionModeSelector();
        } else {
          openExecutionModeSelector(currentExecutionMode);
        }
      } else if (key === 'Escape') {
        closeExecutionModeSelector();
      }
    },
    [
      closeExecutionModeSelector,
      currentExecutionMode,
      openExecutionModeSelector,
      showExecutionModePanel,
    ],
  );
  const handleExecutionModeOptionKeyDown = useCallback(
    (key: ExecutionModeKey, event: {nativeEvent: {key: string}}) => {
      const pressedKey = event.nativeEvent.key;
      if (pressedKey === 'ArrowDown') {
        focusExecutionModeOption(key === 'direct' ? 'approval' : 'direct');
      } else if (pressedKey === 'ArrowUp') {
        focusExecutionModeOption(key === 'approval' ? 'direct' : 'approval');
      } else if (
        pressedKey === 'Enter' ||
        pressedKey === ' ' ||
        pressedKey === 'Spacebar' ||
        pressedKey === 'Space'
      ) {
        handleSelectExecutionMode(key);
      } else if (pressedKey === 'Escape') {
        closeExecutionModeSelector(true);
      }
    },
    [closeExecutionModeSelector, focusExecutionModeOption, handleSelectExecutionMode],
  );

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
                setShowExecutionModePanel(false);
                setShowWorkspaceActionMenu(false);
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
                  <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
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
      </View>

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
            <Icon icon={iconCatalog.terminal} size={12} color={palette.inkSoft} />
            <Text style={[screenStyles.composerChipLabel, {color: palette.inkSoft}]}>
              {appI18n.agentWorkbench.taskDraft.localRuntimeLabel}
            </Text>
          </View>

          <Popover
            visible={showExecutionModePanel}
            onDismiss={() => {
              closeExecutionModeSelector();
            }}
            placement='top'
            maxWidth={320}
            testID='agent-workbench.task.mode'
            style={screenStyles.runtimeSelectorPopover}
            anchor={
              <Pressable
                ref={(ref: View | null) => {
                  executionModeTriggerRef.current = ref;
                }}
                testID='agent-workbench.action.toggle-execution-mode'
                focusable
                accessibilityRole='button'
                accessibilityLabel={appI18n.agentWorkbench.taskDraft.executionModePanelTitle}
                accessibilityHint={
                  appI18n.agentWorkbench.taskDraft.executionModePanelDescription
                }
                accessibilityState={{expanded: showExecutionModePanel}}
                onPress={() => {
                  if (showExecutionModePanel) {
                    closeExecutionModeSelector();
                  } else {
                    openExecutionModeSelector(currentExecutionMode);
                  }
                }}
                onKeyDown={handleExecutionModeTriggerKeyDown as any}
                {...(executionModeKeyDownEvents
                  ? ({keyDownEvents: executionModeKeyDownEvents} as any)
                  : {})}
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
                  icon={
                    draftRequiresApproval ? iconCatalog.shieldTask : iconCatalog.play
                  }
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
                <Icon
                  icon={iconCatalog.chevronDown}
                  size={12}
                  color={
                    showExecutionModePanel || draftRequiresApproval
                      ? palette.accent
                      : palette.inkSoft
                  }
                />
              </Pressable>
            }>
            <MenuList style={screenStyles.runtimeSelectorMenuList}>
              {executionModeOptions.map(option => (
                <ExecutionModeSelectorOption
                  key={option.key}
                  testID={`agent-workbench.task.mode.option.${option.key}`}
                  label={option.label}
                  detail={option.detail}
                  badge={option.badge}
                  icon={option.icon}
                  selected={option.key === currentExecutionMode}
                  onPress={() => {
                    handleSelectExecutionMode(option.key);
                  }}
                  onKeyDown={event => {
                    handleExecutionModeOptionKeyDown(option.key, event);
                  }}
                  optionRef={(ref: View | null) => {
                    executionModeOptionRefs.current[option.key] = ref;
                  }}
                  keyDownEvents={executionModeKeyDownEvents}
                  screenStyles={screenStyles}
                />
              ))}
            </MenuList>
          </Popover>

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

      </View>

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
              <TextInput
                testID='agent-workbench.workspace.root-input'
                value={workspaceRootDraft}
                onChangeText={onWorkspaceRootDraftChange}
                onClear={
                  workspaceRootDraft.length > 0
                    ? () => onWorkspaceRootDraftChange('')
                    : undefined
                }
                placeholder={appI18n.agentWorkbench.workspace.rootInputPlaceholder}
                style={{width: '100%', backgroundColor: palette.canvasShade}}
              />
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
            {hasTrustedWorkspace ? (
              <View style={screenStyles.workspaceActionMenuGroup}>
                <Popover
                  visible={showWorkspaceActionMenu}
                  onDismiss={() => {
                    setShowWorkspaceActionMenu(false);
                  }}
                  placement='bottom'
                  maxWidth={280}
                  testID='agent-workbench.workspace.action-menu'
                  style={screenStyles.workspaceActionMenuShell}
                  anchor={
                    <ActionButton
                      testID='agent-workbench.action.toggle-workspace-actions'
                      label={workspaceActionLabel}
                      onPress={() => {
                        setShowWorkspaceActionMenu(prev => !prev);
                        setShowExecutionModePanel(false);
                      }}
                      disabled={workspaceConfigBusy}
                      tone='ghost'
                      icon={iconCatalog.more}
                    />
                  }>
                  <MenuList style={screenStyles.workspaceActionMenuList}>
                    <ActionButton
                      testID='agent-workbench.action.set-trusted-workspace-root'
                      label={appI18n.agentWorkbench.workspace.updateRootAction}
                      onPress={() => {
                        setShowWorkspaceActionMenu(false);
                        onTrustWorkspaceRoot();
                      }}
                      disabled={workspaceConfigBusy}
                      tone='ghost'
                      icon={iconCatalog.save}
                    />
                    <ActionButton
                      testID='agent-workbench.action.clear-trusted-workspace-root'
                      label={appI18n.agentWorkbench.workspace.clearRootAction}
                      onPress={() => {
                        setShowWorkspaceActionMenu(false);
                        onClearTrustedWorkspaceRoot();
                      }}
                      disabled={workspaceConfigBusy}
                      tone='ghost'
                      icon={iconCatalog.delete_}
                    />
                  </MenuList>
                </Popover>
              </View>
            ) : (
              <ActionButton
                testID='agent-workbench.action.set-trusted-workspace-root'
                label={
                  workspaceConfigBusy
                    ? appI18n.agentWorkbench.workspace.savingRootAction
                    : appI18n.agentWorkbench.workspace.saveRootAction
                }
                onPress={onTrustWorkspaceRoot}
                disabled={workspaceConfigBusy}
                tone='ghost'
              />
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}
