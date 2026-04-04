import React from 'react';
import {Text, View} from 'react-native';
import type {AgentRunDocument} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  ChoiceChip,
  EmptyState,
} from '@opapp/ui-native-primitives';
import {
  formatIsoTimestamp,
  resolveRunStatusLabel,
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
  return (
    <View style={screenStyles.sectionCardCompact}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.runHistoryTitle}
      </Text>

      {threadRunDocuments.length === 0 ? (
        <EmptyState
          title={appI18n.agentWorkbench.empty.runHistoryTitle}
          description={
            appI18n.agentWorkbench.empty.runHistoryDescription
          }
        />
      ) : (
        <View style={screenStyles.threadList}>
          {threadRunDocuments.map((document, index) => (
            <ChoiceChip
              key={document.run.runId}
              testID={`agent-workbench.run-history.index-${index}`}
              label={
                document.run.goal ||
                document.run.request?.command ||
                document.run.runId
              }
              detail={`${resolveRunStatusLabel(document.run.status)} · ${formatIsoTimestamp(document.run.updatedAt)}`}
              meta={
                document.run.runId === latestThreadRunDocument?.run.runId
                  ? appI18n.agentWorkbench.runHistory.latest(
                      document.run.runId,
                    )
                  : document.run.resumedFromRunId
                  ? appI18n.agentWorkbench.runHistory.resumedFrom(
                      document.run.resumedFromRunId,
                    )
                  : document.run.runId
              }
              active={document.run.runId === selectedRunId}
              activeBadgeLabel={
                appI18n.agentWorkbench.runHistory.selectedBadge
              }
              inactiveBadgeLabel={
                appI18n.agentWorkbench.runHistory.availableBadge
              }
              onPress={() => {
                onSelectRun(document);
              }}
              style={screenStyles.choiceChip}
            />
          ))}
        </View>
      )}
    </View>
  );
}
