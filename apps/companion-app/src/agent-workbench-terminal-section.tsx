import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {Expander, useTheme} from '@opapp/ui-native-primitives';
import {type createScreenStyles, terminalFontFamily} from './agent-workbench-styles';

type WorkbenchTerminalSectionProps = {
  terminalTranscript: string;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchTerminalSection({
  terminalTranscript,
  screenStyles,
}: WorkbenchTerminalSectionProps) {
  const {palette} = useTheme();

  if (!terminalTranscript) {
    return (
      <View style={[screenStyles.terminalBox, {opacity: 0.4}]}>
        <Text
          testID='agent-workbench.terminal.transcript'
          style={[
            screenStyles.terminalText,
            {
              color: palette.inkSoft,
              fontFamily: terminalFontFamily,
            },
          ]}
          numberOfLines={1}>
          {appI18n.agentWorkbench.empty.terminalDescription}
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.terminalSummaryShell}>
      <View style={screenStyles.terminalSummaryHiddenLocator}>
        <Text testID='agent-workbench.terminal.transcript'>
          {terminalTranscript}
        </Text>
      </View>
      <Expander
        title={appI18n.agentWorkbench.labels.terminalSummaryTitle}
        defaultExpanded={false}>
        <View style={screenStyles.transcriptTerminal}>
          <ScrollView style={screenStyles.terminalScroll}>
            <Text
              style={[
                screenStyles.terminalText,
                {
                  color: palette.ink,
                  fontFamily: terminalFontFamily,
                },
              ]}>
              {terminalTranscript}
            </Text>
          </ScrollView>
        </View>
      </Expander>
    </View>
  );
}
