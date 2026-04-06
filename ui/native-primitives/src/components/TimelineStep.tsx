import React, { PropsWithChildren } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { type AppTone } from '../tokens';
import { styles } from './TimelineStep.styles';

export function TimelineStep({
  markerLabel,
  title,
  description,
  warning,
  tone = 'accent',
  children,
  style,
}: PropsWithChildren<{
  markerLabel: string;
  title: string;
  description: string;
  warning?: string;
  tone?: AppTone;
  style?: StyleProp<ViewStyle>;
}>) {
  const { palette, tonePalette, spacing } = useTheme();
  const toneStyles = tonePalette[tone].soft;

  return (
    <View style={[styles.timelineStep, { gap: spacing.sm2 }, style]}>
      <View style={[styles.timelineStepMarker, toneStyles.container]}>
        <Text style={[styles.timelineStepMarkerLabel, toneStyles.label]}>
          {markerLabel}
        </Text>
      </View>
      <View
        style={[
          styles.timelineStepBody,
          {
            borderLeftColor: toneStyles.container.borderColor,
            gap: spacing.xs,
            paddingBottom: spacing.lg,
          },
        ]}
      >
        <Text style={[styles.timelineStepTitle, { color: palette.ink }]}>
          {title}
        </Text>
        <Text
          style={[styles.timelineStepDescription, { color: palette.inkMuted }]}
        >
          {description}
        </Text>
        {children}
        {warning ? (
          <Text
            style={[
              styles.timelineStepWarning,
              { color: tonePalette.danger.soft.label.color },
            ]}
          >
            {warning}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
