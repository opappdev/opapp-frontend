import { StyleSheet } from 'react-native';
import { appFontFamily } from '../tokens';

const styles = StyleSheet.create({
  menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: 34,
    },
  menuItemDetail: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      fontFamily: appFontFamily,
      flexShrink: 0,
    },
  menuItemLabel: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      fontFamily: appFontFamily,
      flex: 1,
      minWidth: 0,
    },
});

export { styles };
