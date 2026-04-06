import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './Divider.styles';

export function Divider({
  direction = 'horizontal',
  style,
}: {
  direction?: 'horizontal' | 'vertical';
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  return (
    <View
      accessibilityRole='none'
      style={[
        direction === 'horizontal'
          ? { height: 1, backgroundColor: palette.border, width: '100%' }
          : { width: 1, backgroundColor: palette.border, alignSelf: 'stretch' },
        style,
      ]}
    />
  );
}
