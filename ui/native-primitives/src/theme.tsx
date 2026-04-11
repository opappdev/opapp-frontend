import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  PropsWithChildren,
} from 'react';
import {
  type AppDensity,
  type AppPalette,
  type AppSpacing,
  type AppTone,
  type AppToneEmphasis,
  buildTonePalette,
  lightPalette,
  darkPalette,
  highContrastPalette,
  appSpacing,
  appSpacingCompact,
  lightTonePalette,
  darkTonePalette,
  highContrastTonePalette,
} from './tokens';

// ---------------------------------------------------------------------------
//  Theme types
// ---------------------------------------------------------------------------

export type AppColorScheme = 'light' | 'dark' | 'high-contrast';
export type AppAppearancePreset = 'classic' | 'blossom';

export const blossomLightPalette = {
  canvas: '#ece5ee',
  canvasShade: '#e1d8e6',
  panel: '#fffafd',
  panelEmphasis: '#f4ecf7',
  border: '#cebfd7',
  borderStrong: '#625a7d',
  ink: '#2c2435',
  inkMuted: '#5d556c',
  inkSoft: '#847894',
  accent: '#dc6799',
  accentSoft: '#f8dfea',
  accentHover: '#c84f84',
  support: '#73c9d8',
  supportSoft: '#dff5f7',
  errorRed: '#d16688',
  focusRing: '#67cfda',
} satisfies AppPalette;

export const blossomDarkPalette = {
  canvas: '#e8e1eb',
  canvasShade: '#dcd3e1',
  panel: '#f8f2f9',
  panelEmphasis: '#eee6f1',
  border: '#cabbd1',
  borderStrong: '#5b5374',
  ink: '#2a2232',
  inkMuted: '#5d556d',
  inkSoft: '#837892',
  accent: '#d86194',
  accentSoft: '#efd2df',
  accentHover: '#c44d82',
  support: '#70c5d4',
  supportSoft: '#d9eff3',
  errorRed: '#cb617f',
  focusRing: '#66ccd7',
} satisfies AppPalette;

function resolveThemePalette(
  colorScheme: AppColorScheme,
  appearancePreset: AppAppearancePreset,
): AppPalette {
  if (colorScheme === 'high-contrast') {
    return highContrastPalette;
  }

  if (appearancePreset === 'blossom') {
    return colorScheme === 'dark' ? blossomDarkPalette : blossomLightPalette;
  }

  return colorScheme === 'dark' ? darkPalette : lightPalette;
}

function resolveThemeTonePalette(
  colorScheme: AppColorScheme,
  appearancePreset: AppAppearancePreset,
) {
  if (colorScheme === 'high-contrast') {
    return highContrastTonePalette;
  }

  if (appearancePreset === 'blossom') {
    return buildTonePalette(
      resolveThemePalette(colorScheme, appearancePreset),
      colorScheme === 'dark' ? 'dark' : 'light',
    );
  }

  return colorScheme === 'dark' ? darkTonePalette : lightTonePalette;
}

export interface AppTheme {
  colorScheme: AppColorScheme;
  appearancePreset: AppAppearancePreset;
  density: AppDensity;
  palette: AppPalette;
  tonePalette: Record<
    AppTone,
    Record<
      AppToneEmphasis,
      {
        container: { backgroundColor: string; borderColor: string };
        label: { color: string };
      }
    >
  >;
  spacing: AppSpacing;
}

// ---------------------------------------------------------------------------
//  Pre-built themes
// ---------------------------------------------------------------------------

export const lightTheme: AppTheme = {
  colorScheme: 'light',
  appearancePreset: 'classic',
  density: 'standard',
  palette: lightPalette,
  tonePalette: lightTonePalette,
  spacing: appSpacing,
};

export const darkTheme: AppTheme = {
  colorScheme: 'dark',
  appearancePreset: 'classic',
  density: 'standard',
  palette: darkPalette,
  tonePalette: darkTonePalette,
  spacing: appSpacing,
};

export const highContrastTheme: AppTheme = {
  colorScheme: 'high-contrast',
  appearancePreset: 'classic',
  density: 'standard',
  palette: highContrastPalette,
  tonePalette: highContrastTonePalette,
  spacing: appSpacing,
};

// ---------------------------------------------------------------------------
//  Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<AppTheme>(lightTheme);

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}

// ---------------------------------------------------------------------------
//  Density preference (read/write density independent of ThemeProvider)
// ---------------------------------------------------------------------------

export interface DensityPreference {
  density: AppDensity;
  setDensity: (density: AppDensity) => void;
}

const DensityPreferenceContext = createContext<DensityPreference>({
  density: 'standard',
  setDensity: () => {},
});

export function useDensityPreference(): DensityPreference {
  return useContext(DensityPreferenceContext);
}

export function DensityPreferenceProvider({
  children,
}: PropsWithChildren) {
  const [density, setDensityRaw] = useState<AppDensity>('standard');
  const setDensity = useCallback((d: AppDensity) => setDensityRaw(d), []);
  const value = useMemo(() => ({ density, setDensity }), [density, setDensity]);

  return (
    <DensityPreferenceContext.Provider value={value}>
      {children}
    </DensityPreferenceContext.Provider>
  );
}

// ---------------------------------------------------------------------------
//  Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({
  colorScheme = 'light',
  appearancePreset = 'classic',
  density = 'standard',
  children,
}: PropsWithChildren<{
  colorScheme?: AppColorScheme;
  appearancePreset?: AppAppearancePreset;
  density?: AppDensity;
}>) {
  const theme = useMemo<AppTheme>(() => {
    const palette = resolveThemePalette(colorScheme, appearancePreset);
    const tonePalette = resolveThemeTonePalette(colorScheme, appearancePreset);
    const spacing = density === 'compact' ? appSpacingCompact : appSpacing;

    return {
      colorScheme,
      appearancePreset,
      density,
      palette,
      tonePalette,
      spacing,
    };
  }, [appearancePreset, colorScheme, density]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function AppThemeProvider({
  theme,
  children,
}: PropsWithChildren<{theme: AppTheme}>) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}
