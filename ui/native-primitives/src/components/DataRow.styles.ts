import { StyleSheet } from 'react-native';
import { appTypography } from '../tokens';

const styles = StyleSheet.create({
  dataRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      minHeight: 48,
    },
  dataRowBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
  dataRowMain: {
      flex: 1,
      minWidth: 0,
    },
  dataRowSubtitle: {
      ...appTypography.caption,
    },
  dataRowTitle: {
      ...appTypography.bodyStrong,
    },
  dataRowTrailing: {
      flexShrink: 0,
      marginLeft: 12,
    },
});

export { styles };
