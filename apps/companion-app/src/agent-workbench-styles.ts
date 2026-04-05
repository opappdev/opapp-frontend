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
 * Conversation-first workbench layout — Codex / Copilot-inspired.
 *
 * Phase 5 redesign: elevated depth, generous breathing room, polished
 * typographic hierarchy, and clear interaction affordances.
 *
 * Sidebar rail (threads + runs)
 * | central conversation transcript (the hero)
 * | contextual detail drawer (file browser / diffs)
 */
const sidebarWidth = 280;
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

    /* ── Toolbar (compact command bar) ────────────────── */
    toolbar: {
      justifyContent: 'flex-start',
      paddingVertical: appSpacing.xxs,
      paddingHorizontal: appSpacing.lg2,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      minHeight: 40,
    },
    toolbarBusy: {
      minWidth: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolbarGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xxs,
    },
    toolbarDivider: {
      width: 1,
      height: 18,
      backgroundColor: palette.border,
      marginHorizontal: appSpacing.sm,
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
      paddingHorizontal: 40,
      paddingVertical: appSpacing.sm,
      backgroundColor: palette.panelEmphasis,
      borderBottomWidth: 1,
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

    /** Sidebar rail — threads & runs first */
    sidebar: {
      width: sidebarWidth,
      backgroundColor: palette.panel,
      borderRightWidth: 1,
      borderRightColor: palette.border,
    },
    sidebarCompact: {
      width: '100%',
      borderRightWidth: 0,
    },
    sidebarInner: {
      flex: 1,
      paddingHorizontal: appSpacing.sm2,
      paddingTop: appSpacing.lg2,
      paddingBottom: appSpacing.md,
      gap: appSpacing.xl,
    },

    /** Main conversation area — single transcript column */
    mainPane: {
      flex: 1,
    },
    mainPaneCompact: {
      width: '100%',
    },
    /** Main pane scrollable body — generous horizontal padding */
    mainPaneInner: {
      flex: 1,
      gap: appSpacing.sm2,
      paddingHorizontal: 40,
      paddingTop: appSpacing.xxl,
      paddingBottom: appSpacing.xl,
    },

    /** Right detail drawer */
    detailPane: {
      width: detailPaneWidth,
      backgroundColor: palette.panel,
      borderLeftWidth: 1,
      borderLeftColor: palette.border,
    },
    detailPaneCompact: {
      width: '100%',
      borderLeftWidth: 0,
    },
    detailPaneInner: {
      flex: 1,
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.lg2,
      gap: appSpacing.lg,
    },

    /* ── Section containers ───────────────────────────── */
    sectionCard: {
      gap: appSpacing.md,
    },
    sectionCardCompact: {
      gap: appSpacing.md,
    },
    sectionCardPrimary: {
      gap: appSpacing.md,
      borderRadius: appRadius.control,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.xl2,
      paddingVertical: appSpacing.lg2,
    },
    /** Section labels — uppercase, muted, compact */
    sectionTitle: {
      color: palette.inkSoft,
      ...appTypography.label,
      letterSpacing: 1.0,
      textTransform: 'uppercase',
      marginBottom: appSpacing.xs,
      paddingBottom: appSpacing.xxs,
    },
    sectionDescription: {
      color: palette.inkMuted,
      ...appTypography.caption,
      lineHeight: 18,
      opacity: 0.7,
    },
    sectionBody: {
      gap: appSpacing.sm2,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: palette.border,
      marginVertical: appSpacing.xs,
      opacity: 0.4,
    },

    /* ── Sidebar list rows ────────────────────────────── */
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.sm2,
      borderRadius: appRadius.compact,
    },
    listRowActive: {
      backgroundColor: palette.accentSoft,
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
      width: 3,
      height: 20,
      borderRadius: 1.5,
      backgroundColor: palette.accent,
    },

    /* ── Approval / action grids ──────────────────────── */
    approvalPanel: {
      gap: appSpacing.md,
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
      paddingTop: appSpacing.xs,
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
      borderWidth: 1,
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
      borderWidth: 1,
      borderRadius: appRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.sm,
    },
    textInputMultilineShell: {
      minHeight: 64,
      borderRadius: appRadius.control,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      paddingVertical: appSpacing.sm2,
    },
    textInputMultiline: {
      minHeight: 48,
    },

    /* ── Lists ────────────────────────────────────────── */
    threadList: {
      gap: 2,
    },
    timelineList: {
      gap: appSpacing.xl,
    },
    timelineStepList: {
      gap: appSpacing.xxs,
    },
    timelineStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      borderRadius: appRadius.badge,
      borderWidth: 0,
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
      paddingVertical: appSpacing.lg2,
      paddingHorizontal: appSpacing.lg2,
      borderRadius: appRadius.control,
    },
    messageItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm2,
    },
    messageItemRole: {
      ...appTypography.captionBold,
      color: palette.accent,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    messageItemTime: {
      ...appTypography.label,
      color: palette.inkSoft,
    },
    messageItemContent: {
      ...appTypography.body,
      color: palette.ink,
      lineHeight: 24,
    },

    /* ── Tool invocation card ─────────────────────────── */
    toolCard: {
      gap: appSpacing.sm2,
      borderRadius: appRadius.control,
      borderWidth: 0,
      borderLeftWidth: 2,
      borderLeftColor: palette.accent,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.md,
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
      gap: appSpacing.sm2,
      paddingLeft: appSpacing.xxs,
    },
    toolCardMetaItem: {
      ...appTypography.label,
      color: palette.inkSoft,
    },

    /* ── Expander body ────────────────────────────────── */
    expanderBody: {
      gap: appSpacing.md,
      paddingTop: appSpacing.xs,
    },

    /* ── Terminal / code output ────────────────────────── */
    terminalBox: {
      borderRadius: appRadius.control,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.sm2,
    },
    terminalScroll: {
      maxHeight: 360,
    },
    terminalText: {
      fontSize: 12,
      lineHeight: 20,
    },

    /* ── Summary pill row ─────────────────────────────── */
    summaryPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm,
      paddingVertical: appSpacing.xs,
      paddingHorizontal: appSpacing.xxs,
    },

    /* ── Historical run banner ────────────────────────── */
    historicalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.md,
      paddingHorizontal: 40,
      paddingVertical: appSpacing.sm2,
      backgroundColor: palette.panelEmphasis,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },

    /* ── Conversation empty state ─────────────────────── */
    conversationEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 120,
      gap: appSpacing.xl2,
    },
    conversationEmptyTitle: {
      ...appTypography.headline,
      color: palette.inkMuted,
      opacity: 0.4,
      letterSpacing: -0.5,
    },
    conversationEmptyHint: {
      ...appTypography.body,
      color: palette.inkSoft,
      textAlign: 'center',
      maxWidth: 420,
      lineHeight: 24,
      opacity: 0.5,
    },

    /* ── Run actions inline row ───────────────────────── */
    runActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm2,
      paddingVertical: appSpacing.xs,
    },

    /* ── Mode toggle ──────────────────────────────────── */
    modeToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
      borderRadius: appRadius.pill,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: 'hidden',
      alignSelf: 'flex-start',
    },
    modeToggleItem: {
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.xs,
    },
    modeToggleItemActive: {
      backgroundColor: palette.accentSoft,
    },
    modeToggleLabel: {
      ...appTypography.caption,
      color: palette.inkMuted,
      letterSpacing: 0.3,
    },
    modeToggleLabelActive: {
      color: palette.accent,
      fontWeight: '700',
    },

    /* ── Composer (task input bar) ─────────────────────── */
    composerBar: {
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.panelEmphasis,
      paddingHorizontal: 40,
      paddingVertical: appSpacing.lg2,
      gap: appSpacing.md,
    },
    composerInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: appSpacing.sm2,
    },
    composerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm2,
    },

    /* ── Transcript inline elements ───────────────────── */
    transcriptDivider: {
      height: 1,
      backgroundColor: palette.border,
      marginVertical: appSpacing.sm,
      opacity: 0.2,
    },
    /** Inline terminal block within transcript */
    transcriptTerminal: {
      borderRadius: appRadius.control,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.sm2,
      marginVertical: appSpacing.xxs,
    },

    /* ── Workspace selector (collapsed in sidebar) ────── */
    workspaceSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.sm2,
      borderRadius: appRadius.control,
      backgroundColor: palette.canvasShade,
      borderWidth: 1,
      borderColor: palette.border,
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
    borderWidth: 1,
    paddingHorizontal: appSpacing.sm,
    paddingVertical: appSpacing.xs,
  },
  detailFieldLabel: {
    ...appTypography.label,
    opacity: 0.5,
  },
  detailFieldValue: {
    ...appTypography.caption,
  },
});
