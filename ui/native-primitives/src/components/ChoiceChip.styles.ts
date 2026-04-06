import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius } from '../tokens';

const styles = StyleSheet.create({
  chip: {
      minWidth: 168,
      maxWidth: 224,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: appRadius.control,
      borderWidth: 1,
      gap: 6,
      overflow: 'hidden',
    },
  chipDetail: {
      fontSize: 12,
      lineHeight: 17,
      fontFamily: appFontFamily,
    },
  chipEmphasisBand: {
      position: 'absolute',
      top: 0,
      left: 14,
      right: 14,
      height: 3,
      borderBottomLeftRadius: 3,
      borderBottomRightRadius: 3,
    },
  chipHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
  chipIndicator: {
      minWidth: 54,
      height: 22,
      marginLeft: 8,
      paddingHorizontal: 9,
      borderRadius: appRadius.badge,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  chipIndicatorLabel: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '800',
      fontFamily: appFontFamily,
    },
  chipLabel: {
      flexShrink: 1,
      minWidth: 0,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800',
      fontFamily: appFontFamily,
    },
  chipMeta: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '700',
      fontFamily: appFontFamily,
    },
});

export { styles };
