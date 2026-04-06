import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { type AppTone } from '../tokens';
import { styles } from './ProgressBar.styles';

export function ProgressBar({
  value,
  max = 1,
  tone = 'accent',
  indeterminate = false,
  style,
}: {
  value?: number;
  max?: number;
  tone?: AppTone;
  indeterminate?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, tonePalette } = useTheme();
  const toneColor = tonePalette[tone].solid.container.backgroundColor;
  const ratio = indeterminate
    ? 0.4
    : Math.min(1, Math.max(0, (value ?? 0) / max));

  return (
    <View
      accessibilityRole='progressbar'
      accessibilityValue={
        indeterminate ? undefined : { min: 0, max, now: value }
      }
      style={[
        styles.progressBarTrack,
        { backgroundColor: palette.canvasShade },
        style,
      ]}
    >
      <View
        style={[
          styles.progressBarFill,
          { backgroundColor: toneColor, width: `${ratio * 100}%` },
        ]}
      />
    </View>
  );
}
