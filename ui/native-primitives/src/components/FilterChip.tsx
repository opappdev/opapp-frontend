import React from 'react';
import { Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import {
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './shared';
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
  const {
    hovered,
    focusVisible,
    handleHoverIn,
    handleHoverOut,
    handlePointerDown,
    handlePointerUp,
    handlePressIn,
    handlePressOut,
    handleFocus,
    handleKeyDownCapture,
    handleBlur,
  } = useDiscretePressableState();
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ selected: active }}
      focusable
      {...windowsFocusProps({ nativeFocusRing: false })}
      onPress={onPress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onKeyDownCapture={handleKeyDownCapture}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={({ pressed }: any) => [
        styles.filterChip,
        active
          ? { backgroundColor: palette.accent, borderColor: palette.accent }
          : { backgroundColor: palette.panel, borderColor: palette.border },
        hovered && !pressed
          ? active
            ? { backgroundColor: palette.accentHover }
            : { backgroundColor: palette.canvasShade }
          : null,
        focusVisible ? { borderColor: palette.focusRing, borderWidth: 2 } : null,
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
