import React from 'react';
import {Text, View} from 'react-native';
import type {AgentThreadSummary} from '@opapp/framework-agent-runtime';
import {deriveSessionAttention, resolveSessionLifecycle} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  Icon,
  SelectableRow,
  useTheme,
} from '@opapp/ui-native-primitives';
import {
  formatIsoTimestamp,
  resolveRunStatusIcon,
  resolveRunStatusTone,
} from './agent-workbench-resolvers';
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
  const {palette} = useTheme();

  return (
    <View style={screenStyles.sectionCardCompact}>
      <View style={screenStyles.sidebarSectionHeader}>
        <Text style={screenStyles.sectionTitle}>
          {appI18n.agentWorkbench.sections.threadsTitle}
        </Text>
        {threads.length > 0 ? (
          <Text style={screenStyles.sidebarSectionMeta}>{threads.length}</Text>
        ) : null}
      </View>

      {threads.length === 0 ? (
        <Text style={screenStyles.sectionDescription} numberOfLines={2}>
          {appI18n.agentWorkbench.empty.threadsDescription}
        </Text>
      ) : (
        <View accessibilityRole='list' style={screenStyles.threadList}>
          {threads.map(thread => {
            const isActive = thread.threadId === selectedThreadId;
            const attention = deriveSessionAttention(thread, null);
            const lifecycle = resolveSessionLifecycle(thread);
            const isUnread = attention !== 'read';
            return (
              <SelectableRow
                key={thread.threadId}
                selected={isActive}
                onPress={() => {
                  onSelectThread(thread.threadId);
                }}
                leading={
                  <View
                    style={{
                      width: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {isUnread && !isActive ? (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            attention === 'stale-unread'
                              ? palette.inkMuted
                              : palette.accent,
                        }}
                      />
                    ) : null}
                  </View>
                }
                title={thread.title}
                titleNumberOfLines={2}
                titleStyle={
                  !isActive && isUnread
                    ? {color: palette.ink, fontWeight: '600'}
                    : !isActive
                      ? {color: palette.inkMuted}
                      : undefined
                }
                subtitle={
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    {lifecycle === 'running' ? (
                      <Icon
                        icon={resolveRunStatusIcon(thread.lastRunStatus)}
                        size={10}
                        color={palette.accent}
                      />
                    ) : thread.lastRunStatus ? (
                      <Icon
                        icon={resolveRunStatusIcon(thread.lastRunStatus)}
                        size={10}
                        color={resolveRunStatusTone(thread.lastRunStatus) === 'danger' ? palette.errorRed : resolveRunStatusTone(thread.lastRunStatus) === 'support' ? palette.support : palette.inkSoft}
                      />
                    ) : null}
                    <Text
                      numberOfLines={1}
                      style={screenStyles.listRowDetail}>
                      {formatIsoTimestamp(thread.updatedAt)}
                    </Text>
                  </View>
                }
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
