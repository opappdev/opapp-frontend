import React, { useRef } from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconDefinition } from '../icons';
import {
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './shared';
import { styles } from './ActionButton.styles';

export function ActionButton({
  label,
  onPress,
  disabled = false,
  tone = 'accent',
  icon,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'ghost';
  icon?: IconDefinition;
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
  const suppressPressForKeyboardActivationRef = useRef(false);
  const labelColor =
    disabled ? palette.inkSoft : tone === 'accent' ? palette.canvas : palette.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      disabled={disabled}
      focusable={!disabled}
      {...windowsFocusProps({ nativeFocusRing: false })}
      onPress={() => {
        if (disabled) {
          return;
        }
        if (suppressPressForKeyboardActivationRef.current) {
          suppressPressForKeyboardActivationRef.current = false;
          return;
        }
        onPress();
      }}
      onKeyUp={(event: any) => {
        if (disabled) {
          return;
        }
        const key = event?.nativeEvent?.key;
        if (
          key === 'Enter' ||
          key === ' ' ||
          key === 'Space' ||
          key === 'Spacebar'
        ) {
          suppressPressForKeyboardActivationRef.current = true;
          onPress();
        }
      }}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={({ pressed }: any) => [
        styles.actionButton,
        tone === 'accent'
          ? { backgroundColor: palette.accent, borderColor: palette.accent }
          : {
              backgroundColor: palette.canvas,
              borderColor: palette.borderStrong,
            },
        disabled
          ? {
              backgroundColor: palette.canvasShade,
              borderColor: palette.border,
            }
          : null,
        !disabled && hovered && !pressed
          ? tone === 'accent'
            ? { backgroundColor: palette.accentHover }
            : { backgroundColor: palette.canvasShade }
          : null,
        !disabled && focusVisible
          ? { borderColor: palette.focusRing, borderWidth: 2 }
          : null,
        pressed && !disabled ? styles.actionButtonPressed : null,
        desktopCursor,
      ]}
    >
      {icon ? <Icon icon={icon} size={13} color={labelColor} /> : null}
      <Text
        style={[
          styles.actionButtonLabel,
          tone === 'accent' ? { color: palette.canvas } : { color: palette.ink },
          disabled ? { color: palette.inkSoft } : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
