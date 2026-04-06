import { Platform, ViewStyle } from 'react-native';

export const desktopCursor: ViewStyle =
  Platform.OS === 'windows' ? ({ cursor: 'pointer' } as any) : {};

export function windowsFocusProps() {
  if (Platform.OS === 'windows') {
    return { enableFocusRing: true } as any;
  }
  return {};
}
