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
  DensityPreferenceProvider,
  useTheme,
  useDensityPreference,
  lightTheme,
  darkTheme,
  highContrastTheme,
} from './theme';

export type { AppColorScheme, AppTheme, DensityPreference } from './theme';

// icons
export { Icon, iconCatalog } from './icons';
export type { IconDefinition, IconProps, IconName } from './icons';

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
  SelectableRow,
  Expander,
  Toolbar,
  ProgressBar,
  TextInput,
  Tooltip,
  IconButton,
  SegmentedControl,
  Switch,
  Popover,
  MenuList,
  MenuItem,
  Spinner,
  KeyboardShortcut,
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './components';

export type {
  TooltipPlacement,
  IconButtonSize,
  SelectableRowProps,
  SegmentedControlItem,
} from './components';
