import { StyleSheet } from 'react-native';
import { appFontFamily } from '../tokens';

const styles = StyleSheet.create({
  keyboardShortcut: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
  keyboardShortcutKey: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 4,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  keyboardShortcutLabel: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '700',
      fontFamily: appFontFamily,
    },
  keyboardShortcutSep: {
      fontSize: 10,
      fontWeight: '600',
      fontFamily: appFontFamily,
      marginHorizontal: 1,
    },
});

export { styles };
