import React, { PropsWithChildren } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { styles } from './MenuList.styles';

export function MenuList({
  children,
  style,
  testID,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; testID?: string }>) {
  return (
    <View testID={testID} style={[styles.menuList, style]}>
      {children}
    </View>
  );
}
