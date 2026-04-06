import React, { PropsWithChildren } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './InfoPanel.styles';

export function InfoPanel({
  title,
  tone = 'danger',
  children,
  style,
  testID,
}: PropsWithChildren<{
  title: string;
  tone?: 'accent' | 'danger' | 'neutral';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  const { palette, tonePalette } = useTheme();
  const toneStyles = tonePalette[tone].soft;
  const titleToneStyle =
    tone === 'neutral' ? { color: palette.ink } : toneStyles.label;

  return (
    <View testID={testID} style={[styles.infoPanel, toneStyles.container, style]}>
      <Text style={[styles.infoPanelTitle, titleToneStyle]}>{title}</Text>
      <View style={styles.infoPanelBody}>{children}</View>
    </View>
  );
}
