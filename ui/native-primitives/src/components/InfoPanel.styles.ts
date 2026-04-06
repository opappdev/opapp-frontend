import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius } from '../tokens';

const styles = StyleSheet.create({
  infoPanel: {
      borderRadius: appRadius.control,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
  infoPanelBody: {
      gap: 6,
    },
  infoPanelTitle: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
      letterSpacing: 0.7,
      fontFamily: appFontFamily,
    },
});

export { styles };
