import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './KeyboardShortcut.styles';

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
