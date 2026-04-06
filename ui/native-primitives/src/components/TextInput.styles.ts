import { StyleSheet } from 'react-native';
import { appRadius } from '../tokens';

const styles = StyleSheet.create({
  textInputClear: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
  textInputClearLabel: {
      fontSize: 12,
      fontWeight: '800',
    },
  textInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: appRadius.control,
      minHeight: 40,
      paddingHorizontal: 12,
    },
  textInputField: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      paddingVertical: 8,
    },
});

export { styles };
