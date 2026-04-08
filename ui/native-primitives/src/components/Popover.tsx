import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './Popover.styles';

export function Popover({
  visible,
  onDismiss,
  anchor,
  placement = 'bottom',
  children,
  maxWidth = 280,
  style,
  testID,
}: {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode;
  placement?: 'top' | 'bottom';
  children: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible, mounted, fadeAnim]);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current !== null) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  const cancelScheduledDismiss = () => {
    if (dismissTimeoutRef.current !== null) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  };

  const scheduleDismiss = () => {
    cancelScheduledDismiss();
    dismissTimeoutRef.current = setTimeout(() => {
      dismissTimeoutRef.current = null;
      onDismiss();
    }, 80);
  };

  const positionStyles: ViewStyle =
    placement === 'top'
      ? { bottom: '100%', marginBottom: 4 }
      : { top: '100%', marginTop: 4 };

  return (
    <View
      style={styles.popoverAnchorWrapper}
      onFocus={cancelScheduledDismiss}
      onBlur={scheduleDismiss}
    >
      {anchor}
      {mounted ? (
        <Animated.View
          testID={testID}
          onFocus={cancelScheduledDismiss}
          onBlur={scheduleDismiss}
          style={[
            styles.popoverPanel,
            positionStyles,
            {
              backgroundColor: palette.panel,
              borderColor: palette.border,
              opacity: fadeAnim,
              maxWidth,
            },
            style,
          ]}
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}
