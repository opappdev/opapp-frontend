import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius } from '../tokens';

const styles = StyleSheet.create({
  sectionCard: {
      borderWidth: 1,
      borderRadius: appRadius.panel,
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
  sectionContent: {},
  sectionDescription: {
      fontSize: 13,
      lineHeight: 20,
      fontFamily: appFontFamily,
    },
  sectionHeader: {
      gap: 5,
    },
  sectionTitle: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '800',
      fontFamily: appFontFamily,
    },
});

export { styles };
