import { StyleSheet, Platform } from 'react-native';
import { appRadius } from '../tokens';

const styles = StyleSheet.create({
  popoverAnchorWrapper: {
    position: 'relative',
  },
  popoverPanel: {
    position: 'absolute',
    left: 0,
    minWidth: '100%',
    borderRadius: appRadius.compact,
    borderWidth: 1,
    paddingVertical: 4,
    zIndex: 200,
    ...Platform.select({
      windows: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      default: {},
    }),
  },
});

export { styles };
