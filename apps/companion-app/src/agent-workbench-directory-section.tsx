import React from 'react';
import {Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ChoiceChip,
  EmptyState,
} from '@opapp/ui-native-primitives';
import type {TrustedWorkspaceTarget, WorkspaceEntry} from '@opapp/framework-filesystem';
import {formatWorkspaceEntryMeta} from './agent-workbench-resolvers';
import type {createScreenStyles} from './agent-workbench-styles';

type WorkbenchDirectorySectionProps = {
  trustedWorkspace: TrustedWorkspaceTarget | null;
  workspaceEntries: ReadonlyArray<WorkspaceEntry>;
  selectedInspectorEntry: WorkspaceEntry | null;
  onInspectEntry: (entry: WorkspaceEntry) => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchDirectorySection({
  trustedWorkspace,
  workspaceEntries,
  selectedInspectorEntry,
  onInspectEntry,
  screenStyles,
}: WorkbenchDirectorySectionProps) {
  return (
    <View style={screenStyles.sectionCard}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.directoryTitle}
      </Text>
      <Text style={screenStyles.sectionDescription}>
        {appI18n.agentWorkbench.sections.directoryDescription}
      </Text>

      {!trustedWorkspace ? (
        <EmptyState
          title={appI18n.agentWorkbench.empty.directoryTitle}
          description={appI18n.agentWorkbench.empty.directoryDescription}
        />
      ) : workspaceEntries.length === 0 ? (
        <EmptyState
          title={appI18n.agentWorkbench.empty.directoryTitle}
          description={appI18n.agentWorkbench.empty.directoryDescription}
        />
      ) : (
        <View style={screenStyles.threadList}>
          {workspaceEntries.map(entry => (
            <ChoiceChip
              key={entry.relativePath || entry.name}
              label={entry.name}
              detail={entry.relativePath || appI18n.agentWorkbench.workspace.rootLabel}
              meta={formatWorkspaceEntryMeta(entry)}
              active={
                selectedInspectorEntry?.relativePath === entry.relativePath
              }
              activeBadgeLabel={appI18n.agentWorkbench.inspector.selectedBadge}
              inactiveBadgeLabel={appI18n.agentWorkbench.inspector.availableBadge}
              onPress={() => {
                onInspectEntry(entry);
              }}
              style={screenStyles.choiceChip}
            />
          ))}
        </View>
      )}
    </View>
  );
}
