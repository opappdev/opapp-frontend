import React, { PropsWithChildren } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './Toolbar.styles';

export function Toolbar({
  children,
  style,
  testID,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; testID?: string }>) {
  const { palette, spacing } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.toolbar,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
