import React from 'react';
import {Pressable, Text, View} from 'react-native';
import type {AgentThreadSummary} from '@opapp/framework-agent-runtime';
import {deriveSessionAttention, resolveSessionLifecycle} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  Icon,
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
        <View style={screenStyles.threadList}>
          {threads.map(thread => {
            const isActive = thread.threadId === selectedThreadId;
            const attention = deriveSessionAttention(thread, null);
            const lifecycle = resolveSessionLifecycle(thread);
            const isUnread = attention !== 'read';
            return (
              <Pressable
                key={thread.threadId}
                accessibilityRole='button'
                accessibilityState={{selected: isActive}}
                onPress={() => {
                  onSelectThread(thread.threadId);
                }}
                style={({pressed, hovered}: {pressed: boolean; hovered?: boolean}) => [
                  screenStyles.listRow,
                  isActive ? screenStyles.listRowActive : null,
                  !isActive && hovered ? {backgroundColor: palette.panel} : null,
                  pressed ? {opacity: 0.7} : null,
                ]}>
                {isActive ? <View style={screenStyles.listRowIndicator} /> : null}
                <View style={{flex: 1, minWidth: 0, gap: 2}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    {/* Unread dot */}
                    {isUnread && !isActive ? (
                      <View style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: attention === 'stale-unread' ? palette.inkMuted : palette.accent,
                      }} />
                    ) : null}
                    <Text
                      numberOfLines={2}
                      style={[
                        screenStyles.listRowLabel,
                        isActive
                          ? {color: palette.ink, fontWeight: '600'}
                          : isUnread
                            ? {color: palette.ink, fontWeight: '600'}
                            : {color: palette.inkMuted},
                      ]}>
                      {thread.title}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    {/* Lifecycle indicator (running vs idle) */}
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
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
