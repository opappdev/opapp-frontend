import React from 'react';
import {Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ChoiceChip,
  EmptyState,
  useTheme,
} from '@opapp/ui-native-primitives';
import type {TrustedWorkspaceTarget, WorkspaceEntry} from '@opapp/framework-filesystem';
import type {WorkspaceChoiceItem} from './agent-workbench-model';
import {
  formatSizeBytes,
  formatWorkspaceSelection,
} from './agent-workbench-resolvers';
import {DetailField} from './agent-workbench-components';
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
  const {palette} = useTheme();

  return (
    <View style={screenStyles.sectionCard}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.workspaceTitle}
      </Text>
      <Text style={screenStyles.sectionDescription}>
        {appI18n.agentWorkbench.sections.workspaceDescription}
      </Text>

      {!trustedWorkspace ? (
        <EmptyState
          title={appI18n.agentWorkbench.empty.workspaceTitle}
          description={appI18n.agentWorkbench.empty.workspaceDescription}
        />
      ) : (
        <View style={screenStyles.sectionBody}>
          <View style={screenStyles.detailGrid}>
            <DetailField
              label={appI18n.agentWorkbench.labels.rootPath}
              value={trustedWorkspace.rootPath}
              valueTestID='agent-workbench.detail.root-path'
            />
            <DetailField
              label={appI18n.agentWorkbench.labels.selectedCwd}
              value={formatWorkspaceSelection(
                selectedWorkspaceStat,
                trustedWorkspace,
              )}
              valueTestID='agent-workbench.detail.selected-cwd'
            />
            <DetailField
              label={appI18n.agentWorkbench.labels.currentType}
              value={
                selectedWorkspaceStat?.kind ??
                appI18n.agentWorkbench.workspace.directoryKind
              }
            />
            <DetailField
              label={appI18n.agentWorkbench.labels.size}
              value={formatSizeBytes(selectedWorkspaceStat?.sizeBytes ?? null)}
            />
          </View>
          <View style={screenStyles.choiceGrid}>
            {workspaceChoices.map(choice => (
              <ChoiceChip
                key={choice.key || 'workspace-root'}
                testID={`agent-workbench.workspace.${choice.key || 'root'}`}
                label={choice.label}
                detail={choice.detail}
                active={selectedCwd === choice.key}
                activeBadgeLabel={appI18n.agentWorkbench.workspace.currentBadge}
                inactiveBadgeLabel={appI18n.agentWorkbench.workspace.availableBadge}
                onPress={() => {
                  onBrowseDirectory(choice.key);
                }}
                style={screenStyles.choiceChip}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
