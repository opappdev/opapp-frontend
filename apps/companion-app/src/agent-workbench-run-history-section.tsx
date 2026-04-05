import React from 'react';
import {Pressable, Text, View} from 'react-native';
import type {AgentRunDocument} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  useTheme,
} from '@opapp/ui-native-primitives';
import {
  formatIsoTimestamp,
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
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.runHistoryTitle}
      </Text>

      <View style={screenStyles.threadList}>
        {threadRunDocuments.map((document, index) => {
          const isActive = document.run.runId === selectedRunId;
          const isLatest =
            document.run.runId === latestThreadRunDocument?.run.runId;
          return (
            <Pressable
              key={document.run.runId}
              testID={`agent-workbench.run-history.index-${index}`}
              accessibilityRole='button'
              accessibilityState={{selected: isActive}}
              onPress={() => {
                onSelectRun(document);
              }}
              style={({pressed, hovered}: {pressed: boolean; hovered?: boolean}) => [
                screenStyles.listRow,
                isActive ? screenStyles.listRowActive : null,
                !isActive && hovered ? {backgroundColor: palette.panel} : null,
                pressed ? {opacity: 0.7} : null,
              ]}>
              {isActive ? <View style={screenStyles.listRowIndicator} /> : null}
              <View style={{flex: 1, minWidth: 0, gap: 2}}>
                <Text
                  numberOfLines={2}
                  style={[
                    screenStyles.listRowLabel,
                    isActive ? {color: palette.ink, fontWeight: '600'} : {color: palette.inkMuted},
                  ]}>
                  {document.run.goal ||
                    document.run.request?.command ||
                    document.run.runId}
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <View style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: resolveRunStatusTone(document.run.status) === 'danger' ? palette.errorRed : resolveRunStatusTone(document.run.status) === 'support' ? palette.support : palette.inkSoft,
                    opacity: isLatest ? 1 : 0.6,
                  }} />
                  <Text numberOfLines={1} style={screenStyles.listRowDetail}>
                    {formatIsoTimestamp(document.run.updatedAt)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
