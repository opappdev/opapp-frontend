// Barrel re-export — preserves all existing public API surfaces.
// Consumers continue to `import { ... } from '@opapp/ui-native-primitives'`.

// tokens (palettes, spacing, typography, layout, contracts)
export {
  appPalette,
  lightPalette,
  darkPalette,
  highContrastPalette,
  appRadius,
  appSpacing,
  appSpacingCompact,
  appDensitySpacing,
  appTypography,
  appLetterSpacing,
  appLayout,
  appInteractionStates,
  appTonePalette,
  lightTonePalette,
  darkTonePalette,
  highContrastTonePalette,
  appComponentContractsV1,
  tacticalSurfacePaletteV1,
  appFontFamily,
} from './tokens';

export type {
  AppPalette,
  AppTone,
  AppToneEmphasis,
  AppInteractionState,
  AppDensity,
  AppSpacing,
} from './tokens';

// theme
export {
  ThemeProvider,
  useTheme,
  lightTheme,
  darkTheme,
  highContrastTheme,
} from './theme';

export type { AppColorScheme, AppTheme } from './theme';

// components
export {
  AppFrame,
  SectionCard,
  ChoiceChip,
  FilterChip,
  FilterSection,
  StatusBadge,
  SignalPill,
  TimelineStep,
  InfoPanel,
  ActionButton,
  InlineMetric,
  MutedText,
  Stack,
  SurfaceSessionChrome,
  // new
  Divider,
  EmptyState,
  DataRow,
  Expander,
  Toolbar,
  ProgressBar,
  TextInput,
  Tooltip,
} from './components';
