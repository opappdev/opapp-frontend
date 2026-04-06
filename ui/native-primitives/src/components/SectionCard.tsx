import React, { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './SectionCard.styles';

export function SectionCard({
  title,
  description,
  children,
  testID,
}: PropsWithChildren<{
  title: string;
  description?: string;
  testID?: string;
}>) {
  const { palette, spacing } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.sectionCard,
        {
          backgroundColor: palette.panel,
          borderColor: palette.border,
          gap: spacing.lg,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.ink }]}>
          {title}
        </Text>
        {description ? (
          <Text
            style={[styles.sectionDescription, { color: palette.inkMuted }]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[styles.sectionContent, { gap: spacing.lg }]}>
        {children}
      </View>
    </View>
  );
}
