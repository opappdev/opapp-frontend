import { StyleSheet } from 'react-native';
import { appFontFamily } from '../tokens';

const styles = StyleSheet.create({
  filterSection: {
      gap: 8,
    },
  filterSectionLabel: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
      letterSpacing: 0.4,
      fontFamily: appFontFamily,
    },
  filterSectionRow: {
      gap: 10,
      paddingRight: 12,
    },
});

export { styles };
