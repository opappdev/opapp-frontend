import { StyleSheet } from 'react-native';
import { appTypography } from '../tokens';

const styles = StyleSheet.create({
  emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      paddingHorizontal: 24,
    },
  emptyStateDescription: {
      ...appTypography.body,
      textAlign: 'center',
      maxWidth: 480,
    },
  emptyStateTitle: {
      ...appTypography.title,
      textAlign: 'center',
    },
});

export { styles };
