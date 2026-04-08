import React from 'react';
import {Text, View} from 'react-native';
import type {AgentThreadSummary} from '@opapp/framework-agent-runtime';
import {deriveSessionAttention, resolveSessionLifecycle} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  SelectableRow,
  useTheme,
} from '@opapp/ui-native-primitives';
import {
  formatIsoTimestamp,
  resolveSessionAttentionLabel,
  resolveSessionLifecycleLabel,
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
  const nowIso = new Date().toISOString();

  return (
    <View style={screenStyles.sectionCardCompact}>
      <View style={screenStyles.sidebarSectionHeader}>
        <Text style={screenStyles.sectionTitle}>
          {appI18n.agentWorkbench.sections.threadsTitle}
        </Text>
        {threads.length > 1 ? (
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
            const attention = deriveSessionAttention(thread, nowIso);
            const lifecycle = resolveSessionLifecycle(thread);
            const isUnread = attention !== 'read';
            const trailingLabel =
              lifecycle === 'running'
                ? resolveSessionLifecycleLabel(lifecycle)
                : isUnread
                  ? resolveSessionAttentionLabel(attention)
                  : null;
            const trailingColors =
              lifecycle === 'running'
                ? {
                    borderColor: palette.accent,
                    backgroundColor: palette.accentSoft,
                    color: palette.accent,
                  }
                : attention === 'stale-unread'
                  ? {
                      borderColor: palette.border,
                      backgroundColor: palette.canvasShade,
                      color: palette.inkSoft,
                    }
                  : {
                      borderColor: palette.accent,
                      backgroundColor: palette.accentSoft,
                      color: palette.accent,
                    };
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
                  <Text numberOfLines={1} style={screenStyles.listRowDetail}>
                    {formatIsoTimestamp(thread.updatedAt)}
                  </Text>
                }
                trailing={
                  trailingLabel ? (
                    <View
                      style={[
                        screenStyles.sidebarStatusChip,
                        {
                          borderColor: trailingColors.borderColor,
                          backgroundColor: trailingColors.backgroundColor,
                        },
                      ]}>
                      <Text
                        numberOfLines={1}
                        style={[
                          screenStyles.sidebarStatusChipLabel,
                          {color: trailingColors.color},
                        ]}>
                        {trailingLabel}
                      </Text>
                    </View>
                  ) : null
                }
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
