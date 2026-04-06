
// ---------------------------------------------------------------------------
//  Tooltip — desktop-only hover hint, no-op on non-desktop
// ---------------------------------------------------------------------------

import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { useTheme } from "./theme";
import { Animated, Platform, StyleSheet, Text, View, ViewStyle } from "react-native";
import { appFontFamily } from "./tokens";

export type TooltipPlacement = 'top' | 'bottom';

/**
 * Estimate the bubble width needed for the given text.
 *
 * On React Native Windows (XAML), absolutely-positioned children are
 * constrained by their parent's measured width. When the trigger element
 * is a small icon button (e.g. 28 × 28), the bubble would end up only
 * 28 px wide and the text would stack vertically — one character per line.
 *
 * To work around this, we compute a generous `minWidth` from the text
 * content so the bubble always has enough room. CJK characters are
 * estimated at ~14 px each; Latin characters at ~8 px.
 */
function estimateTooltipWidth(text: string, maxW: number): number {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += text.charCodeAt(i) > 0x2e7f ? 12.5 : 8;
  }
  // Add horizontal padding (10 + 10) + border (1 + 1) = 22
  return Math.min(maxW, Math.max(48, w + 22));
}

export function Tooltip({
  text,
  children,
  placement = 'top',
  maxWidth = 240,
  delayMs = 320,
}: PropsWithChildren<{
  text: string;
  placement?: TooltipPlacement;
  maxWidth?: number;
  delayMs?: number;
}>) {
  const { palette } = useTheme();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Cleanup timer on unmount to prevent state updates after unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (Platform.OS !== 'windows') {
    return <>{children}</>;
  }

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setVisible(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }, delayMs);
  };

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  };

  const positionStyles: ViewStyle =
    placement === 'bottom'
      ? { top: '100%', marginTop: 6 }
      : { bottom: '100%', marginBottom: 6 };

  // Explicit width so the bubble is never squeezed by a small trigger.
  const bubbleWidth = estimateTooltipWidth(text, maxWidth);


  return (
    <View
      onPointerEnter={show}
      onPointerLeave={hide}
      style={styles.tooltipHost}
    >
      {children}
      {visible ? (
        <Animated.View
          pointerEvents='none'
          style={[
            styles.tooltipBubble,
            positionStyles,
            {
              backgroundColor: palette.panel,
              borderColor: palette.borderStrong,
              opacity: fadeAnim,
              width: bubbleWidth,
            },
          ]}
        >
          <Text
            style={[styles.tooltipText, { color: palette.ink }]}
            numberOfLines={1}
          >
            {text}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Tooltip
  tooltipHost: {
    position: 'relative',
  },
  tooltipBubble: {
    position: 'absolute',
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 100,
  },
  tooltipText: {
    fontSize: 12,
    letterSpacing: 0.5,
    lineHeight: 16,
    fontFamily: appFontFamily,
  },
});
