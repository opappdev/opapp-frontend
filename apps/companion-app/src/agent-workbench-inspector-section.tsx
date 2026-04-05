import React from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  ChoiceChip,
  EmptyState,
  InfoPanel,
  useTheme,
} from '@opapp/ui-native-primitives';
import type {AgentTerminalShell} from '@opapp/framework-agent-runtime';
import type {WorkspaceEntry} from '@opapp/framework-filesystem';
import {
  formatSizeBytes,
  formatWorkspaceEntryMeta,
  resolveWorkspaceKindLabel,
} from './agent-workbench-resolvers';
import {type createScreenStyles, terminalFontFamily} from './agent-workbench-styles';

type WorkbenchInspectorSectionProps = {
  selectedInspectorEntry: WorkspaceEntry | null;
  selectedInspectorChildren: ReadonlyArray<WorkspaceEntry>;
  selectedInspectorContent: string | null;
  inspectorLoading: boolean;
  selectedCwd: string;
  selectedDiffPath: string | null;
  selectedDiffOutput: string | null;
  selectedDiffError: string | null;
  diffLoading: boolean;
  selectedGitDiffCommand: {
    cwd: string;
    command: string;
    shell?: AgentTerminalShell;
  } | null;
  onInspectEntry: (entry: WorkspaceEntry) => void;
  onBrowseDirectory: (relativePath: string) => void;
  onLoadDiff: () => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchInspectorSection({
  selectedInspectorEntry,
  selectedInspectorChildren,
  selectedInspectorContent,
  inspectorLoading,
  selectedCwd,
  selectedDiffPath,
  selectedDiffOutput,
  selectedDiffError,
  diffLoading,
  selectedGitDiffCommand,
  onInspectEntry,
  onBrowseDirectory,
  onLoadDiff,
  screenStyles,
}: WorkbenchInspectorSectionProps) {
  const {palette} = useTheme();

  return (
    <View style={screenStyles.sectionCardCompact}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.inspectorTitle}
      </Text>

      {!selectedInspectorEntry ? (
        <EmptyState
          title={appI18n.agentWorkbench.empty.inspectorTitle}
          description={appI18n.agentWorkbench.empty.inspectorDescription}
        />
      ) : (
        <View style={screenStyles.sectionBody}>
          <View style={screenStyles.toolCardMeta}>
            <Text style={[screenStyles.toolCardMetaItem, {color: palette.accent}]} numberOfLines={1}>
              {selectedInspectorEntry.relativePath || appI18n.agentWorkbench.workspace.rootLabel}
            </Text>
            <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkMuted}]}>
              {resolveWorkspaceKindLabel(selectedInspectorEntry.kind)}
            </Text>
            <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
              {formatSizeBytes(selectedInspectorEntry.sizeBytes)}
            </Text>
            {selectedInspectorChildren.length > 0 ? (
              <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                {`${selectedInspectorChildren.length} items`}
              </Text>
            ) : null}
          </View>

          {inspectorLoading ? (
            <View style={screenStyles.loadingInline}>
              <ActivityIndicator size='small' color={palette.accent} />
            </View>
          ) : null}

          {selectedInspectorEntry.kind === 'directory' ? (
            <View style={screenStyles.sectionBody}>
              <ActionButton
                label={appI18n.agentWorkbench.actions.openDirectory}
                onPress={() => {
                  onBrowseDirectory(selectedInspectorEntry.relativePath);
                }}
                disabled={selectedCwd === selectedInspectorEntry.relativePath}
                tone='ghost'
              />
              {selectedInspectorChildren.length === 0 ? (
                <EmptyState
                  title={appI18n.agentWorkbench.empty.directoryTitle}
                  description={
                    appI18n.agentWorkbench.empty.directoryDescription
                  }
                />
              ) : (
                <View style={screenStyles.threadList}>
                  {selectedInspectorChildren.map(entry => (
                    <ChoiceChip
                      key={`${entry.relativePath}:${entry.kind}`}
                      label={entry.name}
                      detail={entry.relativePath}
                      meta={formatWorkspaceEntryMeta(entry)}
                      active={
                        selectedInspectorEntry.relativePath ===
                        entry.relativePath
                      }
                      activeBadgeLabel={
                        appI18n.agentWorkbench.inspector.selectedBadge
                      }
                      inactiveBadgeLabel={
                        appI18n.agentWorkbench.inspector.availableBadge
                      }
                      onPress={() => {
                        onInspectEntry(entry);
                      }}
                      style={screenStyles.choiceChip}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                screenStyles.terminalBox,
                {
                  backgroundColor: palette.canvasShade,
                  borderColor: palette.border,
                },
              ]}>
              <ScrollView style={screenStyles.terminalScroll}>
                <Text
                  style={[
                    screenStyles.terminalText,
                    {
                      color: palette.ink,
                      fontFamily: terminalFontFamily,
                    },
                  ]}>
                  {selectedInspectorContent === null
                    ? appI18n.agentWorkbench.empty.contentUnavailable
                    : selectedInspectorContent ||
                      appI18n.agentWorkbench.empty.fileContent}
                </Text>
              </ScrollView>
            </View>
          )}

          {selectedInspectorEntry.kind === 'file' ? (
            <View style={screenStyles.sectionBody}>
              <Text style={screenStyles.sectionTitle}>
                {appI18n.agentWorkbench.sections.diffTitle}
              </Text>
              <Text style={screenStyles.sectionDescription}>
                {appI18n.agentWorkbench.sections.diffDescription}
              </Text>

              {selectedGitDiffCommand ? (
                <ActionButton
                  label={
                    diffLoading
                      ? appI18n.agentWorkbench.actions.loadingDiff
                      : selectedDiffPath ===
                          selectedInspectorEntry.relativePath
                        ? appI18n.agentWorkbench.actions.refreshDiff
                        : appI18n.agentWorkbench.actions.loadDiff
                  }
                  onPress={onLoadDiff}
                  disabled={diffLoading}
                  tone='ghost'
                />
              ) : null}

              {selectedDiffError ? (
                <InfoPanel
                  title={appI18n.agentWorkbench.sections.diffTitle}
                  tone='danger'>
                  <Text
                    style={[screenStyles.infoText, {color: palette.ink}]}>
                    {selectedDiffError}
                  </Text>
                </InfoPanel>
              ) : null}

              {selectedDiffError
                ? null
                : !selectedGitDiffCommand
                  ? (
                      <EmptyState
                        title={
                          appI18n.agentWorkbench.empty.diffUnavailableTitle
                        }
                        description={
                          appI18n.agentWorkbench.empty.diffUnavailableDescription
                        }
                      />
                    )
                  : selectedDiffPath !==
                        selectedInspectorEntry.relativePath
                    ? (
                        <EmptyState
                          title={appI18n.agentWorkbench.empty.diffTitle}
                          description={
                            appI18n.agentWorkbench.empty.diffDescription
                          }
                        />
                      )
                    : diffLoading && !selectedDiffOutput
                      ? (
                          <View style={screenStyles.loadingInline}>
                            <ActivityIndicator
                              size='small'
                              color={palette.accent}
                            />
                          </View>
                        )
                      : selectedDiffOutput
                        ? (
                            <View
                              style={[
                                screenStyles.terminalBox,
                                {
                                  backgroundColor: palette.canvasShade,
                                  borderColor: palette.border,
                                },
                              ]}>
                              <ScrollView style={screenStyles.terminalScroll}>
                                <Text
                                  testID='agent-workbench.diff.output'
                                  style={[
                                    screenStyles.terminalText,
                                    {
                                      color: palette.ink,
                                      fontFamily: terminalFontFamily,
                                    },
                                  ]}>
                                  {selectedDiffOutput}
                                </Text>
                              </ScrollView>
                            </View>
                          )
                        : (
                            <EmptyState
                              title={
                                appI18n.agentWorkbench.empty.diffNoChangesTitle
                              }
                              description={
                                appI18n.agentWorkbench.empty.diffNoChangesDescription
                              }
                            />
                          )}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
