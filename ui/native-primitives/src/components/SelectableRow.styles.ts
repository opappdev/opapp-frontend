import { StyleSheet } from 'react-native';
import { appFontFamily, appRadius, appTypography } from '../tokens';

const styles = StyleSheet.create({
  selectableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: appRadius.control,
    borderWidth: 1,
    gap: 10,
    overflow: 'hidden',
  },
  selectableRowPressed: {
    opacity: 0.9,
  },
  selectableRowIndicator: {
    width: 2,
    height: 24,
    borderRadius: 1,
    marginLeft: 10,
    flexShrink: 0,
  },
  selectableRowLeading: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectableRowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingVertical: 10,
  },
  selectableRowTrailing: {
    flexShrink: 0,
    minWidth: 0,
    marginRight: 10,
  },
  selectableRowTitle: {
    ...appTypography.bodyStrong,
    fontFamily: appFontFamily,
    minWidth: 0,
  },
  selectableRowTitleSelected: {
    fontWeight: '800',
  },
  selectableRowSubtitle: {
    ...appTypography.caption,
    fontFamily: appFontFamily,
    minWidth: 0,
  },
  selectableRowMeta: {
    ...appTypography.label,
    fontFamily: appFontFamily,
    minWidth: 0,
  },
});

export { styles };
