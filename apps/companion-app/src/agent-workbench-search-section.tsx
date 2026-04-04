import React from 'react';
import {Text, TextInput as RNTextInput, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  ChoiceChip,
  EmptyState,
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
        <EmptyState
          title={appI18n.agentWorkbench.empty.searchTitle}
          description={appI18n.agentWorkbench.empty.searchDescription}
        />
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
            <EmptyState
              title={appI18n.agentWorkbench.empty.searchTitle}
              description={appI18n.agentWorkbench.empty.searchDescription}
            />
          ) : (
            <View style={screenStyles.threadList}>
              {searchResults.map(entry => (
                <ChoiceChip
                  key={`${entry.relativePath}:${entry.kind}`}
                  label={entry.name}
                  detail={entry.relativePath}
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
      )}
    </View>
  );
}
