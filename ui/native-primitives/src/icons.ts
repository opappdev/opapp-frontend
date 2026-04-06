import React from 'react';
import { Platform, Text, type TextStyle } from 'react-native';
import { useTheme } from './theme';

// ---------------------------------------------------------------------------
//  Icon System — OPApp
//
//  Design baseline: Fluent 2 visual semantics (Microsoft).
//  Current renderer: Segoe MDL2 Assets font (ships with Windows 10+).
//
//  Glyph codepoints sourced from Microsoft Segoe MDL2 Assets documentation.
//  https://learn.microsoft.com/en-us/windows/apps/design/style/segoe-ui-symbol-font
//
//  Migration path: when react-native-svg is added, swap the renderer to SVG
//  paths from @fluentui/svg-icons (MIT) without changing the consumer API.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface IconDefinition {
  /** Accessible label for screen readers. */
  readonly label: string;
  /** Segoe MDL2 Assets codepoint (Windows renderer). */
  readonly glyph: string;
}

export interface IconProps {
  /** Which icon to render. */
  icon: IconDefinition;
  /** Icon size in dp — defaults to 16. */
  size?: number;
  /** Override color — defaults to palette.ink from theme. */
  color?: string;
  /** Additional text style overrides. */
  style?: TextStyle;
}

// ---------------------------------------------------------------------------
//  Font family for glyph rendering
// ---------------------------------------------------------------------------

const iconFontFamily =
  Platform.OS === 'windows' ? 'Segoe MDL2 Assets' : undefined;

// ---------------------------------------------------------------------------
//  Icon Component
// ---------------------------------------------------------------------------

export function Icon({ icon, size = 16, color, style }: IconProps) {
  const { palette } = useTheme();
  return React.createElement(Text, {
    accessible: true,
    accessibilityLabel: icon.label,
    accessibilityRole: 'image',
    style: [
      {
        fontFamily: iconFontFamily,
        fontSize: size,
        color: color ?? palette.ink,
        lineHeight: size * 1.15,
        textAlign: 'center' as const,
        width: size,
        height: size,
      },
      style,
    ],
  }, icon.glyph);
}

// ---------------------------------------------------------------------------
//  Curated Icon Catalog
//
//  Only icons that are actively consumed or planned for near-term use.
//  Add new entries as needed — do not pre-populate speculatively.
// ---------------------------------------------------------------------------

export const iconCatalog = {
  // ── Navigation ──
  chevronRight:  { label: 'Chevron right',  glyph: '\uE76C' },
  chevronDown:   { label: 'Chevron down',   glyph: '\uE70D' },
  chevronUp:     { label: 'Chevron up',     glyph: '\uE70E' },
  chevronLeft:   { label: 'Chevron left',   glyph: '\uE76B' },

  // ── Actions ──
  play:          { label: 'Play',           glyph: '\uE768' },
  stop:          { label: 'Stop',           glyph: '\uE71A' },
  send:          { label: 'Send',           glyph: '\uE724' },
  refresh:       { label: 'Refresh',        glyph: '\uE72C' },
  add:           { label: 'Add',            glyph: '\uE710' },
  edit:          { label: 'Edit',           glyph: '\uE70F' },
  delete_:       { label: 'Delete',         glyph: '\uE74D' },
  copy:          { label: 'Copy',           glyph: '\uE8C8' },
  save:          { label: 'Save',           glyph: '\uE74E' },
  more:          { label: 'More',           glyph: '\uE712' },
  filter:        { label: 'Filter',         glyph: '\uE71C' },
  search:        { label: 'Search',         glyph: '\uE721' },

  // ── Status ──
  checkmark:     { label: 'Checkmark',      glyph: '\uE73E' },
  dismiss:       { label: 'Dismiss',        glyph: '\uE711' },
  warning:       { label: 'Warning',        glyph: '\uE7BA' },
  errorBadge:    { label: 'Error',          glyph: '\uEA39' },
  info:          { label: 'Info',           glyph: '\uE946' },

  // ── Objects ──
  terminal:      { label: 'Terminal',       glyph: '\uE756' },
  document:      { label: 'Document',       glyph: '\uE8A5' },
  folder:        { label: 'Folder',         glyph: '\uE8B7' },
  folderOpen:    { label: 'Open folder',    glyph: '\uE838' },
  code:          { label: 'Code',           glyph: '\uE943' },
  settings:      { label: 'Settings',       glyph: '\uE713' },
  clock:         { label: 'Clock',          glyph: '\uE81C' },
  diffView:      { label: 'Compare',        glyph: '\uE89F' },

  // ── Agent Workbench ──
  approve:       { label: 'Approve',        glyph: '\uE73E' },
  reject:        { label: 'Reject',         glyph: '\uE711' },
  chat:          { label: 'Chat',           glyph: '\uE8BD' },
  robot:         { label: 'Robot',          glyph: '\uE99A' },
  shieldTask:    { label: 'Shield task',    glyph: '\uE72E' },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof iconCatalog;
