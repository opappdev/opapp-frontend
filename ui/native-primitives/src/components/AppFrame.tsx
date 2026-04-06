import React, { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './AppFrame.styles';

export function AppFrame({
  eyebrow,
  title,
  description,
  children,
  testID,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  testID?: string;
}>) {
  const { palette, spacing } = useTheme();
  return (
    <View testID={testID} style={[styles.frame, { backgroundColor: palette.canvas }]}>
      <View style={[styles.frameInner, { gap: spacing.xl }]}>
        <View
          style={[
            styles.heroShell,
            { backgroundColor: palette.panel, borderColor: palette.border },
          ]}
        >
          <View style={styles.heroTopline}>
            <Text style={[styles.eyebrow, { color: palette.accent }]}>
              {eyebrow}
            </Text>
            <View
              style={[styles.heroRule, { backgroundColor: palette.border }]}
            />
          </View>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>
            {title}
          </Text>
          <Text style={[styles.heroDescription, { color: palette.inkMuted }]}>
            {description}
          </Text>
        </View>
        {children}
      </View>
    </View>
  );
}
