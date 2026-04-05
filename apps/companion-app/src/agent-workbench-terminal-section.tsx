import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {useTheme} from '@opapp/ui-native-primitives';
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

  // Don't render anything when there's no terminal output
  if (!terminalTranscript) {
    return (
      <View style={[screenStyles.transcriptTerminal, {opacity: 0.6}]}>
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
    <View style={screenStyles.transcriptTerminal}>
      <ScrollView style={screenStyles.terminalScroll}>
        <Text
          testID='agent-workbench.terminal.transcript'
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
  );
}
