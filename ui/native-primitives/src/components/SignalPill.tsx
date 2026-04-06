import React from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { type AppTone, type AppToneEmphasis } from '../tokens';
import { styles } from './SignalPill.styles';

export function SignalPill({
  label,
  tone = 'neutral',
  emphasis = 'soft',
  size = 'md',
  style,
  textStyle,
  testID,
}: {
  label: string;
  tone?: AppTone;
  emphasis?: AppToneEmphasis;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const { tonePalette } = useTheme();
  const toneStyles = tonePalette[tone][emphasis];

  return (
    <View
      testID={testID}
      style={[
        styles.signalPill,
        size === 'sm' ? styles.signalPillSm : styles.signalPillMd,
        toneStyles.container,
        style,
      ]}
    >
      <Text
        style={[
          styles.signalPillLabel,
          size === 'sm' ? styles.signalPillLabelSm : styles.signalPillLabelMd,
          toneStyles.label,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
