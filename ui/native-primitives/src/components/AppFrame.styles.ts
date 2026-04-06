import { StyleSheet } from 'react-native';
import { appFontFamily, appLayout, appRadius } from '../tokens';

const styles = StyleSheet.create({
  eyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      fontFamily: appFontFamily,
    },
  frame: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: 16,
      paddingBottom: 32,
      alignItems: 'center',
    },
  frameInner: {
      width: '100%',
      maxWidth: appLayout.frameMaxWidth,
    },
  heroDescription: {
      fontSize: 14,
      lineHeight: 21,
      maxWidth: 820,
      fontFamily: appFontFamily,
    },
  heroRule: {
      flex: 1,
      height: 1,
    },
  heroShell: {
      borderWidth: 1,
      borderRadius: appRadius.hero,
      paddingHorizontal: 22,
      paddingVertical: 16,
      gap: 8,
    },
  heroTitle: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '800',
      maxWidth: 720,
      fontFamily: appFontFamily,
    },
  heroTopline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
});

export { styles };
