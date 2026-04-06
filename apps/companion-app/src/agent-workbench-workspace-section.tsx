import React, {useState} from 'react';
import {Pressable, Text, TextInput as RNTextInput, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  EmptyState,
  useTheme,
} from '@opapp/ui-native-primitives';
import type {TrustedWorkspaceTarget, WorkspaceEntry} from '@opapp/framework-filesystem';
import type {WorkspaceChoiceItem} from './agent-workbench-model';
import type {WorkbenchWorkspaceRecoveryTarget} from './agent-workbench-model';
import {
  formatWorkspaceSelection,
} from './agent-workbench-resolvers';
import type {createScreenStyles} from './agent-workbench-styles';

type WorkbenchWorkspaceSectionProps = {
  trustedWorkspace: TrustedWorkspaceTarget | null;
  textInputsReady: boolean;
  selectedCwd: string;
  selectedWorkspaceStat: WorkspaceEntry | null;
  workspaceChoices: ReadonlyArray<WorkspaceChoiceItem>;
  workspaceRootDraft: string;
  workspaceRecoveryTarget: WorkbenchWorkspaceRecoveryTarget | null;
  workspaceConfigBusy: boolean;
  onBrowseDirectory: (relativePath: string) => void;
  onWorkspaceRootDraftChange: (value: string) => void;
  onTrustWorkspaceRoot: () => void;
  onTrustRecoveredWorkspace: () => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchWorkspaceSection({
  trustedWorkspace,
  textInputsReady,
  selectedCwd,
  selectedWorkspaceStat,
  workspaceChoices,
  workspaceRootDraft,
  workspaceRecoveryTarget,
  workspaceConfigBusy,
  onBrowseDirectory,
  onWorkspaceRootDraftChange,
  onTrustWorkspaceRoot,
  onTrustRecoveredWorkspace,
  screenStyles,
}: WorkbenchWorkspaceSectionProps) {
  const {palette} = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!trustedWorkspace) {
    return (
      <View style={screenStyles.sectionCardCompact}>
        <EmptyState
          title={appI18n.agentWorkbench.empty.workspaceTitle}
          description={appI18n.agentWorkbench.empty.workspaceDescription}
        />

        {workspaceRecoveryTarget ? (
          <View
            style={[
              screenStyles.workspaceSetupCard,
              {
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}>
            <Text style={[screenStyles.inputLabel, {color: palette.inkSoft}]}>
              {appI18n.agentWorkbench.workspace.recoveryLabel}
            </Text>
            <Text
              style={[screenStyles.infoText, {color: palette.ink}]}
              numberOfLines={2}>
              {workspaceRecoveryTarget.rootPath}
            </Text>
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
                : appI18n.agentWorkbench.workspace.saveRootAction
            }
            onPress={onTrustWorkspaceRoot}
            disabled={workspaceConfigBusy}
            tone='ghost'
          />
        </View>
      </View>
    );
  }

  return (
    <View style={screenStyles.sectionCardCompact}>
      {/* Collapsed workspace selector — tap to expand */}
      <Pressable
        testID='agent-workbench.action.toggle-workspace-selector'
        accessibilityRole='button'
        onPress={() => {
          setExpanded(prev => !prev);
        }}
        style={screenStyles.workspaceSelector}>
        <Text
          testID='agent-workbench.detail.root-path'
          style={[screenStyles.workspaceSelectorLabel]}
          numberOfLines={1}>
          {formatWorkspaceSelection(selectedWorkspaceStat, trustedWorkspace)}
        </Text>
        <Text style={[screenStyles.listRowMeta, {color: palette.inkSoft}]}>
          {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>

      {/* Hidden locator for testID compatibility */}
      <View style={{height: 0, overflow: 'hidden'}}>
        <Text testID='agent-workbench.detail.selected-cwd'>
          {formatWorkspaceSelection(selectedWorkspaceStat, trustedWorkspace)}
        </Text>
      </View>

      {/* Expanded directory list (progressive disclosure) */}
      {expanded ? (
        <View style={screenStyles.threadList}>
          {workspaceChoices.map(choice => {
            const isActive = selectedCwd === choice.key;
            return (
              <Pressable
                key={choice.key || 'workspace-root'}
                testID={`agent-workbench.workspace.${choice.key || 'root'}`}
                accessibilityRole='button'
                accessibilityState={{selected: isActive}}
                onPress={() => {
                  onBrowseDirectory(choice.key);
                }}
                style={[
                  screenStyles.listRow,
                  isActive ? screenStyles.listRowActive : null,
                ]}>
                {isActive ? <View style={screenStyles.listRowIndicator} /> : null}
                <Text
                  numberOfLines={1}
                  style={[
                    screenStyles.listRowLabel,
                    isActive ? {color: palette.ink, fontWeight: '600'} : {color: palette.inkMuted},
                  ]}>
                  {choice.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
