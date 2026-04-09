import React from 'react';
import {Text, View} from 'react-native';
import type {AgentRunDocument} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  Icon,
  SelectableRow,
  useTheme,
} from '@opapp/ui-native-primitives';
import {
  formatIsoTimestamp,
  resolveRunStatusLabel,
  resolveRunStatusIcon,
  resolveRunStatusTone,
} from './agent-workbench-resolvers';
import type {createScreenStyles} from './agent-workbench-styles';

type WorkbenchRunHistorySectionProps = {
  threadRunDocuments: ReadonlyArray<AgentRunDocument>;
  selectedRunId: string | null;
  latestThreadRunDocument: AgentRunDocument | null;
  onSelectRun: (document: AgentRunDocument) => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchRunHistorySection({
  threadRunDocuments,
  selectedRunId,
  latestThreadRunDocument,
  onSelectRun,
  screenStyles,
}: WorkbenchRunHistorySectionProps) {
  const {palette} = useTheme();

  if (threadRunDocuments.length === 0) {
    return (
      <View style={screenStyles.sectionCardCompact}>
        <Text style={screenStyles.sectionTitle}>
          {appI18n.agentWorkbench.sections.runHistoryTitle}
        </Text>
        <Text style={screenStyles.sectionDescription} numberOfLines={2}>
          {appI18n.agentWorkbench.empty.runHistoryDescription}
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.sectionCardCompact}>
      <View style={screenStyles.sidebarSectionHeader}>
        <Text style={screenStyles.sectionTitle}>
          {appI18n.agentWorkbench.sections.runHistoryTitle}
        </Text>
        {threadRunDocuments.length > 1 ? (
          <Text style={screenStyles.sidebarSectionMeta}>
            {threadRunDocuments.length}
          </Text>
        ) : null}
      </View>

      <View accessibilityRole='list' style={screenStyles.threadList}>
        {threadRunDocuments.map((document, index) => {
          const isActive = document.run.runId === selectedRunId;
          const statusTone = resolveRunStatusTone(document.run.status);
          const showStatusChip =
            document.run.status === 'running' ||
            document.run.status === 'needs-approval';
          return (
            <SelectableRow
              key={document.run.runId}
              testID={`agent-workbench.run-history.index-${index}`}
              selected={isActive}
              onPress={() => {
                onSelectRun(document);
              }}
              leading={
                <Icon
                  icon={resolveRunStatusIcon(document.run.status)}
                  size={10}
                  color={
                    resolveRunStatusTone(document.run.status) === 'danger'
                      ? palette.errorRed
                      : resolveRunStatusTone(document.run.status) === 'support'
                        ? palette.support
                        : palette.inkSoft
                  }
                  style={{
                    opacity:
                      document.run.runId === latestThreadRunDocument?.run.runId
                        ? 1
                        : 0.6,
                  }}
                />
              }
              title={
                document.run.goal ||
                document.run.request?.command ||
                document.run.runId
              }
              titleNumberOfLines={2}
              titleStyle={isActive ? undefined : {color: palette.inkMuted}}
              subtitle={
                <Text numberOfLines={1} style={screenStyles.listRowDetail}>
                  {`${resolveRunStatusLabel(document.run.status)} · ${formatIsoTimestamp(
                    document.run.updatedAt,
                  )}`}
                </Text>
              }
              trailing={
                showStatusChip ? (
                  <View
                    style={[
                      screenStyles.sidebarStatusChip,
                      {
                        borderColor:
                          statusTone === 'warning'
                            ? palette.accent
                            : palette.borderStrong,
                        backgroundColor:
                          statusTone === 'warning'
                            ? palette.accentSoft
                            : palette.canvasShade,
                      },
                    ]}>
                    <Text
                      numberOfLines={1}
                      style={[
                        screenStyles.sidebarStatusChipLabel,
                        {
                          color:
                            statusTone === 'warning'
                              ? palette.accent
                              : palette.ink,
                        },
                      ]}>
                      {resolveRunStatusLabel(document.run.status)}
                    </Text>
                  </View>
                ) : null
              }
            />
          );
        })}
      </View>
    </View>
  );
}
