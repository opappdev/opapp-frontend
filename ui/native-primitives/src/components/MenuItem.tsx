import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconDefinition } from '../icons';
import { desktopCursor, windowsFocusProps } from './shared';
import { styles } from './MenuItem.styles';

export function MenuItem({
  label,
  icon,
  detail,
  onPress,
  destructive = false,
  disabled = false,
  testID,
}: {
  label: string;
  icon?: IconDefinition;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const { palette } = useTheme();
  const [hovered, setHovered] = useState(false);
  const fg = destructive
    ? palette.errorRed
    : disabled
      ? palette.inkSoft
      : palette.ink;

  return (
    <Pressable
      testID={testID}
      accessibilityRole='menuitem'
      disabled={disabled}
      focusable={!disabled}
      {...windowsFocusProps()}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed, focused }: any) => [
        styles.menuItem,
        hovered && !pressed
          ? { backgroundColor: palette.canvasShade }
          : null,
        focused && { backgroundColor: palette.canvasShade },
        pressed ? { backgroundColor: palette.canvasShade, opacity: 0.8 } : null,
        disabled ? { opacity: 0.45 } : null,
        desktopCursor,
      ]}
    >
      {icon ? <Icon icon={icon} size={13} color={fg} /> : null}
      <Text
        style={[styles.menuItemLabel, { color: fg }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {detail ? (
        <Text
          style={[styles.menuItemDetail, { color: palette.inkSoft }]}
          numberOfLines={1}
        >
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}
