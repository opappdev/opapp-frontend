import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  useTheme,
  appSpacing,
} from '@opapp/ui-native-primitives';
import type {TrustedWorkspaceTarget, WorkspaceEntry} from '@opapp/framework-filesystem';
import {formatWorkspaceEntryMeta} from './agent-workbench-resolvers';
import type {createScreenStyles} from './agent-workbench-styles';

const COLLAPSED_LIMIT = 8;

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
  const [showAll, setShowAll] = useState(false);
  const hasOverflow = workspaceEntries.length > COLLAPSED_LIMIT;
  const visibleEntries = showAll ? workspaceEntries : workspaceEntries.slice(0, COLLAPSED_LIMIT);

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
        {visibleEntries.map(entry => {
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
        {hasOverflow ? (
          <Pressable
            onPress={() => setShowAll(prev => !prev)}
            style={({pressed}: {pressed: boolean}) => [
              screenStyles.listRow,
              pressed ? {opacity: 0.7} : null,
            ]}>
            <Text style={[screenStyles.listRowMeta, {color: palette.inkMuted, paddingVertical: appSpacing.xxs}]}>
              {showAll ? '收起' : `+ ${workspaceEntries.length - COLLAPSED_LIMIT} 更多`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
