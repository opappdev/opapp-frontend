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
const sidebarFlex = 0.24;
const mainFlex = 0.50;
const contextFlex = 0.26;

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
      paddingBottom: appSpacing.md,
    },
    stack: {
      gap: appSpacing.sm,
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
      paddingVertical: appSpacing.xxs,
    },
    toolbarBusy: {
      minWidth: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ── Info / feedback ──────────────────────────────── */
    infoText: {
      ...appTypography.body,
    },
    loadingInline: {
      minHeight: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ── 3-zone layout ────────────────────────────────── */
    contentShell: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 1,
    },
    contentShellCompact: {
      flexDirection: 'column',
    },
    /** Left sidebar: threads + workspace selector */
    sidebar: {
      flex: sidebarFlex,
      gap: 0,
      backgroundColor: palette.panel,
      borderRightWidth: 1,
      borderRightColor: palette.border,
    },
    sidebarCompact: {
      width: '100%',
      borderRightWidth: 0,
    },
    /** Sidebar inner padding container */
    sidebarInner: {
      flex: 1,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.sm,
      gap: appSpacing.sm2,
    },
    /** Centre main: task input + timeline + terminal */
    mainPane: {
      flex: mainFlex,
      gap: 0,
    },
    mainPaneCompact: {
      width: '100%',
    },
    /** Main pane inner content (scrollable) */
    mainPaneInner: {
      flex: 1,
      gap: appSpacing.sm,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm,
    },
    /** Right context: inspector + run detail */
    detailPane: {
      flex: contextFlex,
      gap: 0,
      backgroundColor: palette.panel,
      borderLeftWidth: 1,
      borderLeftColor: palette.border,
    },
    detailPaneCompact: {
      width: '100%',
      borderLeftWidth: 0,
    },
    /** Detail pane inner container */
    detailPaneInner: {
      flex: 1,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.sm,
      gap: appSpacing.sm2,
    },

    /* ── Section cards ────────────────────────────────── */
    sectionCard: {
      gap: appSpacing.sm,
      paddingVertical: appSpacing.xs,
    },
    /** Minimised section used in sidebar – no borders, just gaps */
    sectionCardCompact: {
      gap: appSpacing.xs,
      paddingVertical: appSpacing.xxs,
    },
    /** Primary section – task input area with subtle accent emphasis */
    sectionCardPrimary: {
      gap: appSpacing.sm,
      borderRadius: appRadius.panel,
      borderWidth: 1,
      borderColor: palette.accentSoft,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.md,
    },
    sectionTitle: {
      color: palette.inkMuted,
      ...appTypography.label,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      marginBottom: appSpacing.xxs,
    },
    sectionDescription: {
      color: palette.inkMuted,
      ...appTypography.caption,
    },
    sectionBody: {
      gap: appSpacing.sm,
    },
    /** Subtle divider between sidebar sections */
    sectionDivider: {
      height: 1,
      backgroundColor: palette.border,
      marginVertical: appSpacing.xxs,
    },

    /* ── Approval / detail grids ──────────────────────── */
    approvalPanel: {
      gap: appSpacing.sm,
    },
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.xs,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.xs,
    },
    choiceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.xs,
    },
    choiceChip: {
      maxWidth: '100%',
    },

    /* ── Input fields ─────────────────────────────────── */
    inputFieldGroup: {
      gap: appSpacing.xxs,
    },
    inputLabel: {
      ...appTypography.label,
      opacity: 0.5,
    },
    textInputShell: {
      width: '100%',
      minHeight: 38,
      borderWidth: 1,
      borderRadius: appRadius.pill,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.md,
    },
    textInputField: {
      minHeight: 38,
      paddingVertical: appSpacing.xxs,
      fontSize: appTypography.body.fontSize,
      lineHeight: appTypography.body.lineHeight,
    },
    textInputPlaceholder: {
      width: '100%',
      minHeight: 38,
      borderWidth: 1,
      borderRadius: appRadius.pill,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.xxs,
    },
    textInputMultilineShell: {
      minHeight: 72,
      borderRadius: appRadius.control,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      paddingVertical: appSpacing.xs,
    },
    textInputMultiline: {
      minHeight: 56,
    },

    /* ── Lists ────────────────────────────────────────── */
    threadList: {
      gap: 2,
    },
    timelineList: {
      gap: appSpacing.xs,
    },
    timelineStepList: {
      gap: 2,
    },
    timelineStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      borderRadius: appRadius.compact,
      borderWidth: 0,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 3,
    },
    timelineStepText: {
      flex: 1,
      minWidth: 0,
    },

    /* ── Conversation-style message items ─────────────── */
    messageItem: {
      gap: appSpacing.xxs,
      paddingVertical: appSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    messageItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
    },
    messageItemRole: {
      ...appTypography.captionBold,
      color: palette.accent,
    },
    messageItemTime: {
      ...appTypography.label,
      color: palette.inkSoft,
    },
    messageItemContent: {
      ...appTypography.body,
      color: palette.ink,
      lineHeight: 22,
    },

    /* ── Tool invocation card (compact) ───────────────── */
    toolCard: {
      gap: appSpacing.xs,
      borderRadius: appRadius.compact,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.xs,
    },
    toolCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
    },
    toolCardTitle: {
      ...appTypography.captionBold,
      color: palette.ink,
      flex: 1,
    },
    toolCardMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.xs,
      paddingLeft: appSpacing.xxs,
    },
    toolCardMetaItem: {
      ...appTypography.label,
      color: palette.inkSoft,
    },

    /* ── Expander body ────────────────────────────────── */
    expanderBody: {
      gap: appSpacing.xs,
      paddingTop: appSpacing.xxs,
    },

    /* ── Terminal / code output ────────────────────────── */
    terminalBox: {
      borderRadius: appRadius.compact,
      borderWidth: 0,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.xs,
    },
    terminalScroll: {
      maxHeight: 400,
    },
    terminalText: {
      fontSize: 12,
      lineHeight: 18,
    },

    /* ── Summary pill row ─────────────────────────────── */
    summaryPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.xxs,
    },
  });
}

export const baseStyles = StyleSheet.create({
  detailField: {
    flexGrow: 1,
    minWidth: 120,
    gap: 2,
    borderRadius: appRadius.compact,
    borderWidth: 1,
    paddingHorizontal: appSpacing.xs,
    paddingVertical: appSpacing.xxs,
  },
  detailFieldLabel: {
    ...appTypography.label,
    opacity: 0.5,
  },
  detailFieldValue: {
    ...appTypography.caption,
  },
});
