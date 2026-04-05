import React from 'react';
import {Pressable, Text, TextInput as RNTextInput, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  useTheme,
} from '@opapp/ui-native-primitives';
import type {TrustedWorkspaceTarget, WorkspaceEntry} from '@opapp/framework-filesystem';
import {formatWorkspaceEntryMeta} from './agent-workbench-resolvers';
import type {createScreenStyles} from './agent-workbench-styles';

type WorkbenchSearchSectionProps = {
  trustedWorkspace: TrustedWorkspaceTarget | null;
  textInputsReady: boolean;
  searchQuery: string;
  searching: boolean;
  searchResults: ReadonlyArray<WorkspaceEntry>;
  selectedInspectorEntry: WorkspaceEntry | null;
  onSearchQueryChange: (text: string) => void;
  onSearch: () => void;
  onInspectEntry: (entry: WorkspaceEntry) => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchSearchSection({
  trustedWorkspace,
  textInputsReady,
  searchQuery,
  searching,
  searchResults,
  selectedInspectorEntry,
  onSearchQueryChange,
  onSearch,
  onInspectEntry,
  screenStyles,
}: WorkbenchSearchSectionProps) {
  const {palette} = useTheme();

  return (
    <View style={screenStyles.sectionCardCompact}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.searchTitle}
      </Text>

      {!trustedWorkspace ? (
        <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
          {appI18n.agentWorkbench.empty.searchDescription}
        </Text>
      ) : (
        <View style={screenStyles.sectionBody}>
          {textInputsReady ? (
            <View
              style={[
                screenStyles.textInputShell,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}>
              <RNTextInput
                testID='agent-workbench.search.input'
                value={searchQuery}
                onChangeText={onSearchQueryChange}
                placeholder={appI18n.agentWorkbench.search.placeholder}
                placeholderTextColor={palette.inkSoft}
                style={[
                  screenStyles.textInputField,
                  {
                    color: palette.ink,
                  },
                ]}
              />
            </View>
          ) : (
            <View
              style={[
                screenStyles.textInputPlaceholder,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}>
              <Text style={[screenStyles.infoText, {color: palette.inkMuted}]}>
                {appI18n.agentWorkbench.search.placeholder}
              </Text>
            </View>
          )}
          <ActionButton
            label={
              searching
                ? appI18n.agentWorkbench.actions.searching
                : appI18n.agentWorkbench.actions.search
            }
            onPress={onSearch}
            disabled={
              !textInputsReady ||
              searching ||
              searchQuery.trim().length === 0
            }
            tone='ghost'
          />
          {searchResults.length === 0 ? (
            <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
              {appI18n.agentWorkbench.empty.searchDescription}
            </Text>
          ) : (
            <View style={screenStyles.threadList}>
              {searchResults.map(entry => {
                const isActive =
                  selectedInspectorEntry?.relativePath === entry.relativePath;
                return (
                  <Pressable
                    key={`${entry.relativePath}:${entry.kind}`}
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
                        {color: isActive ? palette.accent : palette.ink},
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
          )}
        </View>
      )}
    </View>
  );
}
