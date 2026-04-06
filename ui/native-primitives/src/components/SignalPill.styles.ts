import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius } from '../tokens';

const styles = StyleSheet.create({
  signalPill: {
      borderWidth: 1,
      borderRadius: appRadius.pill,
      alignSelf: 'flex-start',
      justifyContent: 'center',
      flexShrink: 1,
      maxWidth: '100%',
    },
  signalPillLabel: {
      fontWeight: '800',
      fontFamily: appFontFamily,
    },
  signalPillLabelMd: {
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
  signalPillLabelSm: {
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.3,
    },
  signalPillMd: {
      minHeight: 32,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
  signalPillSm: {
      minHeight: 28,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
});

export { styles };
