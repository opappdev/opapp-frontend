import React, {
  createContext,
  useContext,
  useMemo,
  PropsWithChildren,
} from 'react';
import {
  type AppDensity,
  type AppPalette,
  type AppSpacing,
  type AppTone,
  type AppToneEmphasis,
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

export interface AppTheme {
  colorScheme: AppColorScheme;
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
  density: 'standard',
  palette: lightPalette,
  tonePalette: lightTonePalette,
  spacing: appSpacing,
};

export const darkTheme: AppTheme = {
  colorScheme: 'dark',
  density: 'standard',
  palette: darkPalette,
  tonePalette: darkTonePalette,
  spacing: appSpacing,
};

export const highContrastTheme: AppTheme = {
  colorScheme: 'high-contrast',
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
//  Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({
  colorScheme = 'light',
  density = 'standard',
  children,
}: PropsWithChildren<{
  colorScheme?: AppColorScheme;
  density?: AppDensity;
}>) {
  const theme = useMemo<AppTheme>(() => {
    const palette =
      colorScheme === 'high-contrast'
        ? highContrastPalette
        : colorScheme === 'dark'
          ? darkPalette
          : lightPalette;
    const tonePalette =
      colorScheme === 'high-contrast'
        ? highContrastTonePalette
        : colorScheme === 'dark'
          ? darkTonePalette
          : lightTonePalette;
    const spacing = density === 'compact' ? appSpacingCompact : appSpacing;

    return { colorScheme, density, palette, tonePalette, spacing };
  }, [colorScheme, density]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}
