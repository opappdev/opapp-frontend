import React, {useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  Icon,
  InfoPanel,
  Spinner,
  useTheme,
  appSpacing,
} from '@opapp/ui-native-primitives';
import type {AgentTerminalShell} from '@opapp/framework-agent-runtime';
import type {WorkspaceEntry} from '@opapp/framework-filesystem';
import {
  formatSizeBytes,
  formatWorkspaceEntryMeta,
  resolveWorkspaceEntryIcon,
  resolveWorkspaceKindLabel,
} from './agent-workbench-resolvers';
import {type createScreenStyles, terminalFontFamily} from './agent-workbench-styles';

/** Classify a unified-diff line for colorization. */
function classifyDiffLine(line: string): 'add' | 'remove' | 'header' | 'context' {
  if (line.startsWith('@@')) return 'header';
  if (line.startsWith('+++') || line.startsWith('---')) return 'header';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'remove';
  return 'context';
}

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
  const [showAllChildren, setShowAllChildren] = useState(false);
  const INSPECTOR_COLLAPSED_LIMIT = 12;
  const hasChildOverflow = selectedInspectorChildren.length > INSPECTOR_COLLAPSED_LIMIT;
  const visibleChildren = showAllChildren
    ? selectedInspectorChildren
    : selectedInspectorChildren.slice(0, INSPECTOR_COLLAPSED_LIMIT);

  return (
    <View style={screenStyles.sectionCardCompact}>
      <Text style={[screenStyles.sectionTitle, {borderBottomColor: palette.accent}]}>
        {appI18n.agentWorkbench.sections.inspectorTitle}
      </Text>

      {!selectedInspectorEntry ? (
        <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]} numberOfLines={2}>
          {appI18n.agentWorkbench.empty.inspectorDescription}
        </Text>
      ) : (
        <View style={screenStyles.sectionBody}>
          {/* File/dir path as the hero content */}
          <Text style={[screenStyles.toolCardTitle, {color: palette.ink}]} numberOfLines={2}>
            {selectedInspectorEntry.relativePath || appI18n.agentWorkbench.workspace.rootLabel}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm}}>
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
              <Spinner size='sm' tone='accent' />
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
                <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                  {appI18n.agentWorkbench.empty.directoryDescription}
                </Text>
              ) : (
                <View style={screenStyles.threadList}>
                  {visibleChildren.map(entry => {
                    const isActive =
                      selectedInspectorEntry.relativePath ===
                      entry.relativePath;
                    return (
                      <Pressable
                        key={`${entry.relativePath}:${entry.kind}`}
                        onPress={() => {
                          onInspectEntry(entry);
                        }}
                        style={({pressed, hovered}: {pressed: boolean; hovered?: boolean}) => [
                          screenStyles.listRow,
                          isActive && screenStyles.listRowActive,
                          !isActive && hovered ? {backgroundColor: palette.panel} : null,
                          pressed ? {opacity: 0.7} : null,
                        ]}>
                        {isActive ? (
                          <View style={screenStyles.listRowIndicator} />
                        ) : null}
                        <Icon
                          icon={resolveWorkspaceEntryIcon(entry)}
                          size={12}
                          color={isActive ? palette.accent : palette.inkSoft}
                        />
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
                  {hasChildOverflow ? (
                    <Pressable
                      onPress={() => setShowAllChildren(prev => !prev)}
                      style={({pressed}: {pressed: boolean}) => [
                        screenStyles.listRow,
                        pressed ? {opacity: 0.7} : null,
                      ]}>
                      <Text style={[screenStyles.listRowMeta, {color: palette.inkMuted, paddingVertical: appSpacing.xxs}]}>
                        {showAllChildren ? '收起' : `+ ${selectedInspectorChildren.length - INSPECTOR_COLLAPSED_LIMIT} 更多`}
                      </Text>
                    </Pressable>
                  ) : null}
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
                {selectedInspectorContent ? (
                  <Text style={[screenStyles.terminalText, {fontFamily: terminalFontFamily}]}>
                    {selectedInspectorContent.split('\n').map((line, i, arr) => (
                      <Text key={i}>
                        <Text style={{color: palette.inkSoft}}>
                          {String(i + 1).padStart(String(arr.length).length)}
                          {'  '}
                        </Text>
                        <Text style={{color: palette.ink}}>{line}</Text>
                        {i < arr.length - 1 ? '\n' : ''}
                      </Text>
                    ))}
                  </Text>
                ) : (
                  <Text
                    style={[
                      screenStyles.terminalText,
                      {color: palette.ink, fontFamily: terminalFontFamily},
                    ]}>
                    {selectedInspectorContent === null
                      ? appI18n.agentWorkbench.empty.contentUnavailable
                      : appI18n.agentWorkbench.empty.fileContent}
                  </Text>
                )}
              </ScrollView>
            </View>
          )}

          {selectedInspectorEntry.kind === 'file' ? (
            <View style={screenStyles.sectionBody}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: appSpacing.sm}}>
                <Text style={[screenStyles.sectionTitle, {flex: 1, marginBottom: 0}]}>
                  {appI18n.agentWorkbench.sections.diffTitle}
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
              </View>

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
                      <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                        {appI18n.agentWorkbench.empty.diffUnavailableDescription}
                      </Text>
                    )
                  : selectedDiffPath !==
                        selectedInspectorEntry.relativePath
                    ? (
                        <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                          {appI18n.agentWorkbench.empty.diffDescription}
                        </Text>
                      )
                    : diffLoading && !selectedDiffOutput
                      ? (
                          <View style={screenStyles.loadingInline}>
                            <Spinner
                              size='sm'
                              tone='accent'
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
                                  paddingHorizontal: 0,
                                },
                              ]}>
                              <ScrollView style={screenStyles.terminalScroll}>
                                <View testID='agent-workbench.diff.output'>
                                  {selectedDiffOutput.split('\n').map((line, i) => {
                                    const type = classifyDiffLine(line);
                                    return (
                                      <View
                                        key={i}
                                        style={{
                                          backgroundColor:
                                            type === 'add' ? palette.supportSoft
                                            : type === 'remove' ? 'rgba(212, 87, 74, 0.12)'
                                            : type === 'header' ? palette.panelEmphasis
                                            : undefined,
                                          paddingHorizontal: appSpacing.lg,
                                        }}>
                                        <Text
                                          style={[
                                            screenStyles.terminalText,
                                            {
                                              fontFamily: terminalFontFamily,
                                              color:
                                                type === 'add' ? palette.support
                                                : type === 'remove' ? palette.errorRed
                                                : type === 'header' ? palette.inkMuted
                                                : palette.ink,
                                            },
                                          ]}>
                                          {line}
                                        </Text>
                                      </View>
                                    );
                                  })}
                                </View>
                              </ScrollView>
                            </View>
                          )
                        : (
                            <Text style={[screenStyles.toolCardMetaItem, {color: palette.inkSoft}]}>
                              {appI18n.agentWorkbench.empty.diffNoChangesDescription}
                            </Text>
                          )}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
