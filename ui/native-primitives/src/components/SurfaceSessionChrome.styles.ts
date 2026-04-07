import { StyleSheet } from 'react-native';
import { appFontFamily, appLayout, appRadius } from '../tokens';

const styles = StyleSheet.create({
  surfaceHostChrome: {
      paddingHorizontal: 22,
      paddingTop: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      alignItems: 'center',
    },
  surfaceHostChromeInner: {
      width: '100%',
      maxWidth: appLayout.frameMaxWidth,
      gap: 8,
    },
  surfaceHostLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      fontFamily: appFontFamily,
    },
  surfaceTab: {
      minWidth: 172,
      flexDirection: 'row',
      alignItems: 'stretch',
      borderWidth: 1,
      borderRadius: appRadius.panel,
      overflow: 'hidden',
    },
  surfaceTabBody: {
      flex: 1,
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
  surfaceTabClose: {
      width: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: 1,
    },
  surfaceTabCloseLabel: {
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      fontFamily: appFontFamily,
    },
  surfaceTabMeta: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      fontFamily: appFontFamily,
    },
  surfaceTabPressed: {
      transform: [{ translateY: 1 }],
    },
  surfaceTabRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
  surfaceTabTitle: {
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '800',
      fontFamily: appFontFamily,
    },
});

export { styles };
