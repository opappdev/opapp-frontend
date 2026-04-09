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
const sidebarWidth = 228;
const detailPaneWidth = 320;

export function createScreenStyles(palette: AppPalette) {
  const workbenchRadius = {
    surface: appRadius.panel,
    control: appRadius.control,
    row: appRadius.compact,
    primaryAction: appRadius.compact,
  } as const;

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
    toolbarButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
    },
    toolbarBackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      alignSelf: 'flex-start',
      paddingHorizontal: 0,
      paddingVertical: appSpacing.xs,
    },
    toolbarBackButtonPressed: {
      opacity: 0.72,
    },
    toolbarBackLabel: {
      ...appTypography.captionStrong,
      color: palette.ink,
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
    inlineStatusNotice: {
      gap: 2,
      marginBottom: appSpacing.xs,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.control,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.xs,
    },
    inlineStatusNoticeNeutral: {
      borderColor: palette.border,
      backgroundColor: palette.panel,
    },
    inlineStatusNoticeSupport: {
      borderColor: palette.support,
      backgroundColor: palette.supportSoft,
    },
    inlineStatusNoticeDanger: {
      borderColor: palette.errorRed,
      backgroundColor: palette.panel,
    },
    inlineStatusNoticeLabel: {
      ...appTypography.captionStrong,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    inlineStatusNoticeMessage: {
      ...appTypography.caption,
      lineHeight: 18,
    },
    hiddenAutomationText: {
      height: 0,
      overflow: 'hidden',
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
      paddingTop: appSpacing.md,
      paddingBottom: appSpacing.sm2,
      gap: appSpacing.sm2,
    },

    /** Main conversation area — generous, breathing */
    mainPane: {
      flex: 1,
      position: 'relative',
    },
    mainPaneCompact: {
      width: '100%',
    },
    /** Main pane scrollable body */
    mainPaneInner: {
      flex: 1,
      gap: appSpacing.sm,
      paddingHorizontal: 56,
      paddingTop: appSpacing.md,
      paddingBottom: 32,
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
      gap: appSpacing.sm2,
    },
    sectionCardCompact: {
      gap: appSpacing.xs,
    },
    sectionCardPrimary: {
      gap: appSpacing.md,
      borderRadius: workbenchRadius.surface,
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
    sidebarSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
    },
    sidebarSectionMeta: {
      ...appTypography.label,
      color: palette.inkSoft,
      opacity: 0.5,
    },
    sidebarStatusChip: {
      minHeight: 24,
      maxWidth: 96,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 3,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.row,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sidebarStatusChipLabel: {
      ...appTypography.label,
      letterSpacing: 0.2,
    },
    sectionBody: {
      gap: appSpacing.sm2,
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
      opacity: 0.14,
    },

    /* ── Sidebar list rows ────────────────────────────── */
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 5,
      borderRadius: workbenchRadius.row,
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
      opacity: 0.86,
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
    decisionInterruptCard: {
      gap: appSpacing.xs,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.surface,
      borderColor: palette.border,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.md,
      paddingVertical: appSpacing.sm,
    },
    decisionInterruptCardPending: {
      borderColor: palette.accent,
      backgroundColor: palette.canvasShade,
    },
    decisionInterruptCardApproved: {
      borderColor: palette.support,
      backgroundColor: palette.supportSoft,
    },
    decisionInterruptCardRejected: {
      borderColor: palette.errorRed,
      backgroundColor: palette.panel,
    },
    decisionInterruptHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    decisionInterruptBody: {
      flex: 1,
      minWidth: 220,
      gap: 4,
    },
    decisionInterruptEyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      flexWrap: 'wrap',
    },
    decisionInterruptEyebrow: {
      ...appTypography.label,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    decisionInterruptTitle: {
      ...appTypography.body,
      color: palette.ink,
      lineHeight: 20,
      fontWeight: '600',
    },
    decisionInterruptNarrative: {
      ...appTypography.caption,
      color: palette.inkSoft,
      lineHeight: 18,
    },
    decisionInterruptPromptText: {
      ...appTypography.caption,
      color: palette.inkMuted,
      lineHeight: 18,
    },
    decisionInterruptMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    decisionInterruptMetaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xxs,
      minHeight: 24,
      maxWidth: '100%',
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      borderRadius: workbenchRadius.row,
      backgroundColor: palette.panel,
    },
    decisionInterruptMetaChipLabel: {
      ...appTypography.label,
      color: palette.inkSoft,
      flexShrink: 1,
    },
    decisionInterruptMetaText: {
      ...appTypography.caption,
      color: palette.inkMuted,
      lineHeight: 18,
      flexShrink: 1,
    },
    decisionInterruptSummaryList: {
      gap: 6,
    },
    decisionInterruptSummaryItem: {
      gap: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      borderRadius: workbenchRadius.row,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.xs,
    },
    decisionInterruptSummaryLabel: {
      ...appTypography.label,
      color: palette.inkSoft,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    decisionInterruptSummaryText: {
      ...appTypography.caption,
      color: palette.ink,
      lineHeight: 18,
    },
    decisionInterruptDetailsShell: {
      gap: appSpacing.xs,
      borderRadius: workbenchRadius.row,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.sm,
    },
    decisionInterruptDetailsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    decisionInterruptDetailsHint: {
      ...appTypography.caption,
      color: palette.inkMuted,
      lineHeight: 18,
    },
    decisionInterruptDetailsText: {
      color: palette.inkMuted,
      fontFamily: terminalFontFamily,
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
      paddingTop: appSpacing.xxs,
    },
    workspaceActionMenuGroup: {
      gap: appSpacing.xxs,
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    runtimeSelectorPopover: {
      minWidth: 260,
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    runtimeSelectorMenuList: {
      gap: 4,
    },
    runtimeSelectorOption: {
      gap: appSpacing.xxs,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.control,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.sm,
    },
    runtimeSelectorOptionPressed: {
      opacity: 0.92,
    },
    runtimeSelectorOptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
    },
    runtimeSelectorOptionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      flex: 1,
      minWidth: 0,
    },
    runtimeSelectorOptionLabel: {
      ...appTypography.captionStrong,
      flexShrink: 1,
    },
    runtimeSelectorOptionBadge: {
      minHeight: 22,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.row,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    runtimeSelectorOptionBadgeLabel: {
      ...appTypography.label,
      letterSpacing: 0.4,
    },
    runtimeSelectorOptionDetail: {
      ...appTypography.caption,
      lineHeight: 18,
    },
    workspaceActionMenuShell: {
      minWidth: 220,
      maxWidth: 280,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.control,
      paddingVertical: 4,
      paddingHorizontal: 4,
      overflow: 'hidden',
    },
    workspaceActionMenuList: {
      gap: 4,
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
      borderRadius: workbenchRadius.control,
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
      borderRadius: workbenchRadius.control,
      justifyContent: 'center',
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.sm,
    },
    textInputMultilineShell: {
      minHeight: 56,
      borderRadius: workbenchRadius.control,
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
      gap: appSpacing.sm2,
    },
    timelineStepList: {
      gap: 2,
    },
    timelineStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      borderRadius: workbenchRadius.row,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.xs,
    },
    timelineStepText: {
      flex: 1,
      minWidth: 0,
    },
    planCard: {
      gap: appSpacing.sm,
      borderRadius: workbenchRadius.surface,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.md,
    },
    planCompactCard: {
      gap: appSpacing.xxs,
      borderRadius: workbenchRadius.surface,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm2,
    },
    planCompactMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      flexWrap: 'wrap',
    },
    planCompactText: {
      ...appTypography.caption,
      color: palette.ink,
      lineHeight: 20,
    },
    planCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    planCardIntro: {
      flex: 1,
      minWidth: 180,
      gap: appSpacing.xxs,
    },
    planCardEyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      flexWrap: 'wrap',
    },
    planCardEyebrow: {
      ...appTypography.label,
      color: palette.inkSoft,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    planCardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    planProgressChip: {
      minHeight: 24,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 3,
      borderRadius: workbenchRadius.row,
      backgroundColor: palette.canvasShade,
    },
    planProgressChipLabel: {
      ...appTypography.label,
      color: palette.inkSoft,
    },

    /* ── Conversation transcript items ────────────────── */
    messageItem: {
      gap: appSpacing.sm,
      paddingVertical: appSpacing.sm2,
      paddingHorizontal: appSpacing.lg2,
      borderRadius: workbenchRadius.surface,
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
      opacity: 0.4,
    },
    messageItemContent: {
      ...appTypography.body,
      color: palette.ink,
      lineHeight: 22,
    },

    /* ── Tool invocation card ─────────────────────────── */
    toolCard: {
      gap: appSpacing.sm,
      borderRadius: workbenchRadius.surface,
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
    shellCommandItem: {
      gap: appSpacing.xxs,
    },
    shellCommandToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      borderRadius: workbenchRadius.row,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: palette.canvas,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'transparent',
    },
    shellCommandToggleHovered: {
      backgroundColor: palette.canvasShade,
    },
    shellCommandToggleFocused: {
      borderColor: palette.focusRing,
      borderWidth: 2,
    },
    shellCommandTogglePressed: {
      backgroundColor: palette.canvasShade,
      opacity: 0.92,
    },
    shellCommandToggleTitle: {
      ...appTypography.caption,
      color: palette.inkSoft,
      flex: 1,
      minWidth: 0,
      lineHeight: 20,
    },
    shellCommandToggleTitleExpanded: {
      ...appTypography.captionStrong,
      color: palette.ink,
    },
    shellCommandToggleChevron: {
      ...appTypography.captionStrong,
      color: palette.inkMuted,
      width: 12,
      textAlign: 'center',
    },
    shellCommandPanel: {
      gap: appSpacing.sm,
      borderRadius: workbenchRadius.surface,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm,
    },
    shellCommandPanelLabel: {
      ...appTypography.captionStrong,
      color: palette.inkSoft,
      lineHeight: 20,
    },
    shellCommandPanelBody: {
      gap: appSpacing.sm,
    },
    shellCommandPanelCommand: {
      color: palette.ink,
      fontFamily: terminalFontFamily,
    },
    shellCommandPanelOutput: {
      color: palette.inkSoft,
      fontFamily: terminalFontFamily,
    },
    shellCommandPanelFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: appSpacing.xs,
    },
    shellCommandPanelStatus: {
      ...appTypography.captionStrong,
      lineHeight: 18,
    },

    /* ── Expander body ────────────────────────────────── */
    expanderBody: {
      gap: appSpacing.sm2,
      paddingTop: 2,
    },
    runDetailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.sm2,
    },
    runDetailField: {
      minWidth: 150,
      flexGrow: 1,
      gap: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      borderRadius: workbenchRadius.row,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.sm,
    },
    runDetailFieldWide: {
      minWidth: 220,
    },
    runDetailFieldLabel: {
      ...appTypography.label,
      color: palette.inkSoft,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    runDetailFieldValue: {
      ...appTypography.caption,
      color: palette.ink,
      lineHeight: 18,
    },
    runDetailCommandShell: {
      gap: appSpacing.xxs,
      borderRadius: workbenchRadius.row,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.sm,
    },
    runDetailCommandText: {
      color: palette.ink,
      fontFamily: terminalFontFamily,
    },
    runDetailCommandMeta: {
      ...appTypography.caption,
      color: palette.inkSoft,
      lineHeight: 18,
    },

    /* ── Terminal / code output ────────────────────────── */
    terminalBox: {
      borderRadius: workbenchRadius.row,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm2,
    },
    terminalSummaryShell: {
      gap: appSpacing.xs,
    },
    terminalSummaryHiddenLocator: {
      height: 0,
      overflow: 'hidden',
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
      gap: appSpacing.xs,
    },

    /* ── Conversation empty state ─────────────────────── */
    conversationEmpty: {
      alignSelf: 'stretch',
      paddingTop: appSpacing.sm,
      paddingBottom: appSpacing.lg2,
    },
    conversationEmptyCard: {
      gap: appSpacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.surface,
      borderColor: palette.border,
      backgroundColor: palette.panel,
      paddingHorizontal: appSpacing.lg2,
      paddingVertical: appSpacing.lg,
    },
    conversationEmptyEyebrow: {
      ...appTypography.label,
      color: palette.inkSoft,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    conversationEmptyTitle: {
      ...appTypography.title,
      color: palette.ink,
      letterSpacing: -0.24,
    },
    conversationEmptyHint: {
      ...appTypography.body,
      color: palette.inkMuted,
      textAlign: 'left',
      maxWidth: 560,
      lineHeight: 22,
    },
    conversationEmptyList: {
      gap: appSpacing.sm,
    },
    conversationEmptyItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: appSpacing.sm,
    },
    conversationEmptyItemMarker: {
      width: 22,
      minWidth: 22,
      height: 22,
      borderRadius: workbenchRadius.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.canvasShade,
    },
    conversationEmptyItemMarkerLabel: {
      ...appTypography.label,
      color: palette.ink,
    },
    conversationEmptyItemText: {
      ...appTypography.caption,
      color: palette.inkSoft,
      flex: 1,
      minWidth: 0,
      lineHeight: 20,
    },

    /* ── Run actions inline row ───────────────────────── */
    runActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingTop: 2,
    },
    runHeader: {
      gap: appSpacing.xs,
    },
    runHeaderTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    runHeaderIntro: {
      flex: 1,
      minWidth: 220,
      gap: 4,
    },
    runHeaderContextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      borderRadius: workbenchRadius.row,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 6,
    },
    runHeaderContextCopy: {
      flex: 1,
      minWidth: 180,
      gap: 2,
    },
    runHeaderContextLabel: {
      ...appTypography.label,
      color: palette.inkSoft,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    runHeaderContextMeta: {
      ...appTypography.caption,
      color: palette.inkMuted,
      lineHeight: 18,
    },
    runHeaderEyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    runHeaderTitle: {
      ...appTypography.title,
      color: palette.ink,
      lineHeight: 28,
    },
    runHeaderDecisionLabel: {
      ...appTypography.label,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    runHeaderActionCluster: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-end',
      gap: 6,
      flexWrap: 'wrap',
      maxWidth: '100%',
    },
    runHeaderContextActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
      paddingTop: 2,
    },
    runHeaderContextLink: {
      alignSelf: 'flex-start',
      paddingVertical: 2,
    },
    runHeaderContextLinkPressed: {
      opacity: 0.72,
    },
    runHeaderContextLinkLabel: {
      ...appTypography.captionStrong,
      color: palette.accent,
    },
    runHeaderSummaryRow: {
      paddingTop: 2,
    },
    runHeaderSummaryText: {
      ...appTypography.caption,
      color: palette.inkSoft,
      lineHeight: 18,
    },

    /* ── Mode toggle ──────────────────────────────────── */
    modeToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
      borderRadius: workbenchRadius.control,
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
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.canvas,
      paddingHorizontal: 56,
      paddingVertical: appSpacing.md,
      gap: 6,
    },
    approvalFloatingOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 56,
      paddingBottom: appSpacing.md,
      zIndex: 8,
    },
    approvalFloatingCard: {
      shadowColor: '#000',
      shadowOpacity: 0.24,
      shadowRadius: 24,
      shadowOffset: {width: 0, height: -8},
    },
    composerAssistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    composerAssistCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      flexWrap: 'wrap',
      flexShrink: 1,
    },
    composerPresetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      minHeight: 30,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.xs,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.control,
    },
    composerPresetButtonPressed: {
      opacity: 0.92,
      transform: [{scale: 0.98}],
    },
    composerPresetButtonLabel: {
      ...appTypography.captionStrong,
    },
    composerInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: appSpacing.sm,
    },
    composerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      flexWrap: 'wrap',
    },
    composerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.xs,
      borderRadius: workbenchRadius.control,
      borderWidth: StyleSheet.hairlineWidth,
      minHeight: 30,
      maxWidth: '100%',
    },
    composerChipLabel: {
      ...appTypography.caption,
      letterSpacing: 0.2,
    },
    composerContextChip: {
      maxWidth: 280,
    },
    composerContextChipLabel: {
      flexShrink: 1,
    },
    composerStarterChip: {
      paddingHorizontal: appSpacing.sm,
    },
    composerStarterIconChip: {
      width: 32,
      minWidth: 32,
      height: 32,
      minHeight: 32,
      paddingHorizontal: 0,
      paddingVertical: 0,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    composerStarterChipLabel: {
      fontWeight: '600',
    },
    composerShell: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.surface,
      paddingHorizontal: appSpacing.lg,
      paddingTop: appSpacing.xs,
      paddingBottom: appSpacing.xs,
      gap: appSpacing.xs,
      position: 'relative',
      overflow: 'hidden',
    },
    composerShellContentHidden: {
      opacity: 0,
    },
    composerApprovalHost: {
      position: 'absolute',
      top: appSpacing.xs,
      right: appSpacing.lg,
      bottom: appSpacing.xs,
      left: appSpacing.lg,
      justifyContent: 'flex-end',
    },
    composerApprovalSheet: {
      flex: 1,
      justifyContent: 'space-between',
    },
    composerPromptInput: {
      minHeight: 72,
      maxHeight: 160,
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    composerPromptPlaceholder: {
      minHeight: 72,
      justifyContent: 'flex-start',
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    composerShellDivider: {
      height: StyleSheet.hairlineWidth,
      opacity: 0.7,
    },
    composerShellFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
    },
    composerShellFooterMeta: {
      flex: 1,
      minWidth: 0,
    },
    composerModeCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      flexWrap: 'wrap',
    },
    composerModeChip: {
      paddingHorizontal: appSpacing.sm2,
    },
    composerModeChipLabel: {
      fontWeight: '600',
    },
    composerAdvancedPanel: {
      gap: appSpacing.xs,
      borderRadius: workbenchRadius.row,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.xs,
    },
    composerAdvancedHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    composerAdvancedHeadingCluster: {
      flex: 1,
      minWidth: 180,
      gap: 2,
    },
    composerAdvancedEyebrow: {
      ...appTypography.label,
      color: palette.inkSoft,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    composerAdvancedHint: {
      ...appTypography.caption,
      color: palette.inkMuted,
      lineHeight: 18,
    },
    composerAdvancedPresetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      flexWrap: 'wrap',
    },
    composerAdvancedInput: {
      minHeight: 56,
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    composerRuntimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: appSpacing.sm,
      flexWrap: 'wrap',
    },
    composerRuntimeCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      flexWrap: 'wrap',
      flexShrink: 1,
    },
    composerRuntimeChip: {
      maxWidth: 220,
    },
    composerRuntimeWorkspaceLabel: {
      flexShrink: 1,
    },
    composerRuntimeMeta: {
      ...appTypography.caption,
      textAlign: 'right',
      flexShrink: 1,
      lineHeight: 18,
    },
    composerRuntimeMetaChip: {
      maxWidth: 240,
    },
    composerRuntimeMetaChipLabel: {
      flexShrink: 1,
    },
    composerPrimaryAction: {
      width: 40,
      height: 40,
      borderRadius: workbenchRadius.primaryAction,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    composerPrimaryActionPressed: {
      opacity: 0.9,
      transform: [{scale: 0.96}],
    },
    approvalSheet: {
      gap: appSpacing.md,
    },
    approvalSheetSection: {
      gap: appSpacing.xs,
    },
    approvalSheetLabel: {
      ...appTypography.label,
      color: palette.inkSoft,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    approvalSheetReasonText: {
      ...appTypography.body,
      color: palette.ink,
      lineHeight: 24,
      fontWeight: '600',
    },
    approvalCommandShell: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      borderRadius: workbenchRadius.control,
      backgroundColor: palette.canvasShade,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.sm,
    },
    approvalCommandText: {
      fontFamily: terminalFontFamily,
      lineHeight: 20,
    },
    approvalDecisionList: {
      gap: 6,
    },
    approvalDecisionRow: {
      gap: appSpacing.xxs,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.control,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.sm,
    },
    approvalDecisionTitle: {
      ...appTypography.captionStrong,
      color: palette.ink,
    },
    approvalDecisionDetail: {
      ...appTypography.caption,
      color: palette.inkMuted,
      lineHeight: 18,
    },
    approvalDecisionRadio: {
      width: 12,
      minWidth: 12,
      height: 12,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: palette.borderStrong,
      backgroundColor: 'transparent',
    },
    approvalRejectReasonShell: {
      minHeight: 72,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.control,
      paddingHorizontal: appSpacing.sm2,
      paddingVertical: appSpacing.sm,
    },
    approvalRejectReasonInput: {
      minHeight: 64,
      paddingHorizontal: 0,
      paddingVertical: 0,
      fontSize: appTypography.body.fontSize,
      lineHeight: appTypography.body.lineHeight,
    },
    approvalSheetFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingTop: appSpacing.xxs,
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
      borderRadius: workbenchRadius.row,
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
      paddingVertical: 5,
      borderRadius: workbenchRadius.row,
      backgroundColor: palette.panelEmphasis,
    },
    workspaceSelectorLabel: {
      ...appTypography.caption,
      color: palette.inkMuted,
      flex: 1,
      minWidth: 0,
    },
    workspaceSetupCard: {
      gap: appSpacing.xs,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: workbenchRadius.control,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: appSpacing.sm2,
    },
  });
}

export const baseStyles = StyleSheet.create({
  detailField: {
    flexGrow: 1,
    minWidth: 120,
    gap: 2,
    borderRadius: appRadius.panel,
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
