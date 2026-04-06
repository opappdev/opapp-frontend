import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';
import {
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './shared';
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
  const {
    hovered,
    focusVisible,
    handleHoverIn,
    handleHoverOut,
    handlePointerDown,
    handlePointerUp,
    handleFocus,
    handleBlur,
  } = useDiscretePressableState();
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
      {...windowsFocusProps({ nativeFocusRing: false })}
      onPress={toggle}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={() => [
        styles.switchRow,
        disabled ? { opacity: 0.5 } : null,
        desktopCursor,
      ]}
    >
      <View
        style={[
          styles.switchTrack,
          { backgroundColor: trackBg },
          focusVisible
            ? { borderColor: palette.focusRing }
            : hovered && !disabled
              ? { borderColor: palette.borderStrong }
              : { borderColor: trackBg },
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
