import React, { PropsWithChildren } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './Stack.styles';

export function Stack({
  children,
  style,
  testID,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; testID?: string }>) {
  const { spacing } = useTheme();
  return <View testID={testID} style={[{ gap: spacing.md }, style]}>{children}</View>;
}
