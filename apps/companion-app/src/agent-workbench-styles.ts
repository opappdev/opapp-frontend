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

/**
 * Three-zone layout widths used by the workbench shell.
 * sidebar (threads/workspace) | main (task input + timeline) | context (inspector/run-detail)
 */
const sidebarFlex = 0.22;
const mainFlex = 0.50;
const contextFlex = 0.28;

export function createScreenStyles(palette: AppPalette) {
  return StyleSheet.create({
    /* ── Screen chrome ────────────────────────────────── */
    screen: {
      flex: 1,
      backgroundColor: palette.canvas,
    },
    scroll: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingBottom: appSpacing.lg,
    },
    stack: {
      gap: appSpacing.md,
    },
    loadingShell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.canvas,
    },

    /* ── Toolbar ──────────────────────────────────────── */
    toolbar: {
      justifyContent: 'flex-start',
    },
    toolbarBusy: {
      minWidth: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ── Info / feedback ──────────────────────────────── */
    infoText: {
      ...appTypography.body,
    },
    loadingInline: {
      minHeight: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ── 3-zone layout ────────────────────────────────── */
    contentShell: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: appSpacing.md,
    },
    contentShellCompact: {
      flexDirection: 'column',
    },
    /** Left sidebar: threads + workspace selector */
    sidebar: {
      flex: sidebarFlex,
      gap: appSpacing.md,
    },
    sidebarCompact: {
      width: '100%',
    },
    /** Centre main: task input + timeline + terminal */
    mainPane: {
      flex: mainFlex,
      gap: appSpacing.md,
    },
    mainPaneCompact: {
      width: '100%',
    },
    /** Right context: inspector + run detail + run history */
    detailPane: {
      flex: contextFlex,
      gap: appSpacing.md,
    },
    detailPaneCompact: {
      width: '100%',
    },

    /* ── Section cards ────────────────────────────────── */
    sectionCard: {
      gap: appSpacing.sm,
      borderRadius: appRadius.panel,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.md,
    },
    /** Minimised section used in sidebar – tighter padding */
    sectionCardCompact: {
      gap: appSpacing.xs,
      borderRadius: appRadius.compact,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.sm,
    },
    /** Primary section – slightly stronger panel to anchor attention */
    sectionCardPrimary: {
      gap: appSpacing.sm,
      borderRadius: appRadius.panel,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.md,
    },
    sectionTitle: {
      color: palette.ink,
      ...appTypography.captionBold,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      opacity: 0.7,
    },
    sectionDescription: {
      color: palette.inkMuted,
      ...appTypography.caption,
    },
    sectionBody: {
      gap: appSpacing.sm,
    },

    /* ── Approval / detail grids ──────────────────────── */
    approvalPanel: {
      gap: appSpacing.sm,
    },
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.xs,
    },
    choiceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm,
    },
    choiceChip: {
      maxWidth: '100%',
    },

    /* ── Input fields ─────────────────────────────────── */
    inputFieldGroup: {
      gap: appSpacing.xxs,
    },
    inputLabel: {
      ...appTypography.captionStrong,
      opacity: 0.6,
    },
    textInputShell: {
      width: '100%',
      minHeight: 40,
      borderWidth: 1,
      borderRadius: appRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.sm,
    },
    textInputField: {
      minHeight: 40,
      paddingVertical: appSpacing.xs,
      fontSize: appTypography.body.fontSize,
      lineHeight: appTypography.body.lineHeight,
    },
    textInputPlaceholder: {
      width: '100%',
      minHeight: 40,
      borderWidth: 1,
      borderRadius: appRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.xs,
    },
    textInputMultilineShell: {
      minHeight: 72,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      paddingVertical: appSpacing.xs,
    },
    textInputMultiline: {
      minHeight: 56,
    },

    /* ── Lists ────────────────────────────────────────── */
    threadList: {
      gap: appSpacing.xs,
    },
    timelineList: {
      gap: appSpacing.xs,
    },
    timelineStepList: {
      gap: appSpacing.xs,
    },
    timelineStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      borderRadius: appRadius.compact,
      borderWidth: 1,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.xs,
    },
    timelineStepText: {
      flex: 1,
      minWidth: 0,
    },

    /* ── Expander body ────────────────────────────────── */
    expanderBody: {
      gap: appSpacing.sm,
      paddingTop: appSpacing.xs,
    },

    /* ── Terminal / code output ────────────────────────── */
    terminalBox: {
      borderRadius: appRadius.compact,
      borderWidth: 1,
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.sm,
    },
    terminalScroll: {
      maxHeight: 320,
    },
    terminalText: {
      fontSize: 12,
      lineHeight: 17,
    },

    /* ── Summary pill row ─────────────────────────────── */
    summaryPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.xs,
    },
  });
}

export const baseStyles = StyleSheet.create({
  detailField: {
    flexGrow: 1,
    minWidth: 140,
    gap: appSpacing.xxs,
    borderRadius: appRadius.compact,
    borderWidth: 1,
    paddingHorizontal: appSpacing.sm,
    paddingVertical: appSpacing.xs,
  },
  detailFieldLabel: {
    ...appTypography.label,
    opacity: 0.6,
  },
  detailFieldValue: {
    ...appTypography.caption,
  },
});
