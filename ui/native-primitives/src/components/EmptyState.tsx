import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { ActionButton } from './ActionButton';
import { styles } from './EmptyState.styles';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  style,
  testID,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette, spacing } = useTheme();
  return (
    <View testID={testID} style={[styles.emptyState, { gap: spacing.sm2 }, style]}>
      <Text style={[styles.emptyStateTitle, { color: palette.ink }]}>
        {title}
      </Text>
      <Text style={[styles.emptyStateDescription, { color: palette.inkMuted }]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm }}>
          <ActionButton label={actionLabel} onPress={onAction} tone='ghost' />
        </View>
      ) : null}
    </View>
  );
}
