import { StyleSheet } from 'react-native';
import { appRadius, appTypography } from '../tokens';

const styles = StyleSheet.create({
  expander: {
      borderWidth: 1,
      borderRadius: appRadius.control,
      overflow: 'hidden',
    },
  expanderChevron: {
      fontSize: 14,
      fontWeight: '800',
      width: 16,
      textAlign: 'center',
    },
  expanderContent: {
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
  expanderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  expanderTitle: {
      ...appTypography.bodyStrong,
      flex: 1,
    },
  expanderTrailing: {
      flexShrink: 0,
      marginLeft: 8,
    },
});

export { styles };
