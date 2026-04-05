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
 * Codex / Copilot-grade workbench layout — Phase 6.
 *
 * Design principles:
 * 1. Task is the hero — goal title first, system chrome recedes.
 * 2. Restrained color — accent used only for interactive/active states.
 * 3. Typography-driven hierarchy — weight & opacity, not color & borders.
 * 4. Generous breathing room — let the conversation breathe.
 * 5. Progressive disclosure — detail pane on-demand, sidebar compact.
 */
const sidebarWidth = 260;
const detailPaneWidth = 300;

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
      paddingVertical: appSpacing.xxs,
      paddingHorizontal: appSpacing.lg2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
      backgroundColor: palette.canvas,
      minHeight: 36,
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
      height: 14,
      backgroundColor: palette.border,
      marginHorizontal: appSpacing.sm,
      opacity: 0.5,
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
      paddingVertical: appSpacing.sm,
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

    /** Sidebar rail — threads & runs first */
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
      paddingHorizontal: appSpacing.sm2,
      paddingTop: appSpacing.lg2,
      paddingBottom: appSpacing.md,
      gap: appSpacing.lg2,
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
      gap: appSpacing.lg,
      paddingHorizontal: 48,
      paddingTop: 28,
      paddingBottom: appSpacing.xxl,
    },

    /** Right detail drawer */
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
      gap: appSpacing.lg,
    },
    sectionCardCompact: {
      gap: appSpacing.sm2,
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
      marginBottom: appSpacing.xxs,
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
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
      marginVertical: appSpacing.sm,
      opacity: 0.3,
    },

    /* ── Sidebar list rows ────────────────────────────── */
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.sm,
      borderRadius: appRadius.compact,
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
      height: 20,
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
      minHeight: 38,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: appRadius.compact,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.lg,
    },
    textInputField: {
      minHeight: 38,
      paddingVertical: appSpacing.sm,
      fontSize: appTypography.body.fontSize,
      lineHeight: appTypography.body.lineHeight,
    },
    textInputPlaceholder: {
      width: '100%',
      minHeight: 38,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: appRadius.compact,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm,
    },
    textInputMultilineShell: {
      minHeight: 56,
      borderRadius: appRadius.compact,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      paddingVertical: appSpacing.sm,
    },
    textInputMultiline: {
      minHeight: 40,
    },

    /* ── Lists ────────────────────────────────────────── */
    threadList: {
      gap: 2,
    },
    timelineList: {
      gap: appSpacing.lg2,
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
      paddingHorizontal: appSpacing.lg,
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
      opacity: 0.6,
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
      borderRadius: appRadius.compact,
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
      paddingVertical: appSpacing.xs,
      paddingHorizontal: appSpacing.sm,
      borderRadius: appRadius.compact,
    },

    /* ── Historical run banner ────────────────────────── */
    historicalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.md,
      paddingHorizontal: 32,
      paddingVertical: appSpacing.sm,
      backgroundColor: palette.panel,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },

    /* ── Conversation empty state ─────────────────────── */
    conversationEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 100,
      gap: appSpacing.xl,
    },
    conversationEmptyTitle: {
      ...appTypography.title,
      color: palette.inkMuted,
      opacity: 0.3,
      letterSpacing: -0.3,
    },
    conversationEmptyHint: {
      ...appTypography.body,
      color: palette.inkSoft,
      textAlign: 'center',
      maxWidth: 380,
      lineHeight: 22,
      opacity: 0.5,
    },

    /* ── Run actions inline row ───────────────────────── */
    runActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingTop: appSpacing.xs,
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
      backgroundColor: palette.panel,
      paddingHorizontal: 48,
      paddingVertical: appSpacing.lg,
      gap: appSpacing.sm2,
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
      borderRadius: appRadius.compact,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm2,
      marginVertical: appSpacing.xxs,
    },

    /* ── Workspace selector (collapsed in sidebar) ────── */
    workspaceSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.sm,
      borderRadius: appRadius.compact,
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
