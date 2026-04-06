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
import { Icon, type IconDefinition } from './icons';

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
  icon,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'ghost';
  icon?: IconDefinition;
  testID?: string;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  const suppressPressForKeyboardActivationRef = useRef(false);
  const labelColor =
    disabled ? palette.inkSoft : tone === 'accent' ? palette.canvas : palette.ink;
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
      {icon ? <Icon icon={icon} size={13} color={labelColor} /> : null}
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
  icon,
  defaultExpanded = false,
  trailing,
  children,
  style,
  testID,
  headerTestID,
  contentTestID,
}: PropsWithChildren<{
  title: string;
  icon?: IconDefinition;
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
        {icon ? <Icon icon={icon} size={13} color={palette.inkMuted} /> : null}
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
//  Tooltip — desktop-only hover hint, no-op on non-desktop
// ---------------------------------------------------------------------------

export type TooltipPlacement = 'top' | 'bottom';

/**
 * Estimate the bubble width needed for the given text.
 *
 * On React Native Windows (XAML), absolutely-positioned children are
 * constrained by their parent's measured width. When the trigger element
 * is a small icon button (e.g. 28 × 28), the bubble would end up only
 * 28 px wide and the text would stack vertically — one character per line.
 *
 * To work around this, we compute a generous `minWidth` from the text
 * content so the bubble always has enough room. CJK characters are
 * estimated at ~14 px each; Latin characters at ~8 px.
 */
function estimateTooltipWidth(text: string, maxW: number): number {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += text.charCodeAt(i) > 0x2e7f ? 14 : 8;
  }
  // Add horizontal padding (10 + 10) + border (1 + 1) = 22
  return Math.min(maxW, Math.max(48, w + 22));
}

export function Tooltip({
  text,
  children,
  placement = 'top',
  maxWidth = 240,
  delayMs = 320,
}: PropsWithChildren<{
  text: string;
  placement?: TooltipPlacement;
  maxWidth?: number;
  delayMs?: number;
}>) {
  const { palette } = useTheme();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Cleanup timer on unmount to prevent state updates after unmount.
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (Platform.OS !== 'windows') {
    return <>{children}</>;
  }

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setVisible(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }, delayMs);
  };

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  };

  const positionStyles: ViewStyle =
    placement === 'bottom'
      ? { top: '100%', marginTop: 6 }
      : { bottom: '100%', marginBottom: 6 };

  // Explicit width so the bubble is never squeezed by a small trigger.
  const bubbleWidth = estimateTooltipWidth(text, maxWidth);

  return (
    <View
      onPointerEnter={show}
      onPointerLeave={hide}
      style={styles.tooltipHost}
    >
      {children}
      {visible ? (
        <Animated.View
          pointerEvents='none'
          style={[
            styles.tooltipBubble,
            positionStyles,
            {
              backgroundColor: palette.panel,
              borderColor: palette.borderStrong,
              opacity: fadeAnim,
              width: bubbleWidth,
            },
          ]}
        >
          <Text
            style={[styles.tooltipText, { color: palette.ink }]}
            numberOfLines={4}
          >
            {text}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
//  IconButton — compact icon-only pressable with built-in Tooltip
// ---------------------------------------------------------------------------

export type IconButtonSize = 'sm' | 'md' | 'lg';

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  active = false,
  tone = 'ghost',
  size = 'md',
  tooltipPlacement = 'top',
  style,
  testID,
}: {
  icon: IconDefinition;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: 'ghost' | 'accent' | 'danger';
  size?: IconButtonSize;
  tooltipPlacement?: TooltipPlacement;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  const suppressPressForKeyboardRef = useRef(false);

  const sizeSpec = iconButtonSizes[size];

  const resolveColors = () => {
    if (disabled) {
      return {
        bg: 'transparent',
        border: 'transparent',
        fg: palette.inkSoft,
      };
    }
    if (tone === 'accent') {
      return {
        bg: active ? palette.accentSoft : 'transparent',
        border: active ? palette.accent : 'transparent',
        fg: active ? palette.accent : palette.ink,
      };
    }
    if (tone === 'danger') {
      return {
        bg: 'transparent',
        border: 'transparent',
        fg: palette.errorRed,
      };
    }
    // ghost
    return {
      bg: active ? palette.panelEmphasis : 'transparent',
      border: active ? palette.borderStrong : 'transparent',
      fg: active ? palette.ink : palette.inkMuted,
    };
  };

  const colors = resolveColors();

  const button = (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      focusable={!disabled}
      {...windowsFocusProps()}
      onPress={() => {
        if (disabled) return;
        if (suppressPressForKeyboardRef.current) {
          suppressPressForKeyboardRef.current = false;
          return;
        }
        onPress();
      }}
      onKeyUp={(event: any) => {
        if (disabled) return;
        const key = event?.nativeEvent?.key;
        if (key === 'Enter' || key === ' ' || key === 'Space' || key === 'Spacebar') {
          suppressPressForKeyboardRef.current = true;
          onPress();
        }
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed, focused }: any) => [
        styles.iconButton,
        {
          width: sizeSpec.box,
          height: sizeSpec.box,
          borderRadius: sizeSpec.box / 2,
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        !disabled && hovered && !pressed
          ? { backgroundColor: palette.canvasShade }
          : null,
        !disabled && focused
          ? { borderColor: palette.focusRing, borderWidth: 2 }
          : null,
        pressed && !disabled ? { opacity: 0.85, transform: [{ scale: 0.95 }] } : null,
        disabled ? { opacity: 0.45 } : null,
        desktopCursor,
        style,
      ]}
    >
      <Icon icon={icon} size={sizeSpec.icon} color={colors.fg} />
    </Pressable>
  );

  if (Platform.OS === 'windows') {
    return <Tooltip text={label} placement={tooltipPlacement}>{button}</Tooltip>;
  }

  return button;
}

// ---------------------------------------------------------------------------
//  SegmentedControl — tabbed mode switcher
// ---------------------------------------------------------------------------

export type SegmentedControlItem<T extends string = string> = {
  key: T;
  label: string;
  icon?: IconDefinition;
};

export function SegmentedControl<T extends string = string>({
  items,
  selectedKey,
  onSelect,
  size = 'md',
  style,
  testID,
}: {
  items: readonly SegmentedControlItem<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.segmentedControl,
        { borderColor: palette.border, backgroundColor: palette.canvasShade },
        style,
      ]}
    >
      {items.map((item) => {
        const isSelected = item.key === selectedKey;
        return (
          <SegmentedControlSegment
            key={item.key}
            item={item}
            isSelected={isSelected}
            onPress={() => onSelect(item.key)}
            size={size}
          />
        );
      })}
    </View>
  );
}

function SegmentedControlSegment<T extends string>({
  item,
  isSelected,
  onPress,
  size,
}: {
  item: SegmentedControlItem<T>;
  isSelected: boolean;
  onPress: () => void;
  size: 'sm' | 'md';
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole='tab'
      accessibilityState={{ selected: isSelected }}
      focusable
      {...windowsFocusProps()}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed, focused }: any) => [
        styles.segmentedControlSegment,
        size === 'sm'
          ? styles.segmentedControlSegmentSm
          : styles.segmentedControlSegmentMd,
        isSelected
          ? {
              backgroundColor: palette.panel,
              borderColor: palette.border,
            }
          : { backgroundColor: 'transparent', borderColor: 'transparent' },
        !isSelected && hovered && !pressed
          ? { backgroundColor: palette.canvasShade }
          : null,
        focused && { borderColor: palette.focusRing },
        pressed && !isSelected ? { opacity: 0.8 } : null,
        desktopCursor,
      ]}
    >
      {item.icon ? (
        <Icon
          icon={item.icon}
          size={size === 'sm' ? 11 : 12}
          color={isSelected ? palette.ink : palette.inkMuted}
        />
      ) : null}
      <Text
        style={[
          styles.segmentedControlLabel,
          size === 'sm'
            ? styles.segmentedControlLabelSm
            : styles.segmentedControlLabelMd,
          { color: isSelected ? palette.ink : palette.inkMuted },
          isSelected ? { fontWeight: '700' } : null,
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
//  Switch — toggle on/off
// ---------------------------------------------------------------------------

export function Switch({
  value,
  onValueChange,
  disabled = false,
  label,
  testID,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  testID?: string;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  const thumbAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const toggle = useCallback(() => {
    if (disabled) return;
    const next = !value;
    onValueChange(next);
    Animated.timing(thumbAnim, {
      toValue: next ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value, disabled, onValueChange, thumbAnim]);

  // Sync animation when value prop changes externally
  React.useEffect(() => {
    Animated.timing(thumbAnim, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value, thumbAnim]);

  const trackBg = value
    ? disabled ? palette.inkSoft : palette.accent
    : disabled ? palette.canvasShade : palette.border;

  const thumbLeft = thumbAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 18],
  });

  return (
    <Pressable
      testID={testID}
      accessibilityRole='switch'
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      focusable={!disabled}
      {...windowsFocusProps()}
      onPress={toggle}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ focused }: any) => [
        styles.switchRow,
        disabled ? { opacity: 0.5 } : null,
        desktopCursor,
      ]}
    >
      <View
        style={[
          styles.switchTrack,
          { backgroundColor: trackBg },
          hovered && !disabled ? { borderColor: palette.borderStrong } : { borderColor: trackBg },
        ]}
      >
        <Animated.View
          style={[
            styles.switchThumb,
            {
              backgroundColor: value ? palette.canvas : palette.panel,
              left: thumbLeft,
            },
          ]}
        />
      </View>
      {label ? (
        <Text
          style={[
            styles.switchLabel,
            { color: disabled ? palette.inkSoft : palette.ink },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
//  Popover — anchored floating panel
// ---------------------------------------------------------------------------

export function Popover({
  visible,
  onDismiss,
  anchor,
  placement = 'bottom',
  children,
  maxWidth = 280,
  style,
  testID,
}: {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode;
  placement?: 'top' | 'bottom';
  children: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible, mounted, fadeAnim]);

  const positionStyles: ViewStyle =
    placement === 'top'
      ? { bottom: '100%', marginBottom: 4 }
      : { top: '100%', marginTop: 4 };

  return (
    <View style={styles.popoverAnchorWrapper}>
      {anchor}
      {mounted ? (
        <Animated.View
          testID={testID}
          style={[
            styles.popoverPanel,
            positionStyles,
            {
              backgroundColor: palette.panel,
              borderColor: palette.border,
              opacity: fadeAnim,
              maxWidth,
            },
            style,
          ]}
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
//  MenuList + MenuItem — for use inside Popover or standalone
// ---------------------------------------------------------------------------

export function MenuList({
  children,
  style,
  testID,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; testID?: string }>) {
  return (
    <View testID={testID} style={[styles.menuList, style]}>
      {children}
    </View>
  );
}

export function MenuItem({
  label,
  icon,
  detail,
  onPress,
  destructive = false,
  disabled = false,
  testID,
}: {
  label: string;
  icon?: IconDefinition;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  const fg = destructive
    ? palette.errorRed
    : disabled
      ? palette.inkSoft
      : palette.ink;

  return (
    <Pressable
      testID={testID}
      accessibilityRole='menuitem'
      disabled={disabled}
      focusable={!disabled}
      {...windowsFocusProps()}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed, focused }: any) => [
        styles.menuItem,
        hovered && !pressed
          ? { backgroundColor: palette.canvasShade }
          : null,
        focused && { backgroundColor: palette.canvasShade },
        pressed ? { backgroundColor: palette.canvasShade, opacity: 0.8 } : null,
        disabled ? { opacity: 0.45 } : null,
        desktopCursor,
      ]}
    >
      {icon ? <Icon icon={icon} size={13} color={fg} /> : null}
      <Text
        style={[styles.menuItemLabel, { color: fg }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {detail ? (
        <Text
          style={[styles.menuItemDetail, { color: palette.inkSoft }]}
          numberOfLines={1}
        >
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
//  Spinner — standardized loading indicator
// ---------------------------------------------------------------------------

export function Spinner({
  size = 'md',
  tone = 'accent',
  style,
}: {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'accent' | 'neutral';
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotateAnim]);

  const spinnerSize = size === 'sm' ? 16 : size === 'lg' ? 32 : 22;
  const borderW = size === 'sm' ? 2 : size === 'lg' ? 3 : 2.5;
  const color = tone === 'accent' ? palette.accent : palette.inkMuted;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        {
          width: spinnerSize,
          height: spinnerSize,
          borderRadius: spinnerSize / 2,
          borderWidth: borderW,
          borderColor: palette.border,
          borderTopColor: color,
          transform: [{ rotate }],
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
//  KeyboardShortcut — displays key combination hints
// ---------------------------------------------------------------------------

export function KeyboardShortcut({
  keys,
  style,
}: {
  keys: string[];
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.keyboardShortcut, style]}>
      {keys.map((key, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 ? (
            <Text style={[styles.keyboardShortcutSep, { color: palette.inkSoft }]}>
              +
            </Text>
          ) : null}
          <View
            style={[
              styles.keyboardShortcutKey,
              {
                backgroundColor: palette.canvasShade,
                borderColor: palette.border,
              },
            ]}
          >
            <Text
              style={[styles.keyboardShortcutLabel, { color: palette.inkMuted }]}
            >
              {key}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// ==========================================================================
//  Sizing helpers
// ==========================================================================

const iconButtonSizes = {
  sm: { box: 28, icon: 12 },
  md: { box: 34, icon: 14 },
  lg: { box: 40, icon: 16 },
} as const;

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
    flexDirection: 'row',
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: appRadius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 100,
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: appFontFamily,
  },
  // IconButton
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  // SegmentedControl
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: appRadius.badge,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    padding: 2,
    gap: 2,
  },
  segmentedControlSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: appRadius.badge - 2,
    borderWidth: 1,
  },
  segmentedControlSegmentSm: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 26,
  },
  segmentedControlSegmentMd: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 30,
  },
  segmentedControlLabel: {
    fontFamily: appFontFamily,
    fontWeight: '600',
  },
  segmentedControlLabelSm: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  segmentedControlLabelMd: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  // Switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchTrack: {
    width: 38,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
  },
  switchThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: appFontFamily,
  },
  // Popover
  popoverAnchorWrapper: {
    position: 'relative',
  },
  popoverPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: appRadius.compact,
    borderWidth: 1,
    paddingVertical: 4,
    zIndex: 200,
    ...Platform.select({
      windows: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      default: {},
    }),
  },
  // MenuList / MenuItem
  menuList: {
    gap: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 34,
  },
  menuItemLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: appFontFamily,
    flex: 1,
    minWidth: 0,
  },
  menuItemDetail: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    fontFamily: appFontFamily,
    flexShrink: 0,
  },
  // KeyboardShortcut
  keyboardShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  keyboardShortcutKey: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardShortcutLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    fontFamily: appFontFamily,
  },
  keyboardShortcutSep: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: appFontFamily,
    marginHorizontal: 1,
  },
});
