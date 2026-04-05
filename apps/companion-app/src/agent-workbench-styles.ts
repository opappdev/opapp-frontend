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
 * Conversation-first workbench layout — Codex-inspired.
 *
 * Sidebar rail (threads + runs)
 * | central conversation transcript (the hero)
 * | contextual detail drawer (only when a file/diff/artifact is selected)
 */
const sidebarWidth = 260;
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

    /* ── Toolbar (minimal top bar) ────────────────────── */
    toolbar: {
      justifyContent: 'flex-start',
      paddingVertical: 2,
      paddingHorizontal: appSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      minHeight: 36,
    },
    toolbarBusy: {
      minWidth: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolbarGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    toolbarDivider: {
      width: 1,
      height: 16,
      backgroundColor: palette.border,
      marginHorizontal: appSpacing.xs,
      opacity: 0.5,
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

    /* ── Status feedback bar ──────────────────────────── */
    feedbackBar: {
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: 4,
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

    /** Narrow sidebar rail — threads & runs first */
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
      paddingTop: appSpacing.md,
      paddingBottom: appSpacing.sm2,
      gap: appSpacing.sm,
    },

    /** Main conversation area — single transcript column */
    mainPane: {
      flex: 1,
    },
    mainPaneCompact: {
      width: '100%',
    },
    /** Main pane scrollable body — generous horizontal padding, tight vertical */
    mainPaneInner: {
      flex: 1,
      gap: appSpacing.xs,
      paddingHorizontal: 36,
      paddingTop: appSpacing.lg2,
      paddingBottom: appSpacing.sm2,
    },

    /** Right detail: truly contextual — only when a file/diff/artifact is selected */
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
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.sm2,
      gap: appSpacing.sm2,
    },

    /* ── Section containers ───────────────────────────── */
    sectionCard: {
      gap: appSpacing.sm2,
    },
    sectionCardCompact: {
      gap: appSpacing.sm,
    },
    sectionCardPrimary: {
      gap: appSpacing.md,
      borderRadius: appRadius.control,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.lg,
    },
    /** Section labels — sentence-case, muted, compact */
    sectionTitle: {
      color: palette.inkSoft,
      ...appTypography.label,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 2,
      marginTop: appSpacing.xs,
    },
    sectionDescription: {
      color: palette.inkMuted,
      ...appTypography.caption,
    },
    sectionBody: {
      gap: appSpacing.sm,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: palette.border,
      marginVertical: appSpacing.sm2,
      opacity: 0.4,
    },

    /* ── Sidebar list rows ────────────────────────────── */
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.xs,
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
      height: 18,
      borderRadius: 1.5,
      backgroundColor: palette.accent,
    },

    /* ── Approval / action grids ──────────────────────── */
    approvalPanel: {
      gap: appSpacing.sm2,
    },
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm,
      paddingTop: appSpacing.xxs,
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
      minHeight: 38,
      borderWidth: 1,
      borderRadius: appRadius.compact,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.sm2,
    },
    textInputField: {
      minHeight: 38,
      paddingVertical: appSpacing.xs,
      fontSize: appTypography.body.fontSize,
      lineHeight: appTypography.body.lineHeight,
    },
    textInputPlaceholder: {
      width: '100%',
      minHeight: 38,
      borderWidth: 1,
      borderRadius: appRadius.compact,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.xs,
    },
    textInputMultilineShell: {
      minHeight: 60,
      borderRadius: appRadius.compact,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      paddingVertical: appSpacing.sm,
    },
    textInputMultiline: {
      minHeight: 44,
    },

    /* ── Lists ────────────────────────────────────────── */
    threadList: {
      gap: 3,
    },
    timelineList: {
      gap: appSpacing.sm2,
    },
    timelineStepList: {
      gap: 3,
    },
    timelineStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      borderRadius: appRadius.badge,
      borderWidth: 0,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.xxs,
    },
    timelineStepText: {
      flex: 1,
      minWidth: 0,
    },

    /* ── Conversation transcript items ────────────────── */
    messageItem: {
      gap: appSpacing.xs,
      paddingVertical: appSpacing.sm2,
      paddingHorizontal: appSpacing.md,
      borderRadius: appRadius.compact,
    },
    messageItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
    },
    messageItemRole: {
      ...appTypography.captionBold,
      color: palette.accent,
      letterSpacing: 0.4,
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

    /* ── Tool invocation card (inline, borderless) ────── */
    toolCard: {
      gap: appSpacing.sm,
      borderRadius: appRadius.compact,
      borderWidth: 0,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.md,
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
      gap: appSpacing.sm2,
      paddingLeft: appSpacing.xxs,
    },
    toolCardMetaItem: {
      ...appTypography.label,
      color: palette.inkSoft,
    },

    /* ── Expander body ────────────────────────────────── */
    expanderBody: {
      gap: appSpacing.sm2,
      paddingTop: appSpacing.xs,
    },

    /* ── Terminal / code output ────────────────────────── */
    terminalBox: {
      borderRadius: appRadius.compact,
      borderWidth: 0,
      paddingHorizontal: appSpacing.md,
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
    },

    /* ── Historical run banner ────────────────────────── */
    historicalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.md,
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.xs,
      backgroundColor: palette.panelEmphasis,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },

    /* ── Conversation empty state ─────────────────────── */
    conversationEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      gap: appSpacing.md,
    },
    conversationEmptyTitle: {
      ...appTypography.title,
      color: palette.inkMuted,
      opacity: 0.6,
    },
    conversationEmptyHint: {
      ...appTypography.body,
      color: palette.inkSoft,
      textAlign: 'center',
      maxWidth: 440,
      lineHeight: 24,
      opacity: 0.7,
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
      borderRadius: appRadius.compact,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: 'hidden',
      alignSelf: 'flex-start',
    },
    modeToggleItem: {
      paddingHorizontal: appSpacing.md,
      paddingVertical: 4,
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
    },

    /* ── Composer (task input bar) ─────────────────────── */
    composerBar: {
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.panel,
      paddingHorizontal: 36,
      paddingVertical: appSpacing.md,
      gap: appSpacing.sm2,
    },
    composerInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: appSpacing.sm2,
    },
    composerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
    },

    /* ── Transcript inline elements ───────────────────── */
    transcriptDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
      marginVertical: appSpacing.xs,
      opacity: 0.3,
    },
    /** Inline terminal block within transcript */
    transcriptTerminal: {
      borderRadius: appRadius.compact,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.sm2,
      marginVertical: 2,
    },

    /* ── Workspace selector (collapsed in sidebar) ────── */
    workspaceSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.xs,
      borderRadius: appRadius.compact,
      backgroundColor: palette.canvasShade,
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
