import React, { PropsWithChildren, useCallback, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import type { ResolvedSurfaceSession } from '@opapp/framework-surfaces';
import { appI18n } from '@opapp/framework-i18n';
import { useTheme } from './theme';
import {
  type AppTone,
  type AppToneEmphasis,
  appFontFamily,
  appLayout,
  appRadius,
  appTypography,
  appLetterSpacing,
} from './tokens';

// ---------------------------------------------------------------------------
//  Shared desktop interaction helpers
// ---------------------------------------------------------------------------

const desktopCursor: ViewStyle =
  Platform.OS === 'windows' ? ({ cursor: 'pointer' } as any) : {};

function windowsFocusProps() {
  if (Platform.OS === 'windows') {
    return { enableFocusRing: true } as any;
  }
  return {};
}

// ---------------------------------------------------------------------------
//  AppFrame
// ---------------------------------------------------------------------------

export function AppFrame({
  eyebrow,
  title,
  description,
  children,
  testID,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  testID?: string;
}>) {
  const { palette, spacing } = useTheme();
  return (
    <View testID={testID} style={[styles.frame, { backgroundColor: palette.canvas }]}>
      <View style={[styles.frameInner, { gap: spacing.xl }]}>
        <View
          style={[
            styles.heroShell,
            { backgroundColor: palette.panel, borderColor: palette.border },
          ]}
        >
          <View style={styles.heroTopline}>
            <Text style={[styles.eyebrow, { color: palette.accent }]}>
              {eyebrow}
            </Text>
            <View
              style={[styles.heroRule, { backgroundColor: palette.border }]}
            />
          </View>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>
            {title}
          </Text>
          <Text style={[styles.heroDescription, { color: palette.inkMuted }]}>
            {description}
          </Text>
        </View>
        {children}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  SectionCard
// ---------------------------------------------------------------------------

export function SectionCard({
  title,
  description,
  children,
  testID,
}: PropsWithChildren<{
  title: string;
  description?: string;
  testID?: string;
}>) {
  const { palette, spacing } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.sectionCard,
        {
          backgroundColor: palette.panel,
          borderColor: palette.border,
          gap: spacing.lg,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.ink }]}>
          {title}
        </Text>
        {description ? (
          <Text
            style={[styles.sectionDescription, { color: palette.inkMuted }]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[styles.sectionContent, { gap: spacing.lg }]}>
        {children}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  ChoiceChip
// ---------------------------------------------------------------------------

export function ChoiceChip({
  label,
  active,
  detail,
  meta,
  onPress,
  onPressIn,
  emphasized = false,
  activationBehavior = 'press',
  activeBadgeLabel = appI18n.common.choiceStatus.selected,
  inactiveBadgeLabel = appI18n.common.choiceStatus.available,
  style,
  testID,
}: {
  label: string;
  active: boolean;
  detail?: string;
  meta?: string;
  onPress: () => void;
  onPressIn?: () => void;
  activeBadgeLabel?: string;
  inactiveBadgeLabel?: string;
  emphasized?: boolean;
  activationBehavior?: 'press' | 'press-in';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  const activationIdRef = useRef(0);
  const suppressPressForActivationRef = useRef<number | null>(null);
  const suppressPressForKeyboardActivationRef = useRef(false);

  const chipIdle = {
    backgroundColor: palette.canvas,
    borderColor: palette.border,
  };
  const chipActive = {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityState={{ selected: active }}
      focusable
      {...windowsFocusProps()}
      hitSlop={6}
      pressRetentionOffset={{ top: 12, right: 12, bottom: 12, left: 12 }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => {
        if (suppressPressForKeyboardActivationRef.current) {
          suppressPressForKeyboardActivationRef.current = false;
          return;
        }
        if (
          activationBehavior === 'press-in' &&
          suppressPressForActivationRef.current === activationIdRef.current
        ) {
          suppressPressForActivationRef.current = null;
          return;
        }
        onPress();
      }}
      onPressIn={() => {
        onPressIn?.();
        if (activationBehavior === 'press-in') {
          activationIdRef.current += 1;
          suppressPressForActivationRef.current = activationIdRef.current;
          onPress();
        }
      }}
      onKeyUp={(event: any) => {
        const key = event?.nativeEvent?.key;
        if (
          key === 'Enter' ||
          key === ' ' ||
          key === 'Space' ||
          key === 'Spacebar'
        ) {
          suppressPressForKeyboardActivationRef.current = true;
          onPress();
        }
      }}
      style={({ pressed, focused }: any) => [
        styles.chip,
        active ? chipActive : chipIdle,
        emphasized
          ? active
            ? { backgroundColor: palette.accentSoft, borderColor: palette.accent }
            : { backgroundColor: palette.panelEmphasis, borderColor: palette.borderStrong }
          : null,
        hovered && !pressed
          ? active
            ? { borderColor: palette.accentHover }
            : { backgroundColor: palette.canvasShade, borderColor: palette.borderStrong }
          : null,
        focused && { borderColor: palette.focusRing, borderWidth: 2 },
        pressed && activationBehavior === 'press'
          ? active
            ? { backgroundColor: palette.accentSoft, borderColor: palette.accentHover }
            : { backgroundColor: palette.canvasShade, borderColor: palette.borderStrong }
          : null,
        desktopCursor,
        style,
      ]}
    >
      {emphasized ? (
        <View
          pointerEvents='none'
          style={[
            styles.chipEmphasisBand,
            active
              ? { backgroundColor: palette.accent }
              : { backgroundColor: palette.borderStrong },
          ]}
        />
      ) : null}
      <View style={styles.chipHeader}>
        <Text
          numberOfLines={2}
          style={[
            styles.chipLabel,
            { color: palette.ink },
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.chipIndicator,
            active
              ? { backgroundColor: palette.accent, borderColor: palette.accent }
              : {
                  backgroundColor: palette.panel,
                  borderColor: palette.borderStrong,
                },
          ]}
        >
          <Text
            style={[
              styles.chipIndicatorLabel,
              active ? { color: palette.canvas } : { color: palette.inkMuted },
            ]}
          >
            {active ? activeBadgeLabel : inactiveBadgeLabel}
          </Text>
        </View>
      </View>
      {detail ? (
        <Text
          style={[
            styles.chipDetail,
            { color: palette.inkMuted },
          ]}
        >
          {detail}
        </Text>
      ) : null}
      {meta ? (
        <Text
          style={[
            styles.chipMeta,
            { color: palette.inkSoft },
          ]}
        >
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
//  FilterChip
// ---------------------------------------------------------------------------

export function FilterChip({
  label,
  active,
  onPress,
  style,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ selected: active }}
      focusable
      {...windowsFocusProps()}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed, focused }: any) => [
        styles.filterChip,
        active
          ? { backgroundColor: palette.accent, borderColor: palette.accent }
          : { backgroundColor: palette.panel, borderColor: palette.border },
        hovered && !pressed
          ? active
            ? { backgroundColor: palette.accentHover }
            : { backgroundColor: palette.canvasShade }
          : null,
        focused && { borderColor: palette.focusRing, borderWidth: 2 },
        pressed ? styles.filterChipPressed : null,
        desktopCursor,
        style,
      ]}
    >
      <Text
        style={[
          styles.filterChipLabel,
          active ? { color: palette.canvas } : { color: palette.inkSoft },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
//  FilterSection
// ---------------------------------------------------------------------------

export function FilterSection({
  label,
  items,
  style,
}: {
  label: string;
  items: { key: string; label: string; active: boolean; onPress: () => void }[];
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.filterSection, style]}>
      <Text style={[styles.filterSectionLabel, { color: palette.inkSoft }]}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterSectionRow}
      >
        {items.map((item) => (
          <FilterChip
            key={item.key}
            label={item.label}
            active={item.active}
            onPress={item.onPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  StatusBadge
// ---------------------------------------------------------------------------

export function StatusBadge({
  label,
  tone = 'neutral',
  emphasis = 'soft',
  size = 'md',
  style,
  textStyle,
  testID,
}: {
  label: string;
  tone?: AppTone;
  emphasis?: AppToneEmphasis;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const { tonePalette } = useTheme();
  const toneStyles = tonePalette[tone][emphasis];

  return (
    <View
      testID={testID}
      style={[
        styles.statusBadge,
        size === 'sm' ? styles.statusBadgeSm : styles.statusBadgeMd,
        toneStyles.container,
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.statusBadgeLabel, toneStyles.label, textStyle]}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  SignalPill
// ---------------------------------------------------------------------------

export function SignalPill({
  label,
  tone = 'neutral',
  emphasis = 'soft',
  size = 'md',
  style,
  textStyle,
  testID,
}: {
  label: string;
  tone?: AppTone;
  emphasis?: AppToneEmphasis;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const { tonePalette } = useTheme();
  const toneStyles = tonePalette[tone][emphasis];

  return (
    <View
      testID={testID}
      style={[
        styles.signalPill,
        size === 'sm' ? styles.signalPillSm : styles.signalPillMd,
        toneStyles.container,
        style,
      ]}
    >
      <Text
        style={[
          styles.signalPillLabel,
          size === 'sm' ? styles.signalPillLabelSm : styles.signalPillLabelMd,
          toneStyles.label,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  TimelineStep
// ---------------------------------------------------------------------------

export function TimelineStep({
  markerLabel,
  title,
  description,
  warning,
  tone = 'accent',
  children,
  style,
}: PropsWithChildren<{
  markerLabel: string;
  title: string;
  description: string;
  warning?: string;
  tone?: AppTone;
  style?: StyleProp<ViewStyle>;
}>) {
  const { palette, tonePalette, spacing } = useTheme();
  const toneStyles = tonePalette[tone].soft;

  return (
    <View style={[styles.timelineStep, { gap: spacing.sm2 }, style]}>
      <View style={[styles.timelineStepMarker, toneStyles.container]}>
        <Text style={[styles.timelineStepMarkerLabel, toneStyles.label]}>
          {markerLabel}
        </Text>
      </View>
      <View
        style={[
          styles.timelineStepBody,
          {
            borderLeftColor: toneStyles.container.borderColor,
            gap: spacing.xs,
            paddingBottom: spacing.lg,
          },
        ]}
      >
        <Text style={[styles.timelineStepTitle, { color: palette.ink }]}>
          {title}
        </Text>
        <Text
          style={[styles.timelineStepDescription, { color: palette.inkMuted }]}
        >
          {description}
        </Text>
        {children}
        {warning ? (
          <Text
            style={[
              styles.timelineStepWarning,
              { color: tonePalette.danger.soft.label.color },
            ]}
          >
            {warning}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  InfoPanel
// ---------------------------------------------------------------------------

export function InfoPanel({
  title,
  tone = 'danger',
  children,
  style,
  testID,
}: PropsWithChildren<{
  title: string;
  tone?: 'accent' | 'danger' | 'neutral';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  const { palette, tonePalette } = useTheme();
  const toneStyles = tonePalette[tone].soft;
  const titleToneStyle =
    tone === 'neutral' ? { color: palette.ink } : toneStyles.label;

  return (
    <View testID={testID} style={[styles.infoPanel, toneStyles.container, style]}>
      <Text style={[styles.infoPanelTitle, titleToneStyle]}>{title}</Text>
      <View style={styles.infoPanelBody}>{children}</View>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  ActionButton
// ---------------------------------------------------------------------------

export function ActionButton({
  label,
  onPress,
  disabled = false,
  tone = 'accent',
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'ghost';
  testID?: string;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  const suppressPressForKeyboardActivationRef = useRef(false);
  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      disabled={disabled}
      focusable={!disabled}
      {...windowsFocusProps()}
      onPress={() => {
        if (disabled) {
          return;
        }
        if (suppressPressForKeyboardActivationRef.current) {
          suppressPressForKeyboardActivationRef.current = false;
          return;
        }
        onPress();
      }}
      onKeyUp={(event: any) => {
        if (disabled) {
          return;
        }
        const key = event?.nativeEvent?.key;
        if (
          key === 'Enter' ||
          key === ' ' ||
          key === 'Space' ||
          key === 'Spacebar'
        ) {
          suppressPressForKeyboardActivationRef.current = true;
          onPress();
        }
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed, focused }: any) => [
        styles.actionButton,
        tone === 'accent'
          ? { backgroundColor: palette.accent, borderColor: palette.accent }
          : {
              backgroundColor: palette.canvas,
              borderColor: palette.borderStrong,
            },
        disabled
          ? {
              backgroundColor: palette.canvasShade,
              borderColor: palette.border,
            }
          : null,
        !disabled && hovered && !pressed
          ? tone === 'accent'
            ? { backgroundColor: palette.accentHover }
            : { backgroundColor: palette.canvasShade }
          : null,
        !disabled && focused && { borderColor: palette.focusRing, borderWidth: 2 },
        pressed && !disabled ? styles.actionButtonPressed : null,
        desktopCursor,
      ]}
    >
      <Text
        style={[
          styles.actionButtonLabel,
          tone === 'accent' ? { color: palette.canvas } : { color: palette.ink },
          disabled ? { color: palette.inkSoft } : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
//  InlineMetric
// ---------------------------------------------------------------------------

export function InlineMetric({
  label,
  value,
  tone = 'default',
  testID,
  labelTestID,
  valueTestID,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'accent';
  testID?: string;
  labelTestID?: string;
  valueTestID?: string;
}) {
  const { palette } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.metric,
        tone === 'accent'
          ? {
              backgroundColor: palette.supportSoft,
              borderColor: palette.support,
            }
          : { backgroundColor: palette.canvas, borderColor: palette.border },
      ]}
    >
      <Text testID={labelTestID} style={[styles.metricLabel, { color: palette.inkMuted }]}>
        {label}
      </Text>
      <Text testID={valueTestID} style={[styles.metricValue, { color: palette.ink }]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  MutedText
// ---------------------------------------------------------------------------

export function MutedText({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  const { palette } = useTheme();
  return (
    <Text style={[styles.mutedText, { color: palette.inkMuted }, style]}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
//  Stack
// ---------------------------------------------------------------------------

export function Stack({
  children,
  style,
  testID,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; testID?: string }>) {
  const { spacing } = useTheme();
  return <View testID={testID} style={[{ gap: spacing.md }, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
//  SurfaceSessionChrome
// ---------------------------------------------------------------------------

export function SurfaceSessionChrome({
  label = appI18n.app.surfaceSessionLabel,
  session,
  onSelectTab,
  onCloseTab,
  testID,
}: {
  label?: string;
  session: ResolvedSurfaceSession;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  testID?: string;
}) {
  const { palette } = useTheme();

  if (session.tabs.length <= 1) {
    return null;
  }

  return (
    <View
      testID={testID}
      style={[
        styles.surfaceHostChrome,
        {
          borderBottomColor: palette.border,
          backgroundColor: palette.canvasShade,
        },
      ]}
    >
      <View style={styles.surfaceHostChromeInner}>
        <Text style={[styles.surfaceHostLabel, { color: palette.inkSoft }]}>
          {label}
        </Text>
        <View style={styles.surfaceTabRow}>
          {session.tabs.map((tab) => (
            <View
              key={tab.tabId}
              style={[
                styles.surfaceTab,
                { borderColor: palette.border, backgroundColor: palette.panel },
                tab.isActive
                  ? {
                      backgroundColor: palette.panelEmphasis,
                      borderColor: palette.borderStrong,
                    }
                  : null,
              ]}
            >
              <Pressable
                focusable
                {...windowsFocusProps()}
                onPress={() => onSelectTab(tab.tabId)}
                style={({ pressed }: any) => [
                  styles.surfaceTabBody,
                  pressed ? styles.surfaceTabPressed : null,
                  desktopCursor,
                ]}
              >
                <Text style={[styles.surfaceTabTitle, { color: palette.ink }]}>
                  {tab.title}
                </Text>
                <Text
                  style={[
                    styles.surfaceTabMeta,
                    { color: palette.inkSoft },
                    tab.isActive ? { color: palette.accent } : null,
                  ]}
                >
                  {tab.policy}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel={`${appI18n.app.closeTabLabelPrefix}${tab.title}`}
                focusable
                {...windowsFocusProps()}
                onPress={() => onCloseTab(tab.tabId)}
                style={({ pressed }: any) => [
                  styles.surfaceTabClose,
                  {
                    borderLeftColor: palette.border,
                    backgroundColor: palette.canvasShade,
                  },
                  pressed ? { backgroundColor: palette.panelEmphasis } : null,
                  desktopCursor,
                ]}
              >
                <Text
                  style={[
                    styles.surfaceTabCloseLabel,
                    { color: palette.inkSoft },
                  ]}
                >
                  X
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ==========================================================================
//  NEW COMPONENTS
// ==========================================================================

// ---------------------------------------------------------------------------
//  Divider
// ---------------------------------------------------------------------------

export function Divider({
  direction = 'horizontal',
  style,
}: {
  direction?: 'horizontal' | 'vertical';
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  return (
    <View
      accessibilityRole='none'
      style={[
        direction === 'horizontal'
          ? { height: 1, backgroundColor: palette.border, width: '100%' }
          : { width: 1, backgroundColor: palette.border, alignSelf: 'stretch' },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
//  EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  style,
  testID,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette, spacing } = useTheme();
  return (
    <View testID={testID} style={[styles.emptyState, { gap: spacing.sm2 }, style]}>
      <Text style={[styles.emptyStateTitle, { color: palette.ink }]}>
        {title}
      </Text>
      <Text style={[styles.emptyStateDescription, { color: palette.inkMuted }]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm }}>
          <ActionButton label={actionLabel} onPress={onAction} tone='ghost' />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
//  DataRow
// ---------------------------------------------------------------------------

export function DataRow({
  title,
  subtitle,
  badges,
  trailing,
  onPress,
  style,
  testID,
}: {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette, spacing } = useTheme();
  const [hovered, setHovered] = useState(false);

  const content = (
    <View
      testID={testID}
      style={[
        styles.dataRow,
        { borderBottomColor: palette.border, paddingVertical: spacing.sm2 },
        hovered ? { backgroundColor: palette.canvasShade } : null,
        style,
      ]}
    >
      <View style={[styles.dataRowMain, { gap: spacing.xs }]}>
        <Text
          style={[styles.dataRowTitle, { color: palette.ink }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.dataRowSubtitle, { color: palette.inkMuted }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        {badges ? <View style={styles.dataRowBadges}>{badges}</View> : null}
      </View>
      {trailing ? <View style={styles.dataRowTrailing}>{trailing}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole='button'
        focusable
        {...windowsFocusProps()}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={desktopCursor}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
//  Expander
// ---------------------------------------------------------------------------

export function Expander({
  title,
  defaultExpanded = false,
  trailing,
  children,
  style,
  testID,
  headerTestID,
  contentTestID,
}: PropsWithChildren<{
  title: string;
  defaultExpanded?: boolean;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  headerTestID?: string;
  contentTestID?: string;
}>) {
  const { palette, spacing } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hovered, setHovered] = useState(false);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  return (
    <View testID={testID} style={[styles.expander, { borderColor: palette.border }, style]}>
      <Pressable
        testID={headerTestID}
        accessibilityRole='button'
        accessibilityState={{ expanded }}
        focusable
        {...windowsFocusProps()}
        onPress={toggle}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed, focused }: any) => [
          styles.expanderHeader,
          {
            backgroundColor: palette.panel,
            paddingVertical: spacing.sm2,
            paddingHorizontal: spacing.lg,
          },
          hovered && !pressed ? { backgroundColor: palette.canvasShade } : null,
          focused && { borderColor: palette.focusRing, borderWidth: 2 },
          pressed ? { backgroundColor: palette.canvasShade } : null,
          desktopCursor,
        ]}
      >
        <Text style={[styles.expanderChevron, { color: palette.inkMuted }]}>
          {expanded ? '▾' : '▸'}
        </Text>
        <Text
          style={[styles.expanderTitle, { color: palette.ink }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {trailing ? (
          <View style={styles.expanderTrailing}>{trailing}</View>
        ) : null}
      </Pressable>
      {expanded ? (
        <View
          testID={contentTestID}
          style={[styles.expanderContent, { gap: spacing.xxs }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
//  Toolbar
// ---------------------------------------------------------------------------

export function Toolbar({
  children,
  style,
  testID,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; testID?: string }>) {
  const { palette, spacing } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.toolbar,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
//  ProgressBar
// ---------------------------------------------------------------------------

export function ProgressBar({
  value,
  max = 1,
  tone = 'accent',
  indeterminate = false,
  style,
}: {
  value?: number;
  max?: number;
  tone?: AppTone;
  indeterminate?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, tonePalette } = useTheme();
  const toneColor = tonePalette[tone].solid.container.backgroundColor;
  const ratio = indeterminate
    ? 0.4
    : Math.min(1, Math.max(0, (value ?? 0) / max));

  return (
    <View
      accessibilityRole='progressbar'
      accessibilityValue={
        indeterminate ? undefined : { min: 0, max, now: value }
      }
      style={[
        styles.progressBarTrack,
        { backgroundColor: palette.canvasShade },
        style,
      ]}
    >
      <View
        style={[
          styles.progressBarFill,
          { backgroundColor: toneColor, width: `${ratio * 100}%` },
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
//  TextInput
// ---------------------------------------------------------------------------

export function TextInput({
  value,
  onChangeText,
  placeholder,
  onClear,
  invalid = false,
  style,
  testID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.textInputContainer,
        {
          borderColor: invalid
            ? palette.errorRed
            : focused
              ? palette.focusRing
              : palette.border,
          backgroundColor: palette.panel,
        },
        style,
      ]}
    >
      <RNTextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.inkSoft}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.textInputField,
          { color: palette.ink, fontFamily: appFontFamily ?? undefined },
        ]}
      />
      {value.length > 0 && onClear ? (
        <Pressable
          accessibilityRole='button'
          onPress={onClear}
          style={({ pressed }: any) => [
            styles.textInputClear,
            pressed ? { opacity: 0.6 } : null,
            desktopCursor,
          ]}
        >
          <Text
            style={[styles.textInputClearLabel, { color: palette.inkMuted }]}
          >
            ✕
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
//  Tooltip — desktop-only hover card, no-op on non-desktop
// ---------------------------------------------------------------------------

export function Tooltip({
  text,
  children,
}: PropsWithChildren<{ text: string }>) {
  const { palette } = useTheme();
  const [visible, setVisible] = useState(false);

  if (Platform.OS !== 'windows') {
    return <>{children}</>;
  }

  return (
    <View
      onPointerEnter={() => setVisible(true)}
      onPointerLeave={() => setVisible(false)}
      style={styles.tooltipHost}
    >
      {children}
      {visible ? (
        <View
          style={[
            styles.tooltipBubble,
            { backgroundColor: palette.ink, borderColor: palette.borderStrong },
          ]}
        >
          <Text style={[styles.tooltipText, { color: palette.canvas }]}>
            {text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ==========================================================================
//  StyleSheet
// ==========================================================================

const styles = StyleSheet.create({
  // Frame
  frame: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  frameInner: {
    width: '100%',
    maxWidth: appLayout.frameMaxWidth,
  },
  heroShell: {
    borderWidth: 1,
    borderRadius: appRadius.hero,
    paddingHorizontal: 22,
    paddingVertical: 16,
    gap: 8,
  },
  heroTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontFamily: appFontFamily,
  },
  heroRule: {
    flex: 1,
    height: 1,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    maxWidth: 720,
    fontFamily: appFontFamily,
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 820,
    fontFamily: appFontFamily,
  },
  // SectionCard
  sectionCard: {
    borderWidth: 1,
    borderRadius: appRadius.panel,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sectionHeader: {
    gap: 5,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    fontFamily: appFontFamily,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: appFontFamily,
  },
  sectionContent: {},
  // ChoiceChip
  chip: {
    minWidth: 168,
    maxWidth: 224,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: appRadius.control,
    borderWidth: 1,
    gap: 6,
    overflow: 'hidden',
  },
  chipEmphasisBand: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  chipEmphasisBandIdle: {},
  chipEmphasisBandActive: {},
  chipIdleEmphasized: {},
  chipActiveEmphasized: {},
  chipPressed: {},
  chipActivePressed: {},
  chipFocusVisible: {},
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  chipIndicator: {
    minWidth: 54,
    height: 22,
    marginLeft: 8,
    paddingHorizontal: 9,
    borderRadius: appRadius.badge,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipIndicatorLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    fontFamily: appFontFamily,
  },
  chipLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    fontFamily: appFontFamily,
  },
  chipDetail: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: appFontFamily,
  },
  chipMeta: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    fontFamily: appFontFamily,
  },
  // FilterChip
  filterChip: {
    minWidth: 64,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: appRadius.badge,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipPressed: {
    transform: [{ translateY: 1 }],
  },
  filterChipLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    fontFamily: appFontFamily,
  },
  // FilterSection
  filterSection: {
    gap: 8,
  },
  filterSectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: appFontFamily,
  },
  filterSectionRow: {
    gap: 10,
    paddingRight: 12,
  },
  // StatusBadge
  statusBadge: {
    borderWidth: 1,
    borderRadius: appRadius.badge,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusBadgeSm: {
    minHeight: 28,
    minWidth: 54,
    paddingHorizontal: 10,
  },
  statusBadgeMd: {
    minHeight: 30,
    minWidth: 64,
    paddingHorizontal: 12,
  },
  statusBadgeLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    fontFamily: appFontFamily,
  },
  // SignalPill
  signalPill: {
    borderWidth: 1,
    borderRadius: appRadius.pill,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    flexShrink: 1,
    maxWidth: '100%',
  },
  signalPillSm: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signalPillMd: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  signalPillLabel: {
    fontWeight: '800',
    fontFamily: appFontFamily,
  },
  signalPillLabelSm: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.3,
  },
  signalPillLabelMd: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  // TimelineStep
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineStepMarker: {
    width: 42,
    minHeight: 42,
    borderRadius: appRadius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  timelineStepMarkerLabel: {
    ...appTypography.captionBold,
    letterSpacing: 0.4,
  },
  timelineStepBody: {
    flex: 1,
    paddingLeft: 14,
    borderLeftWidth: 2,
  },
  timelineStepTitle: {
    ...appTypography.subheading,
  },
  timelineStepDescription: {
    ...appTypography.body,
  },
  timelineStepWarning: {
    ...appTypography.captionBody,
  },
  // InfoPanel
  infoPanel: {
    borderRadius: appRadius.control,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  infoPanelBody: {
    gap: 6,
  },
  infoPanelTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.7,
    fontFamily: appFontFamily,
  },
  // ActionButton
  actionButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: appRadius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    transform: [{ translateY: 1 }],
  },
  actionButtonLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: appFontFamily,
  },
  // InlineMetric
  metric: {
    minWidth: 118,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: appRadius.control,
    borderWidth: 1,
    gap: 5,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: appFontFamily,
  },
  metricValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
    fontFamily: appFontFamily,
  },
  // MutedText
  mutedText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: appFontFamily,
  },
  // SurfaceSessionChrome
  surfaceHostChrome: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  surfaceHostChromeInner: {
    width: '100%',
    maxWidth: appLayout.frameMaxWidth,
    gap: 8,
  },
  surfaceHostLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: appFontFamily,
  },
  surfaceTabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  surfaceTab: {
    minWidth: 172,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  surfaceTabBody: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  surfaceTabPressed: {
    transform: [{ translateY: 1 }],
  },
  surfaceTabTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    fontFamily: appFontFamily,
  },
  surfaceTabMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: appFontFamily,
  },
  surfaceTabClose: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
  },
  surfaceTabCloseLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: appFontFamily,
  },
  // ---- NEW COMPONENTS ----
  // EmptyState
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    ...appTypography.title,
    textAlign: 'center',
  },
  emptyStateDescription: {
    ...appTypography.body,
    textAlign: 'center',
    maxWidth: 480,
  },
  // DataRow
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  dataRowMain: {
    flex: 1,
    minWidth: 0,
  },
  dataRowTitle: {
    ...appTypography.bodyStrong,
  },
  dataRowSubtitle: {
    ...appTypography.caption,
  },
  dataRowBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dataRowTrailing: {
    flexShrink: 0,
    marginLeft: 12,
  },
  // Expander
  expander: {
    borderWidth: 1,
    borderRadius: appRadius.control,
    overflow: 'hidden',
  },
  expanderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expanderChevron: {
    fontSize: 14,
    fontWeight: '800',
    width: 16,
    textAlign: 'center',
  },
  expanderTitle: {
    ...appTypography.bodyStrong,
    flex: 1,
  },
  expanderTrailing: {
    flexShrink: 0,
    marginLeft: 8,
  },
  expanderContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: appRadius.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexWrap: 'wrap',
  },
  // ProgressBar
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // TextInput
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: appRadius.control,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  textInputField: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 8,
  },
  textInputClear: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  textInputClearLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  // Tooltip
  tooltipHost: {
    position: 'relative',
  },
  tooltipBubble: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 280,
    zIndex: 100,
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: appFontFamily,
  },
});
