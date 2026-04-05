import {Platform, StyleSheet} from 'react-native';
import {
  appRadius,
  appSpacing,
  appTypography,
  type AppPalette,
} from '@opapp/ui-native-primitives';

export const terminalFontFamily =
  Platform.OS === 'windows' ? 'Consolas' : undefined;
export const textInputWarmupDelayMs = Platform.OS === 'windows' ? 1200 : 0;

/**
 * Codex / Copilot-grade workbench layout — Phase 7.
 *
 * Design principles (informed by Copilot Agent & Codex desktop):
 * 1. Conversation is the product — the main pane IS the experience.
 * 2. Sidebar is navigation chrome — compact, scannable, never distracting.
 * 3. Detail pane is contextual overlay — hidden unless user inspects a file.
 * 4. Composer is the call-to-action — prominent, always within reach.
 * 5. System meta recedes — run ID, timestamps, event counts are secondary.
 * 6. Terminal/code output reads like inline evidence — not separate panels.
 * 7. Approval & error are interrupts — visually distinct conversation breaks.
 */
const sidebarWidth = 240;
const detailPaneWidth = 320;

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

    /* ── Toolbar (minimal status bar) ─────────────────── */
    toolbar: {
      justifyContent: 'flex-start',
      paddingVertical: 3,
      paddingHorizontal: appSpacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
      backgroundColor: palette.canvas,
      minHeight: 34,
    },
    toolbarBusy: {
      minWidth: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolbarGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
    },
    toolbarDivider: {
      width: StyleSheet.hairlineWidth,
      height: 12,
      backgroundColor: palette.border,
      marginHorizontal: appSpacing.xs,
      opacity: 0.4,
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

    /* ── Status feedback bar ──────────────────────────── */
    feedbackBar: {
      paddingHorizontal: 32,
      paddingVertical: appSpacing.xs,
      backgroundColor: palette.panel,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },

    /* ── 2+1 zone layout ──────────────────────────────── */
    contentShell: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    contentShellCompact: {
      flexDirection: 'column',
    },

    /** Sidebar rail — compact navigation */
    sidebar: {
      width: sidebarWidth,
      backgroundColor: palette.canvas,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: palette.border,
    },
    sidebarCompact: {
      width: '100%',
      borderRightWidth: 0,
    },
    sidebarInner: {
      flex: 1,
      paddingHorizontal: appSpacing.sm,
      paddingTop: appSpacing.lg,
      paddingBottom: appSpacing.md,
      gap: appSpacing.lg,
    },

    /** Main conversation area — generous, breathing */
    mainPane: {
      flex: 1,
    },
    mainPaneCompact: {
      width: '100%',
    },
    /** Main pane scrollable body */
    mainPaneInner: {
      flex: 1,
      gap: appSpacing.md,
      paddingHorizontal: 56,
      paddingTop: 24,
      paddingBottom: 40,
    },

    /** Right detail drawer — contextual, only when needed */
    detailPane: {
      width: detailPaneWidth,
      backgroundColor: palette.panel,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: palette.border,
    },
    detailPaneCompact: {
      width: '100%',
      borderLeftWidth: 0,
    },
    detailPaneInner: {
      flex: 1,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.lg2,
      gap: appSpacing.lg2,
    },

    /* ── Section containers ───────────────────────────── */
    sectionCard: {
      gap: appSpacing.md,
    },
    sectionCardCompact: {
      gap: appSpacing.sm,
    },
    sectionCardPrimary: {
      gap: appSpacing.md,
      borderRadius: appRadius.compact,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.lg,
    },
    /** Section labels — muted, compact, no heavy decoration */
    sectionTitle: {
      color: palette.inkSoft,
      ...appTypography.label,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    sectionDescription: {
      color: palette.inkMuted,
      ...appTypography.caption,
      lineHeight: 18,
      opacity: 0.6,
    },
    sectionBody: {
      gap: appSpacing.sm2,
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
      marginVertical: appSpacing.xs,
      opacity: 0.2,
    },

    /* ── Sidebar list rows ────────────────────────────── */
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 6,
      borderRadius: appRadius.badge,
    },
    listRowActive: {
      backgroundColor: palette.panelEmphasis,
    },
    listRowLabel: {
      ...appTypography.caption,
      color: palette.ink,
      flex: 1,
      minWidth: 0,
    },
    listRowMeta: {
      ...appTypography.label,
      color: palette.inkSoft,
    },
    listRowDetail: {
      ...appTypography.label,
      color: palette.inkMuted,
    },
    listRowIndicator: {
      width: 2,
      height: 16,
      borderRadius: 1,
      backgroundColor: palette.accent,
    },

    /* ── Approval / action grids ──────────────────────── */
    approvalPanel: {
      gap: appSpacing.lg,
    },
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm2,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm2,
      paddingTop: appSpacing.sm,
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
      ...appTypography.label,
      opacity: 0.5,
    },
    textInputShell: {
      width: '100%',
      minHeight: 40,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: appRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.lg2,
    },
    textInputField: {
      minHeight: 40,
      paddingVertical: appSpacing.sm,
      fontSize: appTypography.body.fontSize,
      lineHeight: appTypography.body.lineHeight,
    },
    textInputPlaceholder: {
      width: '100%',
      minHeight: 40,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: appRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.sm,
    },
    textInputMultilineShell: {
      minHeight: 56,
      borderRadius: appRadius.control,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      paddingVertical: appSpacing.sm,
    },
    textInputMultiline: {
      minHeight: 40,
    },

    /* ── Lists ────────────────────────────────────────── */
    threadList: {
      gap: 1,
    },
    timelineList: {
      gap: appSpacing.sm2,
    },
    timelineStepList: {
      gap: 2,
    },
    timelineStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      borderRadius: appRadius.badge,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.xs,
    },
    timelineStepText: {
      flex: 1,
      minWidth: 0,
    },

    /* ── Conversation transcript items ────────────────── */
    messageItem: {
      gap: appSpacing.sm,
      paddingVertical: appSpacing.sm2,
      paddingHorizontal: appSpacing.lg2,
      borderRadius: appRadius.compact,
    },
    messageItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
    },
    messageItemRole: {
      ...appTypography.label,
      color: palette.inkSoft,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    messageItemTime: {
      ...appTypography.label,
      color: palette.inkMuted,
      opacity: 0.5,
    },
    messageItemContent: {
      ...appTypography.body,
      color: palette.ink,
      lineHeight: 22,
    },

    /* ── Tool invocation card ─────────────────────────── */
    toolCard: {
      gap: appSpacing.sm,
      borderRadius: appRadius.compact,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm2,
    },
    toolCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
    },
    toolCardTitle: {
      ...appTypography.captionBold,
      color: palette.ink,
      flex: 1,
    },
    toolCardMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm,
      paddingLeft: appSpacing.xxs,
    },
    toolCardMetaItem: {
      ...appTypography.label,
      color: palette.inkMuted,
    },

    /* ── Expander body ────────────────────────────────── */
    expanderBody: {
      gap: appSpacing.sm2,
      paddingTop: appSpacing.xxs,
    },

    /* ── Terminal / code output ────────────────────────── */
    terminalBox: {
      borderRadius: appRadius.badge,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm2,
    },
    terminalScroll: {
      maxHeight: 360,
    },
    terminalText: {
      fontSize: 12,
      lineHeight: 18,
    },

    /* ── Summary pill row ─────────────────────────────── */
    summaryPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm,
      paddingVertical: appSpacing.xxs,
    },

    /* ── Historical run banner ────────────────────────── */
    historicalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.md,
      paddingHorizontal: 32,
      paddingVertical: appSpacing.xs,
      backgroundColor: palette.panel,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },

    /* ── Conversation empty state ─────────────────────── */
    conversationEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 120,
      gap: appSpacing.lg,
    },
    conversationEmptyTitle: {
      ...appTypography.title,
      color: palette.inkMuted,
      opacity: 0.25,
      letterSpacing: -0.3,
    },
    conversationEmptyHint: {
      ...appTypography.body,
      color: palette.inkSoft,
      textAlign: 'center',
      maxWidth: 340,
      lineHeight: 22,
      opacity: 0.4,
    },

    /* ── Run actions inline row ───────────────────────── */
    runActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingTop: 2,
    },

    /* ── Mode toggle ──────────────────────────────────── */
    modeToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
      borderRadius: appRadius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      overflow: 'hidden',
      alignSelf: 'flex-start',
    },
    modeToggleItem: {
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.xs,
    },
    modeToggleItemActive: {
      backgroundColor: palette.panelEmphasis,
    },
    modeToggleLabel: {
      ...appTypography.caption,
      color: palette.inkMuted,
      letterSpacing: 0.3,
    },
    modeToggleLabelActive: {
      color: palette.ink,
      fontWeight: '600',
    },

    /* ── Composer (task input bar) ─────────────────────── */
    composerBar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
      backgroundColor: palette.canvas,
      paddingHorizontal: 56,
      paddingVertical: appSpacing.lg,
      gap: appSpacing.sm,
    },
    composerInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: appSpacing.sm,
    },
    composerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm2,
    },

    /* ── Transcript inline elements ───────────────────── */
    transcriptDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
      marginVertical: appSpacing.xs,
      opacity: 0.2,
    },
    /** Inline terminal block within transcript */
    transcriptTerminal: {
      borderRadius: appRadius.badge,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm,
      marginVertical: 1,
    },

    /* ── Workspace selector (collapsed in sidebar) ────── */
    workspaceSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 6,
      borderRadius: appRadius.badge,
      backgroundColor: palette.panelEmphasis,
    },
    workspaceSelectorLabel: {
      ...appTypography.caption,
      color: palette.inkMuted,
      flex: 1,
      minWidth: 0,
    },
  });
}

export const baseStyles = StyleSheet.create({
  detailField: {
    flexGrow: 1,
    minWidth: 120,
    gap: 2,
    borderRadius: appRadius.badge,
    paddingHorizontal: appSpacing.sm,
    paddingVertical: appSpacing.xs,
  },
  detailFieldLabel: {
    ...appTypography.label,
    opacity: 0.4,
  },
  detailFieldValue: {
    ...appTypography.caption,
  },
});
