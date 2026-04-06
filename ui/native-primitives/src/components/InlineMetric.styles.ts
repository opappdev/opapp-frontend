import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius } from '../tokens';

const styles = StyleSheet.create({
  metric: {
      minWidth: 118,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: appRadius.control,
      borderWidth: 1,
      gap: 5,
    },
  metricLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontFamily: appFontFamily,
    },
  metricValue: {
      fontSize: 22,
      lineHeight: 24,
      fontWeight: '800',
      fontFamily: appFontFamily,
    },
});

export { styles };
