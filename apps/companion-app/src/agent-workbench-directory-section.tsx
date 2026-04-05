import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  useTheme,
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
  const {palette} = useTheme();

  if (!trustedWorkspace || workspaceEntries.length === 0) {
    return (
      <View style={screenStyles.sectionCardCompact}>
        <Text style={screenStyles.sectionTitle}>
          {appI18n.agentWorkbench.sections.directoryTitle}
        </Text>
        <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
          {appI18n.agentWorkbench.empty.directoryDescription}
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.sectionCardCompact}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.directoryTitle}
      </Text>
      <View style={screenStyles.threadList}>
        {workspaceEntries.map(entry => {
          const isActive =
            selectedInspectorEntry?.relativePath === entry.relativePath;
          return (
            <Pressable
              key={entry.relativePath || entry.name}
              onPress={() => {
                onInspectEntry(entry);
              }}
              style={[
                screenStyles.listRow,
                isActive && screenStyles.listRowActive,
              ]}>
              {isActive ? (
                <View style={screenStyles.listRowIndicator} />
              ) : null}
              <Text
                style={[
                  screenStyles.listRowLabel,
                  {
                    color: isActive ? palette.accent : palette.ink,
                    fontWeight: entry.kind === 'directory' ? '600' : undefined,
                  },
                ]}
                numberOfLines={1}>
                {entry.name}
              </Text>
              <Text
                style={[
                  screenStyles.listRowMeta,
                  {color: palette.inkSoft},
                ]}
                numberOfLines={1}>
                {formatWorkspaceEntryMeta(entry)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
