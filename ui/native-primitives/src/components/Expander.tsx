import React, { PropsWithChildren, useCallback, useState } from 'react';
import { LayoutAnimation, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconDefinition } from '../icons';
import {
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './shared';
import { styles } from './Expander.styles';

export function Expander({
  title,
  icon,
  defaultExpanded = false,
  trailing,
  children,
  style,
  testID,
  headerTestID,
  contentTestID,
}: PropsWithChildren<{
  title: string;
  icon?: IconDefinition;
  defaultExpanded?: boolean;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  headerTestID?: string;
  contentTestID?: string;
}>) {
  const { palette, spacing } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
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

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  return (
    <View testID={testID} style={[styles.expander, { borderColor: palette.border }, style]}>
      <Pressable
        testID={headerTestID}
        accessibilityRole='button'
        accessibilityState={{ expanded }}
        focusable
        {...windowsFocusProps({ nativeFocusRing: false })}
        onPress={toggle}
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
          styles.expanderHeader,
          {
            backgroundColor: palette.panel,
            paddingVertical: spacing.sm2,
            paddingHorizontal: spacing.lg,
          },
          hovered && !pressed ? { backgroundColor: palette.canvasShade } : null,
          focusVisible ? { borderColor: palette.focusRing, borderWidth: 2 } : null,
          pressed ? { backgroundColor: palette.canvasShade } : null,
          desktopCursor,
        ]}
      >
        <Text style={[styles.expanderChevron, { color: palette.inkMuted }]}>
          {expanded ? '▾' : '▸'}
        </Text>
        {icon ? <Icon icon={icon} size={13} color={palette.inkMuted} /> : null}
        <Text
          style={[styles.expanderTitle, { color: palette.ink }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {trailing ? (
          <View style={styles.expanderTrailing}>{trailing}</View>
        ) : null}
      </Pressable>
      {expanded ? (
        <View
          testID={contentTestID}
          style={[styles.expanderContent, { gap: spacing.xxs }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
