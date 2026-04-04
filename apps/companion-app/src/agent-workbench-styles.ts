import {Platform, StyleSheet} from 'react-native';
import {
  appLayout,
  appRadius,
  appSpacing,
  appTypography,
  type AppPalette,
} from '@opapp/ui-native-primitives';

export const terminalFontFamily =
  Platform.OS === 'windows' ? 'Consolas' : undefined;
export const textInputWarmupDelayMs = Platform.OS === 'windows' ? 1200 : 0;

export function createScreenStyles(palette: AppPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.canvas,
    },
    scroll: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingBottom: appSpacing.xl,
    },
    stack: {
      gap: appSpacing.lg,
    },
    loadingShell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.canvas,
    },
    toolbar: {
      justifyContent: 'space-between',
    },
    toolbarBusy: {
      minWidth: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoText: {
      ...appTypography.body,
    },
    loadingInline: {
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contentShell: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: appSpacing.lg,
    },
    contentShellCompact: {
      flexDirection: 'column',
    },
    sidebar: {
      flex: 0.95,
      gap: appSpacing.lg,
    },
    sidebarCompact: {
      width: '100%',
    },
    detailPane: {
      flex: 1.05,
      gap: appSpacing.lg,
    },
    detailPaneCompact: {
      width: '100%',
    },
    sectionCard: {
      gap: appSpacing.md,
      borderRadius: appRadius.panel,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.lg,
    },
    sectionTitle: {
      color: palette.ink,
      ...appTypography.sectionTitle,
    },
    sectionDescription: {
      color: palette.inkMuted,
      ...appTypography.body,
    },
    sectionBody: {
      gap: appSpacing.md,
    },
    approvalPanel: {
      gap: appSpacing.md,
    },
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.md,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm,
    },
    choiceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.md,
    },
    choiceChip: {
      maxWidth: '100%',
    },
    inputFieldGroup: {
      gap: appSpacing.xs,
    },
    inputLabel: {
      ...appTypography.captionStrong,
    },
    textInputShell: {
      width: '100%',
      minHeight: 48,
      borderWidth: 1,
      borderRadius: appRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.md,
    },
    textInputField: {
      minHeight: 48,
      paddingVertical: appSpacing.sm,
      fontSize: appTypography.body.fontSize,
      lineHeight: appTypography.body.lineHeight,
    },
    textInputPlaceholder: {
      width: '100%',
      minHeight: 48,
      borderWidth: 1,
      borderRadius: appRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.sm,
    },
    textInputMultilineShell: {
      minHeight: 96,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      paddingVertical: appSpacing.sm,
    },
    textInputMultiline: {
      minHeight: 76,
    },
    threadList: {
      gap: appSpacing.sm,
    },
    timelineList: {
      gap: appSpacing.sm,
    },
    timelineStepList: {
      gap: appSpacing.sm,
    },
    timelineStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      borderRadius: appRadius.control,
      borderWidth: 1,
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.sm,
    },
    timelineStepText: {
      flex: 1,
      minWidth: 0,
    },
    expanderBody: {
      gap: appSpacing.md,
      paddingTop: appSpacing.sm,
    },
    terminalBox: {
      borderRadius: appRadius.control,
      borderWidth: 1,
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.md,
    },
    terminalScroll: {
      maxHeight: 260,
    },
    terminalText: {
      fontSize: 12,
      lineHeight: 18,
    },
  });
}

export const baseStyles = StyleSheet.create({
  detailField: {
    flexGrow: 1,
    minWidth: 180,
    gap: appSpacing.xs,
    borderRadius: appRadius.control,
    borderWidth: 1,
    paddingHorizontal: appSpacing.md,
    paddingVertical: appSpacing.sm,
  },
  detailFieldLabel: {
    ...appTypography.captionStrong,
  },
  detailFieldValue: {
    ...appTypography.body,
  },
});
