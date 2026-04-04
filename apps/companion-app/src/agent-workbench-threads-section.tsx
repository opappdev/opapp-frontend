import React from 'react';
import {Text, View} from 'react-native';
import type {AgentThreadSummary} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  ChoiceChip,
  EmptyState,
} from '@opapp/ui-native-primitives';
import {formatThreadSubtitle} from './agent-workbench-resolvers';
import type {createScreenStyles} from './agent-workbench-styles';

type WorkbenchThreadsSectionProps = {
  threads: ReadonlyArray<AgentThreadSummary>;
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchThreadsSection({
  threads,
  selectedThreadId,
  onSelectThread,
  screenStyles,
}: WorkbenchThreadsSectionProps) {
  return (
    <View style={screenStyles.sectionCardCompact}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.threadsTitle}
      </Text>

      {threads.length === 0 ? (
        <EmptyState
          title={appI18n.agentWorkbench.empty.threadsTitle}
          description={appI18n.agentWorkbench.empty.threadsDescription}
        />
      ) : (
        <View style={screenStyles.threadList}>
          {threads.map(thread => (
            <ChoiceChip
              key={thread.threadId}
              label={thread.title}
              detail={formatThreadSubtitle(thread)}
              meta={thread.lastRunId ?? appI18n.common.unknown}
              active={thread.threadId === selectedThreadId}
              activeBadgeLabel={appI18n.agentWorkbench.threads.selectedBadge}
              inactiveBadgeLabel={appI18n.agentWorkbench.threads.availableBadge}
              onPress={() => {
                onSelectThread(thread.threadId);
              }}
              style={screenStyles.choiceChip}
            />
          ))}
        </View>
      )}
    </View>
  );
}
