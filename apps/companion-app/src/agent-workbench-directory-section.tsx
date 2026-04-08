import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  Icon,
  SelectableRow,
  useTheme,
  appSpacing,
} from '@opapp/ui-native-primitives';
import type {TrustedWorkspaceTarget, WorkspaceEntry} from '@opapp/framework-filesystem';
import {formatWorkspaceEntryMeta, resolveWorkspaceEntryIcon} from './agent-workbench-resolvers';
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
      <View accessibilityRole='list' style={screenStyles.threadList}>
        {visibleEntries.map(entry => {
          const isActive =
            selectedInspectorEntry?.relativePath === entry.relativePath;
          return (
            <SelectableRow
              key={entry.relativePath || entry.name}
              selected={isActive}
              onPress={() => {
                onInspectEntry(entry);
              }}
              leading={
                <Icon
                  icon={resolveWorkspaceEntryIcon(entry)}
                  size={12}
                  color={isActive ? palette.accent : palette.inkSoft}
                />
              }
              title={entry.name}
              titleStyle={{
                fontWeight: entry.kind === 'directory' ? '600' : undefined,
              }}
              trailing={
                <Text
                  style={[
                    screenStyles.listRowMeta,
                    {color: palette.inkSoft},
                  ]}
                  numberOfLines={1}>
                  {formatWorkspaceEntryMeta(entry)}
                </Text>
              }
            />
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
