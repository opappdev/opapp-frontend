import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import {
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './shared';
import { styles } from './DataRow.styles';

export function DataRow({
  title,
  subtitle,
  badges,
  trailing,
  onPress,
  style,
  testID,
}: {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette, spacing } = useTheme();
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

  const content = (
    <View
      testID={testID}
      style={[
        styles.dataRow,
        { borderBottomColor: palette.border, paddingVertical: spacing.sm2 },
        hovered ? { backgroundColor: palette.canvasShade } : null,
        focusVisible ? { borderBottomColor: palette.focusRing } : null,
        style,
      ]}
    >
      <View style={[styles.dataRowMain, { gap: spacing.xs }]}>
        <Text
          style={[styles.dataRowTitle, { color: palette.ink }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.dataRowSubtitle, { color: palette.inkMuted }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        {badges ? <View style={styles.dataRowBadges}>{badges}</View> : null}
      </View>
      {trailing ? <View style={styles.dataRowTrailing}>{trailing}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole='button'
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
        style={desktopCursor}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
