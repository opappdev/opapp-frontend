import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius } from '../tokens';

const styles = StyleSheet.create({
  actionButton: {
      flexDirection: 'row',
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: appRadius.control,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
  actionButtonLabel: {
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '800',
      letterSpacing: 0.3,
      fontFamily: appFontFamily,
    },
  actionButtonPressed: {
      transform: [{ translateY: 1 }],
    },
});

export { styles };
