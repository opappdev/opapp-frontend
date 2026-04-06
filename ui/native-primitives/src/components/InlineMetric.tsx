import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './InlineMetric.styles';

export function InlineMetric({
  label,
  value,
  tone = 'default',
  testID,
  labelTestID,
  valueTestID,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'accent';
  testID?: string;
  labelTestID?: string;
  valueTestID?: string;
}) {
  const { palette } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.metric,
        tone === 'accent'
          ? {
              backgroundColor: palette.supportSoft,
              borderColor: palette.support,
            }
          : { backgroundColor: palette.canvas, borderColor: palette.border },
      ]}
    >
      <Text testID={labelTestID} style={[styles.metricLabel, { color: palette.inkMuted }]}>
        {label}
      </Text>
      <Text testID={valueTestID} style={[styles.metricValue, { color: palette.ink }]}>{value}</Text>
    </View>
  );
}
