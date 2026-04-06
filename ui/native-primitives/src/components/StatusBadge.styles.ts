import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius } from '../tokens';

const styles = StyleSheet.create({
  statusBadge: {
      borderWidth: 1,
      borderRadius: appRadius.badge,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      flexShrink: 0,
    },
  statusBadgeLabel: {
      fontSize: 12,
      lineHeight: 15,
      fontWeight: '800',
      fontFamily: appFontFamily,
    },
  statusBadgeMd: {
      minHeight: 30,
      minWidth: 64,
      paddingHorizontal: 12,
    },
  statusBadgeSm: {
      minHeight: 28,
      minWidth: 54,
      paddingHorizontal: 10,
    },
});

export { styles };
