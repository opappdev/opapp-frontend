import { StyleSheet } from 'react-native';
import { appRadius, appTypography } from '../tokens';

const styles = StyleSheet.create({
  timelineStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
  timelineStepBody: {
      flex: 1,
      paddingLeft: 14,
      borderLeftWidth: 2,
    },
  timelineStepDescription: {
      ...appTypography.body,
    },
  timelineStepMarker: {
      width: 42,
      minHeight: 42,
      borderRadius: appRadius.control,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
  timelineStepMarkerLabel: {
      ...appTypography.captionBold,
      letterSpacing: 0.4,
    },
  timelineStepTitle: {
      ...appTypography.subheading,
    },
  timelineStepWarning: {
      ...appTypography.captionBody,
    },
});

export { styles };
