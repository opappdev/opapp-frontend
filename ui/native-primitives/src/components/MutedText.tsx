import React, { PropsWithChildren } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './MutedText.styles';

export function MutedText({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  const { palette } = useTheme();
  return (
    <Text style={[styles.mutedText, { color: palette.inkMuted }, style]}>
      {children}
    </Text>
  );
}
