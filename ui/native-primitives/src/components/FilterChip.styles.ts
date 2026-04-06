import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius } from '../tokens';

const styles = StyleSheet.create({
  filterChip: {
      minWidth: 64,
      height: 34,
      paddingHorizontal: 14,
      borderRadius: appRadius.badge,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  filterChipLabel: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
      fontFamily: appFontFamily,
    },
  filterChipPressed: {
      transform: [{ translateY: 1 }],
    },
});

export { styles };
