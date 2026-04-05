import React from 'react';
import {Pressable, Text, View} from 'react-native';
import type {AgentThreadSummary} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  useTheme,
  appSpacing,
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
  const {palette} = useTheme();

  return (
    <View style={screenStyles.sectionCardCompact}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.threadsTitle}
      </Text>

      {threads.length === 0 ? (
        <Text style={[screenStyles.sectionDescription, {paddingHorizontal: appSpacing.sm2}]} numberOfLines={2}>
          {appI18n.agentWorkbench.empty.threadsDescription}
        </Text>
      ) : (
        <View style={screenStyles.threadList}>
          {threads.map(thread => {
            const isActive = thread.threadId === selectedThreadId;
            return (
              <Pressable
                key={thread.threadId}
                accessibilityRole='button'
                accessibilityState={{selected: isActive}}
                onPress={() => {
                  onSelectThread(thread.threadId);
                }}
                style={[
                  screenStyles.listRow,
                  isActive ? screenStyles.listRowActive : null,
                ]}>
                {isActive ? <View style={screenStyles.listRowIndicator} /> : null}
                <View style={{flex: 1, minWidth: 0, gap: appSpacing.xxs}}>
                  <Text
                    numberOfLines={2}
                    style={[
                      screenStyles.listRowLabel,
                      isActive ? {color: palette.ink, fontWeight: '700'} : {color: palette.inkMuted},
                    ]}>
                    {thread.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={screenStyles.listRowDetail}>
                    {formatThreadSubtitle(thread)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
