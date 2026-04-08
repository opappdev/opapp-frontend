import { Platform, TextStyle, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
//  Native Font Family
// ---------------------------------------------------------------------------

// Native controls expect a single family name here. CSS-style comma-separated
// font stacks belong in web-only layers, not React Native / RNW style props.
const windowsFontFamily = 'Segoe UI Variable Text';
const macosFontFamily = 'SF Pro Text';

export const appFontFamily =
  Platform.OS === 'windows'
    ? windowsFontFamily
    : Platform.OS === 'macos'
      ? macosFontFamily
      : undefined; // system default on other platforms

// ---------------------------------------------------------------------------
//  Interaction State Contract
// ---------------------------------------------------------------------------

export const appInteractionStates = [
  'rest',
  'hover',
  'focus-visible',
  'pressed',
  'selected',
  'disabled',
] as const;

export type AppInteractionState = (typeof appInteractionStates)[number];

// ---------------------------------------------------------------------------
//  Palette — Light Theme (canonical definition)
// ---------------------------------------------------------------------------

export const lightPalette = {
  canvas: '#ede8df',
  canvasShade: '#e3ddd2',
  panel: '#f7f3eb',
  panelEmphasis: '#dce5e7',
  border: '#c8b9a0',
  borderStrong: '#8e7d68',
  ink: '#1d2a33',
  inkMuted: '#4f6171',
  inkSoft: '#738392',
  accent: '#b65b32',
  accentSoft: '#ecd2c2',
  accentHover: '#a44f2b',
  support: '#56735d',
  supportSoft: '#d7e0d9',
  errorRed: '#9b2f22',
  focusRing: '#2b6cb0',
} as const;

// ---------------------------------------------------------------------------
//  Palette — Dark Theme (experience-first, designed from scratch)
// ---------------------------------------------------------------------------

export const darkPalette = {
  canvas: '#111714',
  canvasShade: '#0d120f',
  panel: '#1a211d',
  panelEmphasis: '#232e28',
  border: '#3a4a40',
  borderStrong: '#5e7568',
  ink: '#f0ede6',
  inkMuted: '#b0a99a',
  inkSoft: '#807a6e',
  accent: '#d4734c',
  accentSoft: '#3e261c',
  accentHover: '#e08560',
  support: '#6e9c78',
  supportSoft: '#1e2e24',
  errorRed: '#d4574a',
  focusRing: '#5a9fd4',
} as const;

// ---------------------------------------------------------------------------
//  Palette — High Contrast (maps to Windows HC system keywords)
// ---------------------------------------------------------------------------

export const highContrastPalette = {
  canvas: 'Window',
  canvasShade: 'Window',
  panel: 'Window',
  panelEmphasis: 'Highlight',
  border: 'ButtonText',
  borderStrong: 'ButtonText',
  ink: 'WindowText',
  inkMuted: 'GrayText',
  inkSoft: 'GrayText',
  accent: 'Highlight',
  accentSoft: 'Window',
  accentHover: 'Highlight',
  support: 'Highlight',
  supportSoft: 'Window',
  errorRed: 'LinkText',
  focusRing: 'Highlight',
} as const;

// ---------------------------------------------------------------------------
//  Palette type
// ---------------------------------------------------------------------------

export type AppPalette = {
  readonly canvas: string;
  readonly canvasShade: string;
  readonly panel: string;
  readonly panelEmphasis: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly ink: string;
  readonly inkMuted: string;
  readonly inkSoft: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly accentHover: string;
  readonly support: string;
  readonly supportSoft: string;
  readonly errorRed: string;
  readonly focusRing: string;
};

// backward-compat alias — consumers can import either name
export const appPalette = lightPalette;

// ---------------------------------------------------------------------------
//  Radius
//  Desktop-first geometry budget:
//  - controls stay tight
//  - panels stay structured
//  - fully pill-shaped geometry is reserved for explicit metadata exceptions
// ---------------------------------------------------------------------------

export const appRadius = {
  hero: 8,
  panel: 8,
  control: 6,
  compact: 8,
  badge: 10,
  pill: 999,
} as const;

// ---------------------------------------------------------------------------
//  Spacing — Standard density
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
//  Spacing — Compact density
// ---------------------------------------------------------------------------

export const appSpacingCompact = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  sm2: 10,
  lg: 12,
  lg2: 14,
  xl: 16,
  xl2: 18,
  xxl: 20,
} as const;

export type AppSpacing = {
  readonly xxs: number;
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly sm2: number;
  readonly lg: number;
  readonly lg2: number;
  readonly xl: number;
  readonly xl2: number;
  readonly xxl: number;
};

// ---------------------------------------------------------------------------
//  Density
// ---------------------------------------------------------------------------

export type AppDensity = 'standard' | 'compact';

export const appDensitySpacing: Record<AppDensity, AppSpacing> = {
  standard: appSpacing,
  compact: appSpacingCompact,
} as const;

// ---------------------------------------------------------------------------
//  Typography
// ---------------------------------------------------------------------------

export const appTypography = {
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800' as const,
    fontFamily: appFontFamily,
  },
  labelTight: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700' as const,
    fontFamily: appFontFamily,
  },
  labelTightBold: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800' as const,
    fontFamily: appFontFamily,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    fontFamily: appFontFamily,
  },
  captionStrong: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
    fontFamily: appFontFamily,
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800' as const,
    fontFamily: appFontFamily,
  },
  captionBody: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700' as const,
    fontFamily: appFontFamily,
  },
  captionTight: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700' as const,
    fontFamily: appFontFamily,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500' as const,
    fontFamily: appFontFamily,
  },
  bodyStrong: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700' as const,
    fontFamily: appFontFamily,
  },
  bodyTight: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700' as const,
    fontFamily: appFontFamily,
  },
  bodyTightBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800' as const,
    fontFamily: appFontFamily,
  },
  subheading: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800' as const,
    fontFamily: appFontFamily,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800' as const,
    fontFamily: appFontFamily,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800' as const,
    fontFamily: appFontFamily,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    fontFamily: appFontFamily,
  },
} as const;

export const appLetterSpacing = {
  tight: 0.4,
  normal: 0.6,
  wide: 0.9,
  wider: 1.1,
  widest: 1.4,
} as const;

// ---------------------------------------------------------------------------
//  Layout
// ---------------------------------------------------------------------------

export const appLayout = {
  frameMaxWidth: 1480,
  breakpoints: {
    compact: 980,
    wide: 1260,
  },
} as const;

// ---------------------------------------------------------------------------
//  Tone Palette
// ---------------------------------------------------------------------------

export type AppTone = 'accent' | 'neutral' | 'support' | 'warning' | 'danger';
export type AppToneEmphasis = 'soft' | 'solid';

type AppToneToken = {
  container: Pick<ViewStyle, 'backgroundColor' | 'borderColor'>;
  label: Pick<TextStyle, 'color'>;
};

function buildTonePalette(palette: AppPalette) {
  return {
    accent: {
      soft: {
        container: {
          backgroundColor: palette.accentSoft,
          borderColor: palette.accent,
        },
        label: { color: palette === lightPalette ? '#5d2b16' : '#f0c5a8' },
      },
      solid: {
        container: {
          backgroundColor: palette.accent,
          borderColor: palette.accent,
        },
        label: { color: palette === lightPalette ? '#fff7f1' : '#1a0f0a' },
      },
    },
    neutral: {
      soft: {
        container: {
          backgroundColor: palette.panel,
          borderColor: palette.border,
        },
        label: { color: palette.inkMuted },
      },
      solid: {
        container: {
          backgroundColor: palette.borderStrong,
          borderColor: palette.borderStrong,
        },
        label: { color: palette === lightPalette ? '#fff8f3' : '#111714' },
      },
    },
    support: {
      soft: {
        container: {
          backgroundColor: palette.supportSoft,
          borderColor: palette.support,
        },
        label: { color: palette === lightPalette ? '#32503a' : '#a3d4ad' },
      },
      solid: {
        container: {
          backgroundColor: palette.support,
          borderColor: palette.support,
        },
        label: { color: palette === lightPalette ? '#f4faf4' : '#121a14' },
      },
    },
    warning: {
      soft: {
        container: {
          backgroundColor: palette === lightPalette ? '#eee3bf' : '#2e2816',
          borderColor: palette === lightPalette ? '#b19243' : '#8a7535',
        },
        label: { color: palette === lightPalette ? '#6b531a' : '#d9c278' },
      },
      solid: {
        container: {
          backgroundColor: palette === lightPalette ? '#b19243' : '#8a7535',
          borderColor: palette === lightPalette ? '#b19243' : '#8a7535',
        },
        label: { color: palette === lightPalette ? '#fff8ec' : '#1a1508' },
      },
    },
    danger: {
      soft: {
        container: {
          backgroundColor: palette === lightPalette ? '#f1dfd2' : '#2e1a14',
          borderColor: palette === lightPalette ? '#d1ad94' : '#7a4030',
        },
        label: { color: palette === lightPalette ? '#6f3a23' : '#e0a890' },
      },
      solid: {
        container: {
          backgroundColor: palette === lightPalette ? '#8c4022' : '#a84e2a',
          borderColor: palette === lightPalette ? '#8c4022' : '#a84e2a',
        },
        label: { color: palette === lightPalette ? '#fff7f1' : '#1a0f0a' },
      },
    },
  } as const satisfies Record<AppTone, Record<AppToneEmphasis, AppToneToken>>;
}

export const lightTonePalette = buildTonePalette(lightPalette);
export const darkTonePalette = buildTonePalette(darkPalette);

// High-contrast tone palette uses Windows HC system keywords directly.
// soft = Window background with ButtonText border; solid = Highlight background.
export const highContrastTonePalette = {
  accent: {
    soft: {
      container: { backgroundColor: 'Window', borderColor: 'Highlight' },
      label: { color: 'WindowText' },
    },
    solid: {
      container: { backgroundColor: 'Highlight', borderColor: 'Highlight' },
      label: { color: 'HighlightText' },
    },
  },
  neutral: {
    soft: {
      container: { backgroundColor: 'Window', borderColor: 'ButtonText' },
      label: { color: 'WindowText' },
    },
    solid: {
      container: { backgroundColor: 'ButtonText', borderColor: 'ButtonText' },
      label: { color: 'Window' },
    },
  },
  support: {
    soft: {
      container: { backgroundColor: 'Window', borderColor: 'Highlight' },
      label: { color: 'WindowText' },
    },
    solid: {
      container: { backgroundColor: 'Highlight', borderColor: 'Highlight' },
      label: { color: 'HighlightText' },
    },
  },
  warning: {
    soft: {
      container: { backgroundColor: 'Window', borderColor: 'ButtonText' },
      label: { color: 'WindowText' },
    },
    solid: {
      container: { backgroundColor: 'ButtonText', borderColor: 'ButtonText' },
      label: { color: 'Window' },
    },
  },
  danger: {
    soft: {
      container: { backgroundColor: 'Window', borderColor: 'LinkText' },
      label: { color: 'LinkText' },
    },
    solid: {
      container: { backgroundColor: 'LinkText', borderColor: 'LinkText' },
      label: { color: 'Window' },
    },
  },
} as const satisfies Record<AppTone, Record<AppToneEmphasis, AppToneToken>>;

// backward-compat alias
export const appTonePalette = lightTonePalette;

// ---------------------------------------------------------------------------
//  Component Contracts (documentation object)
// ---------------------------------------------------------------------------

export const appComponentContractsV1 = {
  AppFrame: {
    usage: 'Capability page root shell with shared hero/eyebrow/title layout.',
    geometry: 'Window-anchored shell with tight structural corners, not a floating hero card.',
    avoid: 'Nested card containers and list item wrappers.',
  },
  SectionCard: {
    usage: 'Chunked content sections inside capability surfaces.',
    geometry: 'Secondary panel surface that follows the panel-radius family.',
    avoid: 'Per-row cells and clickable list item wrappers.',
  },
  ChoiceChip: {
    usage: 'Mutually exclusive or toggle-style option selection.',
    geometry: 'Interactive control-family geometry, not a badge or pill.',
    avoid: 'Primary CTA actions and free-text status rendering.',
  },
  ActionButton: {
    usage: 'Command actions (submit/open/switch/apply/reset).',
    geometry: 'Tight desktop command button; never use pill geometry for primary commands.',
    avoid: 'Passive status display and filter toggles.',
  },
  StatusBadge: {
    usage: 'Compact, non-interactive status/tone labels.',
    geometry: 'Compact label geometry only; short metadata, not controls.',
    avoid: 'Long-form copy and actionable buttons.',
  },
  SignalPill: {
    usage:
      'Contextual summary signals inside rails, wrap rows, and tactical metadata clusters.',
    geometry: 'Reserved metadata capsule; exception surface, not the default control language.',
    avoid: 'Primary status headlines, navigation, and actionable buttons.',
  },
  TimelineStep: {
    usage:
      'Sequential plan or walkthrough steps with a marker, title, description, and optional supporting body.',
    geometry: 'Structured step surface that follows the standard control/panel radius budget.',
    avoid: 'Dense table rows and primary action button groups.',
  },
  FilterChip: {
    usage: 'Lightweight filter/scope toggles inside filter rails.',
    geometry: 'Context-control family geometry aligned with other desktop toggles.',
    avoid: 'Primary actions and multi-line descriptive cards.',
  },
  Divider: {
    usage:
      'Semantic horizontal or vertical separator between content sections.',
    avoid: 'Decorative borders and card outlines.',
  },
  EmptyState: {
    usage:
      'Teaching empty-data placeholder with guidance text and optional action.',
    avoid: "Generic 'nothing here' messages without actionable guidance.",
  },
  DataRow: {
    usage:
      'Structured list row for character/style/item display with badge cluster.',
    avoid: 'Selectable current-item rows and deeply nested layouts.',
  },
  SelectableRow: {
    usage:
      'Selectable current-item rows in master-detail panes, inspectors, and actionable lists.',
    geometry:
      'Structured row shell with keyboard-only focus ring and a slim current-item indicator.',
    avoid: 'Primary CTA strips, passive status banners, and badge-only metadata rows.',
  },
  Expander: {
    usage: 'Collapsible group header with keyboard-accessible toggle.',
    geometry: 'Control-family header shell, not a decorative card wrapper.',
    avoid: 'Non-collapsible section titles and deeply nested accordions.',
  },
  Toolbar: {
    usage: 'Horizontal page-level or section-level command bar.',
    geometry: 'Structured command rail with tight control-family corners.',
    avoid: 'Navigation tabs and inline content actions.',
  },
  ProgressBar: {
    usage: 'Tone-aware value/readiness progress indicator.',
    avoid: 'Decorative fills without a numeric backing value.',
  },
  TextInput: {
    usage: 'Search/filter text entry with focus ring and clear action.',
    geometry: 'Desktop text-entry field aligned to the control family.',
    avoid: 'Multi-line rich text editing.',
  },
} as const;

// ---------------------------------------------------------------------------
//  Tactical Surface Palette (HBR)
// ---------------------------------------------------------------------------

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
