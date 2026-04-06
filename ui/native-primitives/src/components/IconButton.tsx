import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconDefinition } from '../icons';
import { Tooltip, type TooltipPlacement } from '../ToolTip';
import { desktopCursor, windowsFocusProps } from './shared';
import { styles } from './IconButton.styles';

export type IconButtonSize = 'sm' | 'md' | 'lg';

const iconButtonSizes = {
  sm: { box: 28, icon: 12 },
  md: { box: 34, icon: 14 },
  lg: { box: 40, icon: 16 },
} as const;

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  active = false,
  tone = 'ghost',
  size = 'md',
  tooltipPlacement = 'top',
  style,
  testID,
}: {
  icon: IconDefinition;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: 'ghost' | 'accent' | 'danger';
  size?: IconButtonSize;
  tooltipPlacement?: TooltipPlacement;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  const suppressPressForKeyboardRef = useRef(false);

  const sizeSpec = iconButtonSizes[size];

  const resolveColors = () => {
    if (disabled) {
      return {
        bg: 'transparent',
        border: 'transparent',
        fg: palette.inkSoft,
      };
    }
    if (tone === 'accent') {
      return {
        bg: active ? palette.accentSoft : 'transparent',
        border: active ? palette.accent : 'transparent',
        fg: active ? palette.accent : palette.ink,
      };
    }
    if (tone === 'danger') {
      return {
        bg: 'transparent',
        border: 'transparent',
        fg: palette.errorRed,
      };
    }
    // ghost
    return {
      bg: active ? palette.panelEmphasis : 'transparent',
      border: active ? palette.borderStrong : 'transparent',
      fg: active ? palette.ink : palette.inkMuted,
    };
  };

  const colors = resolveColors();

  const button = (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      focusable={!disabled}
      {...windowsFocusProps()}
      onPress={() => {
        if (disabled) return;
        if (suppressPressForKeyboardRef.current) {
          suppressPressForKeyboardRef.current = false;
          return;
        }
        onPress();
      }}
      onKeyUp={(event: any) => {
        if (disabled) return;
        const key = event?.nativeEvent?.key;
        if (key === 'Enter' || key === ' ' || key === 'Space' || key === 'Spacebar') {
          suppressPressForKeyboardRef.current = true;
          onPress();
        }
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed, focused }: any) => [
        styles.iconButton,
        {
          width: sizeSpec.box,
          height: sizeSpec.box,
          borderRadius: sizeSpec.box / 2,
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        !disabled && hovered && !pressed
          ? { backgroundColor: palette.canvasShade }
          : null,
        !disabled && focused
          ? { borderColor: palette.focusRing, borderWidth: 2 }
          : null,
        pressed && !disabled ? { opacity: 0.85, transform: [{ scale: 0.95 }] } : null,
        disabled ? { opacity: 0.45 } : null,
        desktopCursor,
        style,
      ]}
    >
      <Icon icon={icon} size={sizeSpec.icon} color={colors.fg} />
    </Pressable>
  );

  if (Platform.OS === 'windows') {
    return <Tooltip text={label} placement={tooltipPlacement}>{button}</Tooltip>;
  }

  return button;
}
