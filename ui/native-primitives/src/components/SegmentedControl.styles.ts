import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius } from '../tokens';

const styles = StyleSheet.create({
  segmentedControl: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: appRadius.control,
      borderWidth: 1,
      overflow: 'hidden',
      alignSelf: 'flex-start',
      padding: 2,
      gap: 2,
    },
  segmentedControlLabel: {
      fontFamily: appFontFamily,
      fontWeight: '600',
    },
  segmentedControlLabelMd: {
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.3,
    },
  segmentedControlLabelSm: {
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.3,
    },
  segmentedControlSegment: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: appRadius.control - 2,
      borderWidth: 1,
    },
  segmentedControlSegmentMd: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      minHeight: 30,
    },
  segmentedControlSegmentSm: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      minHeight: 26,
    },
});

export { styles };
