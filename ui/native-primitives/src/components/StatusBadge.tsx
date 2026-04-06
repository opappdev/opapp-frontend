import React from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { type AppTone, type AppToneEmphasis } from '../tokens';
import { styles } from './StatusBadge.styles';

export function StatusBadge({
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
        styles.statusBadge,
        size === 'sm' ? styles.statusBadgeSm : styles.statusBadgeMd,
        toneStyles.container,
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.statusBadgeLabel, toneStyles.label, textStyle]}
      >
        {label}
      </Text>
    </View>
  );
}
