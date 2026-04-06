import { StyleSheet } from 'react-native';
import { appFontFamily } from '../tokens';

const styles = StyleSheet.create({
  switchLabel: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      fontFamily: appFontFamily,
    },
  switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  switchThumb: {
      position: 'absolute',
      width: 16,
      height: 16,
      borderRadius: 8,
    },
  switchTrack: {
      width: 38,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      justifyContent: 'center',
    },
});

export { styles };
