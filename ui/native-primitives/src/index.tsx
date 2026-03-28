import React, {PropsWithChildren} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import type {ResolvedSurfaceSession} from '@opapp/framework-surfaces';
import {appI18n} from '@opapp/framework-i18n';

export const appPalette = {
  canvas: '#f2eadb',
  canvasShade: '#e8dcc5',
  panel: '#fbf6ec',
  panelEmphasis: '#dce5e7',
  border: '#c8b9a0',
  borderStrong: '#8e7d68',
  ink: '#1d2a33',
  inkMuted: '#4f6171',
  inkSoft: '#738392',
  accent: '#b65b32',
  accentSoft: '#ecd2c2',
  support: '#56735d',
  supportSoft: '#d7e0d9',
  errorRed: '#9b2f22',
} as const;

export const appRadius = {
  hero: 20,
  panel: 18,
  control: 14,
  compact: 12,
  badge: 10,
  pill: 999,
} as const;

export const appSpacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 10,
  sm2: 12,
  lg: 14,
  lg2: 16,
  xl: 18,
  xl2: 20,
  xxl: 22,
} as const;

export const appTypography = {
  label: {fontSize: 11, lineHeight: 14, fontWeight: '800' as const},
  labelTight: {fontSize: 11, lineHeight: 15, fontWeight: '700' as const},
  labelTightBold: {fontSize: 11, lineHeight: 15, fontWeight: '800' as const},
  caption: {fontSize: 12, lineHeight: 16, fontWeight: '500' as const},
  captionStrong: {fontSize: 12, lineHeight: 16, fontWeight: '700' as const},
  captionBold: {fontSize: 12, lineHeight: 16, fontWeight: '800' as const},
  captionBody: {fontSize: 12, lineHeight: 18, fontWeight: '700' as const},
  captionTight: {fontSize: 12, lineHeight: 17, fontWeight: '700' as const},
  body: {fontSize: 13, lineHeight: 20, fontWeight: '500' as const},
  bodyStrong: {fontSize: 13, lineHeight: 20, fontWeight: '700' as const},
  bodyTight: {fontSize: 13, lineHeight: 18, fontWeight: '700' as const},
  bodyTightBold: {fontSize: 13, lineHeight: 18, fontWeight: '800' as const},
  subheading: {fontSize: 15, lineHeight: 20, fontWeight: '800' as const},
  sectionTitle: {fontSize: 14, lineHeight: 18, fontWeight: '800' as const},
  title: {fontSize: 20, lineHeight: 24, fontWeight: '800' as const},
  headline: {fontSize: 28, lineHeight: 34, fontWeight: '800' as const},
} as const;

export const appLetterSpacing = {
  tight: 0.4,
  normal: 0.6,
  wide: 0.9,
  wider: 1.1,
  widest: 1.4,
} as const;

export const appLayout = {
  frameMaxWidth: 1480,
  breakpoints: {
    compact: 980,
    wide: 1260,
  },
} as const;

export const appInteractionStates = ['default', 'hover', 'pressed', 'disabled'] as const;

export type AppTone = 'accent' | 'neutral' | 'support' | 'warning' | 'danger';

export type AppToneEmphasis = 'soft' | 'solid';

type AppToneToken = {
  container: Pick<ViewStyle, 'backgroundColor' | 'borderColor'>;
  label: Pick<TextStyle, 'color'>;
};

export const appTonePalette = {
  accent: {
    soft: {
      container: {backgroundColor: appPalette.accentSoft, borderColor: appPalette.accent},
      label: {color: '#5d2b16'},
    },
    solid: {
      container: {backgroundColor: appPalette.accent, borderColor: appPalette.accent},
      label: {color: '#fff7f1'},
    },
  },
  neutral: {
    soft: {
      container: {backgroundColor: appPalette.panel, borderColor: appPalette.border},
      label: {color: appPalette.inkMuted},
    },
    solid: {
      container: {backgroundColor: appPalette.borderStrong, borderColor: appPalette.borderStrong},
      label: {color: '#fff8f3'},
    },
  },
  support: {
    soft: {
      container: {backgroundColor: appPalette.supportSoft, borderColor: appPalette.support},
      label: {color: '#32503a'},
    },
    solid: {
      container: {backgroundColor: appPalette.support, borderColor: appPalette.support},
      label: {color: '#f4faf4'},
    },
  },
  warning: {
    soft: {
      container: {backgroundColor: '#eee3bf', borderColor: '#b19243'},
      label: {color: '#6b531a'},
    },
    solid: {
      container: {backgroundColor: '#b19243', borderColor: '#b19243'},
      label: {color: '#fff8ec'},
    },
  },
  danger: {
    soft: {
      container: {backgroundColor: '#f1dfd2', borderColor: '#d1ad94'},
      label: {color: '#6f3a23'},
    },
    solid: {
      container: {backgroundColor: '#8c4022', borderColor: '#8c4022'},
      label: {color: '#fff7f1'},
    },
  },
} as const satisfies Record<AppTone, Record<AppToneEmphasis, AppToneToken>>;

export const appComponentContractsV1 = {
  AppFrame: {
    usage: 'Capability page root shell with shared hero/eyebrow/title layout.',
    avoid: 'Nested card containers and list item wrappers.',
  },
  SectionCard: {
    usage: 'Chunked content sections inside capability surfaces.',
    avoid: 'Per-row cells and clickable list item wrappers.',
  },
  ChoiceChip: {
    usage: 'Mutually exclusive or toggle-style option selection.',
    avoid: 'Primary CTA actions and free-text status rendering.',
  },
  ActionButton: {
    usage: 'Command actions (submit/open/switch/apply/reset).',
    avoid: 'Passive status display and filter toggles.',
  },
  StatusBadge: {
    usage: 'Compact, non-interactive status/tone labels.',
    avoid: 'Long-form copy and actionable buttons.',
  },
  SignalPill: {
    usage: 'Contextual summary signals inside rails, wrap rows, and tactical metadata clusters.',
    avoid: 'Primary status headlines and actionable buttons.',
  },
  TimelineStep: {
    usage: 'Sequential plan or walkthrough steps with a marker, title, description, and optional supporting body.',
    avoid: 'Dense table rows and primary action button groups.',
  },
  FilterChip: {
    usage: 'Lightweight filter/scope toggles inside filter rails.',
    avoid: 'Primary actions and multi-line descriptive cards.',
  },
} as const;

export const tacticalSurfacePaletteV1 = {
  inkDeep: '#2b161a',
  inkBrownEyebrow: '#8d5c45',
  inkBrownBody: '#6f5647',
  inkBrownMeta: '#b49378',
  inkBrownLabel: '#7d4a34',
  inkBrownStrong: '#6c4030',
  inkBrownRef: '#6b4a31',
  inkBrownWarn: '#6f3a23',
  inkTrain: '#7d5d49',
  inkTrainVacant: '#b26f4a',
  inkRisk: '#5d2b16',
  inkTimelineNum: '#622e1d',
  inkTimelineWarn: '#7a3419',
  slate: '#32171c',
  slateKicker: '#551f25',
  slateDivider: '#5a3639',
  slateSubdivider: '#412529',
  onSlate: '#fff1ea',
  onSlateLabel: '#f6d3c8',
  onSlateEyebrow: '#f2cfc4',
  onSlateKicker: '#f8e7de',
  canvasLead: '#f7eee3',
  canvasSection: '#faf2e8',
  canvasShortcut: '#fbf4eb',
  canvasAccent: '#f1dacc',
  canvasMid: '#efe0d1',
  canvasWarm: '#f6ece0',
  canvasTight: '#eee3bf',
  canvasRisk: '#f1dfd2',
  canvasTimeline: '#f1dfd4',
  canvasEvidence: '#f6efe5',
  canvasPressed: '#f0e0d1',
  canvasSignal: '#edd7ca',
  borderLead: '#cfb49c',
  borderSection: '#d1baa3',
  borderCardLine: '#dfcfbf',
  borderWarm: '#d8bfa9',
  borderWarmLight: '#ddc6af',
  borderCard: '#d8c5b0',
  borderLight: '#d9c5b3',
  borderTimeline: '#d5b39e',
  borderTimelineBody: '#e2c2b2',
  borderRisk: '#d1ad94',
  borderEvidence: '#d9c4ae',
  borderEvidenceItem: '#e0cfbe',
  borderSignalSoft: '#dbcab5',
  borderShortcut: '#d7c0aa',
  borderHot: '#c77447',
  borderTight: '#b19243',
  link: '#005a8d',
} as const;

export function AppFrame({
  eyebrow,
  title,
  description,
  children,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <View style={styles.frame}>
      <View style={styles.frameInner}>
        <View style={styles.heroShell}>
          <View style={styles.heroTopline}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <View style={styles.heroRule} />
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroDescription}>{description}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: PropsWithChildren<{
  title: string;
  description?: string;
}>) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

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
}) {
  const activationIdRef = React.useRef(0);
  const suppressPressForActivationRef = React.useRef<number | null>(null);
  const windowsInteractionProps =
    Platform.OS === 'windows'
      ? ({enableFocusRing: false, tabIndex: -1} as any)
      : {};

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      focusable={false}
      {...windowsInteractionProps}
      hitSlop={6}
      pressRetentionOffset={{top: 12, right: 12, bottom: 12, left: 12}}
      onPress={() => {
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
      style={({pressed}) => [
        styles.chip,
        active ? styles.chipActive : styles.chipIdle,
        emphasized
          ? active
            ? styles.chipActiveEmphasized
            : styles.chipIdleEmphasized
          : null,
        pressed && activationBehavior === 'press'
          ? active
            ? styles.chipActivePressed
            : styles.chipPressed
          : null,
        style,
      ]}>
      {emphasized ? (
        <View
          pointerEvents="none"
          style={[
            styles.chipEmphasisBand,
            active ? styles.chipEmphasisBandActive : styles.chipEmphasisBandIdle,
          ]}
        />
      ) : null}
      <View style={styles.chipHeader}>
        <Text
          numberOfLines={2}
          style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>
          {label}
        </Text>
        <View
          style={[
            styles.chipIndicator,
            active ? styles.chipIndicatorActive : styles.chipIndicatorIdle,
          ]}>
          <Text
            style={[
              styles.chipIndicatorLabel,
              active ? styles.chipIndicatorLabelActive : styles.chipIndicatorLabelIdle,
            ]}>
            {active ? activeBadgeLabel : inactiveBadgeLabel}
          </Text>
        </View>
      </View>
      {detail ? (
        <Text style={[styles.chipDetail, active ? styles.chipDetailActive : null]}>
          {detail}
        </Text>
      ) : null}
      {meta ? (
        <Text style={[styles.chipMeta, active ? styles.chipMetaActive : null]}>
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      onPress={onPress}
      style={({pressed}) => [
        styles.filterChip,
        active ? styles.filterChipActive : styles.filterChipIdle,
        pressed ? styles.filterChipPressed : null,
        style,
      ]}>
      <Text
        style={[
          styles.filterChipLabel,
          active ? styles.filterChipLabelActive : styles.filterChipLabelIdle,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FilterSection({
  label,
  items,
  style,
}: {
  label: string;
  items: {key: string; label: string; active: boolean; onPress: () => void}[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.filterSection, style]}>
      <Text style={styles.filterSectionLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterSectionRow}>
        {items.map(item => (
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

export function StatusBadge({
  label,
  tone = 'neutral',
  emphasis = 'soft',
  size = 'md',
  style,
  textStyle,
}: {
  label: string;
  tone?: AppTone;
  emphasis?: AppToneEmphasis;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const toneStyles = appTonePalette[tone][emphasis];

  return (
    <View
      style={[
        styles.statusBadge,
        size === 'sm' ? styles.statusBadgeSm : styles.statusBadgeMd,
        toneStyles.container,
        style,
      ]}>
      <Text
        numberOfLines={1}
        style={[styles.statusBadgeLabel, toneStyles.label, textStyle]}>
        {label}
      </Text>
    </View>
  );
}

export function SignalPill({
  label,
  tone = 'neutral',
  emphasis = 'soft',
  size = 'md',
  style,
  textStyle,
}: {
  label: string;
  tone?: AppTone;
  emphasis?: AppToneEmphasis;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const toneStyles = appTonePalette[tone][emphasis];

  return (
    <View
      style={[
        styles.signalPill,
        size === 'sm' ? styles.signalPillSm : styles.signalPillMd,
        toneStyles.container,
        style,
      ]}>
      <Text
        style={[
          styles.signalPillLabel,
          size === 'sm' ? styles.signalPillLabelSm : styles.signalPillLabelMd,
          toneStyles.label,
          textStyle,
        ]}>
        {label}
      </Text>
    </View>
  );
}

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
  const toneStyles = appTonePalette[tone].soft;

  return (
    <View style={[styles.timelineStep, style]}>
      <View
        style={[
          styles.timelineStepMarker,
          toneStyles.container,
        ]}>
        <Text style={[styles.timelineStepMarkerLabel, toneStyles.label]}>{markerLabel}</Text>
      </View>
      <View
        style={[
          styles.timelineStepBody,
          {borderLeftColor: toneStyles.container.borderColor},
        ]}>
        <Text style={styles.timelineStepTitle}>{title}</Text>
        <Text style={styles.timelineStepDescription}>{description}</Text>
        {children}
        {warning ? <Text style={styles.timelineStepWarning}>{warning}</Text> : null}
      </View>
    </View>
  );
}

export function InfoPanel({
  title,
  tone = 'danger',
  children,
  style,
}: PropsWithChildren<{
  title: string;
  tone?: 'accent' | 'danger' | 'neutral';
  style?: StyleProp<ViewStyle>;
}>) {
  const toneStyles = appTonePalette[tone].soft;
  const titleToneStyle = tone === 'neutral' ? styles.infoPanelTitleNeutral : toneStyles.label;

  return (
    <View style={[styles.infoPanel, toneStyles.container, style]}>
      <Text style={[styles.infoPanelTitle, titleToneStyle]}>{title}</Text>
      <View style={styles.infoPanelBody}>{children}</View>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  disabled = false,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'ghost';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.actionButton,
        tone === 'accent' ? styles.actionButtonAccent : styles.actionButtonGhost,
        disabled ? styles.actionButtonDisabled : null,
        pressed && !disabled ? styles.actionButtonPressed : null,
      ]}>
      <Text
        style={[
          styles.actionButtonLabel,
          tone === 'accent' ? styles.actionButtonLabelAccent : styles.actionButtonLabelGhost,
          disabled ? styles.actionButtonLabelDisabled : null,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function InlineMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'accent';
}) {
  return (
    <View
      style={[
        styles.metric,
        tone === 'accent' ? styles.metricAccent : styles.metricDefault,
      ]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function MutedText({
  children,
  style,
}: PropsWithChildren<{style?: StyleProp<TextStyle>}>) {
  return <Text style={[styles.mutedText, style]}>{children}</Text>;
}

export function Stack({
  children,
  style,
}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {
  return <View style={[styles.stack, style]}>{children}</View>;
}

export function SurfaceSessionChrome({
  label = appI18n.app.surfaceSessionLabel,
  session,
  onSelectTab,
  onCloseTab,
}: {
  label?: string;
  session: ResolvedSurfaceSession;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}) {
  if (session.tabs.length <= 1) {
    return null;
  }

  return (
    <View style={styles.surfaceHostChrome}>
      <View style={styles.surfaceHostChromeInner}>
        <Text style={styles.surfaceHostLabel}>{label}</Text>
        <View style={styles.surfaceTabRow}>
          {session.tabs.map(tab => (
            <View
              key={tab.tabId}
              style={[
                styles.surfaceTab,
                tab.isActive ? styles.surfaceTabActive : null,
              ]}>
              <Pressable
                onPress={() => onSelectTab(tab.tabId)}
                style={({pressed}) => [
                  styles.surfaceTabBody,
                  pressed ? styles.surfaceTabPressed : null,
                ]}>
                <Text
                  style={[
                    styles.surfaceTabTitle,
                    tab.isActive ? styles.surfaceTabTitleActive : null,
                  ]}>
                  {tab.title}
                </Text>
                <Text
                  style={[
                    styles.surfaceTabMeta,
                    tab.isActive ? styles.surfaceTabMetaActive : null,
                  ]}>
                  {tab.policy}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${appI18n.app.closeTabLabelPrefix}${tab.title}`}
                onPress={() => onCloseTab(tab.tabId)}
                style={({pressed}) => [
                  styles.surfaceTabClose,
                  pressed ? styles.surfaceTabClosePressed : null,
                ]}>
                <Text style={styles.surfaceTabCloseLabel}>X</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: appPalette.canvas,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  frameInner: {
    width: '100%',
    maxWidth: appLayout.frameMaxWidth,
    gap: 18,
  },
  heroShell: {
    backgroundColor: appPalette.panel,
    borderWidth: 1,
    borderColor: appPalette.border,
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
    color: appPalette.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  heroRule: {
    flex: 1,
    height: 1,
    backgroundColor: appPalette.border,
  },
  heroTitle: {
    color: appPalette.ink,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    maxWidth: 720,
  },
  heroDescription: {
    color: appPalette.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 820,
  },
  sectionCard: {
    backgroundColor: appPalette.panel,
    borderWidth: 1,
    borderColor: appPalette.border,
    borderRadius: appRadius.panel,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  sectionHeader: {
    gap: 5,
  },
  sectionTitle: {
    color: appPalette.ink,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  sectionDescription: {
    color: appPalette.inkMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionContent: {
    gap: 14,
  },
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
  chipEmphasisBandIdle: {
    backgroundColor: '#8e745f',
  },
  chipEmphasisBandActive: {
    backgroundColor: '#b65b32',
  },
  chipIdle: {
    backgroundColor: appPalette.canvas,
    borderColor: '#d4c5af',
  },
  chipActive: {
    backgroundColor: appPalette.accentSoft,
    borderColor: '#c77447',
  },
  chipIdleEmphasized: {
    backgroundColor: '#f6efe5',
    borderColor: '#c0aa90',
  },
  chipActiveEmphasized: {
    backgroundColor: '#efd4c5',
    borderColor: '#c77447',
  },
  chipPressed: {
    backgroundColor: '#eee2d1',
    borderColor: '#b6a488',
  },
  chipActivePressed: {
    backgroundColor: '#e4c3ae',
    borderColor: '#9e5431',
  },
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
  chipIndicatorIdle: {
    backgroundColor: '#fcf7ef',
    borderColor: '#b9a585',
  },
  chipIndicatorActive: {
    backgroundColor: appPalette.accent,
    borderColor: appPalette.accent,
  },
  chipIndicatorLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
  },
  chipIndicatorLabelIdle: {
    color: '#6f5a43',
  },
  chipIndicatorLabelActive: {
    color: '#fff7f1',
  },
  chipLabel: {
    color: appPalette.ink,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  chipLabelActive: {
    color: '#36211d',
  },
  chipDetail: {
    color: appPalette.inkMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  chipDetailActive: {
    color: '#6f4c37',
  },
  chipMeta: {
    color: appPalette.inkSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  chipMetaActive: {
    color: '#7d5d49',
  },
  filterChip: {
    minWidth: 64,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: appRadius.badge,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipIdle: {
    backgroundColor: appPalette.panel,
    borderColor: '#d5c4ae',
  },
  filterChipActive: {
    backgroundColor: appPalette.accent,
    borderColor: appPalette.accent,
  },
  filterChipPressed: {
    transform: [{translateY: 1}],
  },
  filterChipLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  filterChipLabelIdle: {
    color: appPalette.inkSoft,
  },
  filterChipLabelActive: {
    color: '#fff8f3',
  },
  filterSection: {
    gap: 8,
  },
  filterSectionLabel: {
    color: appPalette.inkSoft,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  filterSectionRow: {
    gap: 10,
    paddingRight: 12,
  },
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
  },
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
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: appSpacing.sm2,
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
    gap: appSpacing.xs,
    paddingLeft: appSpacing.lg,
    paddingBottom: appSpacing.lg,
    borderLeftWidth: 2,
  },
  timelineStepTitle: {
    color: appPalette.ink,
    ...appTypography.subheading,
  },
  timelineStepDescription: {
    color: appPalette.inkMuted,
    ...appTypography.body,
  },
  timelineStepWarning: {
    color: appTonePalette.danger.soft.label.color,
    ...appTypography.captionBody,
  },
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
  },
  infoPanelTitleNeutral: {
    color: appPalette.ink,
  },
  actionButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: appRadius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonAccent: {
    backgroundColor: appPalette.accent,
    borderColor: appPalette.accent,
  },
  actionButtonGhost: {
    backgroundColor: appPalette.canvas,
    borderColor: appPalette.borderStrong,
  },
  actionButtonDisabled: {
    backgroundColor: '#e7dcc8',
    borderColor: '#cdbca0',
  },
  actionButtonPressed: {
    transform: [{translateY: 1}],
  },
  actionButtonLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionButtonLabelAccent: {
    color: '#fff7f1',
  },
  actionButtonLabelGhost: {
    color: appPalette.ink,
  },
  actionButtonLabelDisabled: {
    color: appPalette.inkSoft,
  },
  metric: {
    minWidth: 118,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: appRadius.control,
    borderWidth: 1,
    gap: 5,
  },
  metricDefault: {
    backgroundColor: appPalette.canvas,
    borderColor: appPalette.border,
  },
  metricAccent: {
    backgroundColor: appPalette.supportSoft,
    borderColor: appPalette.support,
  },
  metricLabel: {
    color: appPalette.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: appPalette.ink,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
  },
  mutedText: {
    color: appPalette.inkMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  surfaceHostChrome: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: appPalette.border,
    backgroundColor: appPalette.canvasShade,
    alignItems: 'center',
  },
  surfaceHostChromeInner: {
    width: '100%',
    maxWidth: appLayout.frameMaxWidth,
    gap: 8,
  },
  surfaceHostLabel: {
    color: appPalette.inkSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
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
    borderColor: appPalette.border,
    borderRadius: 14,
    backgroundColor: appPalette.panel,
    overflow: 'hidden',
  },
  surfaceTabActive: {
    backgroundColor: appPalette.panelEmphasis,
    borderColor: appPalette.borderStrong,
  },
  surfaceTabBody: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  surfaceTabPressed: {
    transform: [{translateY: 1}],
  },
  surfaceTabTitle: {
    color: appPalette.ink,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  surfaceTabTitleActive: {
    color: appPalette.ink,
  },
  surfaceTabMeta: {
    color: appPalette.inkSoft,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  surfaceTabMetaActive: {
    color: appPalette.accent,
  },
  surfaceTabClose: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: appPalette.border,
    backgroundColor: appPalette.canvasShade,
  },
  surfaceTabClosePressed: {
    backgroundColor: appPalette.panelEmphasis,
  },
  surfaceTabCloseLabel: {
    color: appPalette.inkSoft,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  stack: {
    gap: 10,
  },
});
