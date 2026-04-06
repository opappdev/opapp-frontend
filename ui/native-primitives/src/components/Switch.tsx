import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { desktopCursor, windowsFocusProps } from './shared';
import { styles } from './Switch.styles';

export function Switch({
  value,
  onValueChange,
  disabled = false,
  label,
  testID,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  testID?: string;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  const thumbAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const toggle = useCallback(() => {
    if (disabled) return;
    const next = !value;
    onValueChange(next);
    Animated.timing(thumbAnim, {
      toValue: next ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value, disabled, onValueChange, thumbAnim]);

  // Sync animation when value prop changes externally
  React.useEffect(() => {
    Animated.timing(thumbAnim, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value, thumbAnim]);

  const trackBg = value
    ? disabled ? palette.inkSoft : palette.accent
    : disabled ? palette.canvasShade : palette.border;

  const thumbLeft = thumbAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 18],
  });

  return (
    <Pressable
      testID={testID}
      accessibilityRole='switch'
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      focusable={!disabled}
      {...windowsFocusProps()}
      onPress={toggle}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ focused }: any) => [
        styles.switchRow,
        disabled ? { opacity: 0.5 } : null,
        desktopCursor,
      ]}
    >
      <View
        style={[
          styles.switchTrack,
          { backgroundColor: trackBg },
          hovered && !disabled ? { borderColor: palette.borderStrong } : { borderColor: trackBg },
        ]}
      >
        <Animated.View
          style={[
            styles.switchThumb,
            {
              backgroundColor: value ? palette.canvas : palette.panel,
              left: thumbLeft,
            },
          ]}
        />
      </View>
      {label ? (
        <Text
          style={[
            styles.switchLabel,
            { color: disabled ? palette.inkSoft : palette.ink },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
