import React, {useEffect, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import type {
  TrustedWorkspaceTarget,
  WorkspaceEntry,
} from '@opapp/framework-filesystem';
import type {WorkspaceChoiceItem} from './agent-workbench-model';
import {formatWorkspaceSelection} from './agent-workbench-resolvers';
import type {createScreenStyles} from './agent-workbench-styles';

type WorkbenchWorkspaceSectionProps = {
  trustedWorkspace: TrustedWorkspaceTarget | null;
  selectedCwd: string;
  selectedWorkspaceStat: WorkspaceEntry | null;
  workspaceChoices: ReadonlyArray<WorkspaceChoiceItem>;
  onBrowseDirectory: (relativePath: string) => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchWorkspaceSection({
  trustedWorkspace,
  selectedCwd,
  selectedWorkspaceStat,
  workspaceChoices,
  onBrowseDirectory,
  screenStyles,
}: WorkbenchWorkspaceSectionProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!trustedWorkspace) {
      setExpanded(false);
    }
  }, [trustedWorkspace]);

  if (!trustedWorkspace) {
    return (
      <View style={screenStyles.sectionCardCompact}>
        <Text style={screenStyles.sectionDescription}>
          {appI18n.agentWorkbench.workspace.sidebarSetupHint}
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.sectionCardCompact}>
      <Pressable
        testID='agent-workbench.action.toggle-workspace-selector'
        accessibilityRole='button'
        onPress={() => {
          setExpanded(prev => !prev);
        }}
        style={screenStyles.workspaceSelector}>
        <Text
          testID='agent-workbench.detail.root-path'
          style={screenStyles.workspaceSelectorLabel}
          numberOfLines={1}>
          {formatWorkspaceSelection(selectedWorkspaceStat, trustedWorkspace)}
        </Text>
        <Text style={screenStyles.listRowMeta}>{expanded ? '收起' : '目录'}</Text>
      </Pressable>

      <View style={{height: 0, overflow: 'hidden'}}>
        <Text testID='agent-workbench.detail.selected-cwd'>
          {formatWorkspaceSelection(selectedWorkspaceStat, trustedWorkspace)}
        </Text>
      </View>

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
                    isActive
                      ? {fontWeight: '600'}
                      : screenStyles.listRowDetail,
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
