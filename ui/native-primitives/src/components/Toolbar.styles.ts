import { StyleSheet } from 'react-native';
import { appRadius } from '../tokens';

const styles = StyleSheet.create({
  toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: appRadius.control,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexWrap: 'wrap',
    },
});

export { styles };
