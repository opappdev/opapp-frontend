import React, { useState } from 'react';
import { Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { desktopCursor, windowsFocusProps } from './shared';
import { styles } from './FilterChip.styles';

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
