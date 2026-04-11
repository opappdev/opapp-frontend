import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, Pressable, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  Icon,
  MenuList,
  Popover,
  SelectableRow,
  TextInput,
  iconCatalog,
  type IconDefinition,
  useTheme,
} from '@opapp/ui-native-primitives';
import type {TrustedWorkspaceTarget} from '@opapp/framework-filesystem';
import type {WorkbenchWorkspaceRecoveryTarget} from './agent-workbench-model';
import type {createScreenStyles} from './agent-workbench-styles';

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

type WorkbenchTaskDraftRuntimeSectionProps = {
  trustedWorkspace: TrustedWorkspaceTarget | null;
  selectedCwd: string;
  draftRequiresApproval: boolean;
  pendingApprovalActive: boolean;
  collapsed: boolean;
  textInputsReady: boolean;
  workspaceRootDraft: string;
  workspaceRecoveryTarget: WorkbenchWorkspaceRecoveryTarget | null;
  workspaceConfigBusy: boolean;
  allowWorkspaceManagement: boolean;
  onSelectDirectMode: () => void;
  onSelectApprovalMode: () => void;
  onWorkspaceRootDraftChange: (value: string) => void;
  onTrustWorkspaceRoot: () => void;
  onClearTrustedWorkspaceRoot: () => void;
  onTrustRecoveredWorkspace: () => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

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

export function WorkbenchTaskDraftRuntimeSection({
  trustedWorkspace,
  selectedCwd,
  draftRequiresApproval,
  pendingApprovalActive,
  collapsed,
  textInputsReady,
  workspaceRootDraft,
  workspaceRecoveryTarget,
  workspaceConfigBusy,
  allowWorkspaceManagement,
  onSelectDirectMode,
  onSelectApprovalMode,
  onWorkspaceRootDraftChange,
  onTrustWorkspaceRoot,
  onClearTrustedWorkspaceRoot,
  onTrustRecoveredWorkspace,
  screenStyles,
}: WorkbenchTaskDraftRuntimeSectionProps) {
  const {palette} = useTheme();
  const [showWorkspaceConfig, setShowWorkspaceConfig] = useState(false);
  const [showExecutionModePanel, setShowExecutionModePanel] = useState(false);
  const [showWorkspaceActionMenu, setShowWorkspaceActionMenu] = useState(false);
  const hadWorkspaceRef = useRef(Boolean(trustedWorkspace));
  const previousCollapsedRef = useRef(false);
  const collapsedWorkspaceConfigRef = useRef(false);
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

  useEffect(() => {
    if (collapsed && !previousCollapsedRef.current) {
      collapsedWorkspaceConfigRef.current = showWorkspaceConfig;
      setShowWorkspaceConfig(false);
      setShowExecutionModePanel(false);
      setShowWorkspaceActionMenu(false);
    }

    if (!collapsed && previousCollapsedRef.current) {
      if (collapsedWorkspaceConfigRef.current) {
        setShowWorkspaceConfig(true);
      }
      collapsedWorkspaceConfigRef.current = false;
    }

    previousCollapsedRef.current = collapsed;
  }, [collapsed, showWorkspaceConfig]);

  const hasTrustedWorkspace = trustedWorkspace !== null;
  const currentWorkspaceLabel =
    selectedCwd.trim() ||
    trustedWorkspace?.displayName ||
    trustedWorkspace?.rootPath ||
    appI18n.agentWorkbench.workspace.missing;
  const showRuntimeRow = pendingApprovalActive || !collapsed;
  const runtimeModeLabel = draftRequiresApproval
    ? appI18n.agentWorkbench.taskDraft.approvalRuntimeLabel
    : appI18n.agentWorkbench.taskDraft.directRuntimeLabel;
  const workspaceActionLabel = hasTrustedWorkspace
    ? appI18n.agentWorkbench.taskDraft.manageWorkspaceAction
    : appI18n.agentWorkbench.taskDraft.chooseWorkspaceAction;
  const canManageWorkspace = allowWorkspaceManagement && hasTrustedWorkspace;
  const showWorkspacePanel =
    !hasTrustedWorkspace || (canManageWorkspace && showWorkspaceConfig);
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
    if (!showWorkspacePanel || !hasTrustedWorkspace) {
      setShowWorkspaceActionMenu(false);
    }
  }, [hasTrustedWorkspace, showWorkspacePanel]);

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
    <>
      {showRuntimeRow ? (
        <View style={screenStyles.composerRuntimeRow}>
          {pendingApprovalActive ? (
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
                <Icon
                  icon={iconCatalog.terminal}
                  size={12}
                  color={palette.inkSoft}
                />
                <Text
                  style={[screenStyles.composerChipLabel, {color: palette.inkSoft}]}>
                  {appI18n.agentWorkbench.taskDraft.localRuntimeLabel}
                </Text>
              </View>

              <View
                style={[
                  screenStyles.composerChip,
                  screenStyles.composerRuntimeChip,
                  {
                    backgroundColor: palette.panelEmphasis,
                    borderColor: palette.accent,
                  },
                ]}>
                <Icon
                  icon={iconCatalog.shieldTask}
                  size={12}
                  color={palette.accent}
                />
                <Text
                  style={[screenStyles.composerChipLabel, {color: palette.accent}]}>
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
                <Icon
                  icon={
                    hasTrustedWorkspace ? iconCatalog.folder : iconCatalog.folderOpen
                  }
                  size={12}
                  color={palette.inkSoft}
                />
                <Text
                  style={[
                    screenStyles.composerChipLabel,
                    screenStyles.composerRuntimeWorkspaceLabel,
                    {color: palette.inkSoft},
                  ]}
                  numberOfLines={1}>
                  {hasTrustedWorkspace ? currentWorkspaceLabel : workspaceActionLabel}
                </Text>
              </View>
            </View>
          ) : (
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
                <Icon
                  icon={iconCatalog.terminal}
                  size={12}
                  color={palette.inkSoft}
                />
                <Text
                  style={[screenStyles.composerChipLabel, {color: palette.inkSoft}]}>
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
                    accessibilityLabel={
                      appI18n.agentWorkbench.taskDraft.executionModePanelTitle
                    }
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
                        draftRequiresApproval
                          ? iconCatalog.shieldTask
                          : iconCatalog.play
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

              {canManageWorkspace || !hasTrustedWorkspace ? (
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
                    icon={
                      hasTrustedWorkspace ? iconCatalog.folder : iconCatalog.folderOpen
                    }
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
              ) : (
                <View
                  style={[
                    screenStyles.composerChip,
                    screenStyles.composerRuntimeChip,
                    {
                      backgroundColor: palette.canvasShade,
                      borderColor: palette.border,
                    },
                  ]}>
                  <Icon
                    icon={iconCatalog.folder}
                    size={12}
                    color={palette.inkSoft}
                  />
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
              )}
            </View>
          )}
        </View>
      ) : null}

      {!collapsed && showWorkspacePanel ? (
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

          {canManageWorkspace || !hasTrustedWorkspace ? (
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
          ) : null}
        </View>
      ) : null}
    </>
  );
}
