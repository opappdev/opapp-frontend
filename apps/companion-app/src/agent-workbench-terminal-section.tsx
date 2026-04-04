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

  return (
    <View style={screenStyles.sectionCard}>
      <Text style={screenStyles.sectionTitle}>
        {appI18n.agentWorkbench.sections.terminalTitle}
      </Text>
      <Text style={screenStyles.sectionDescription}>
        {appI18n.agentWorkbench.sections.terminalDescription}
      </Text>

      <View
        style={[
          screenStyles.terminalBox,
          {
            backgroundColor: palette.canvas,
            borderColor: palette.border,
          },
        ]}>
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
            {terminalTranscript || appI18n.agentWorkbench.empty.terminalDescription}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}
