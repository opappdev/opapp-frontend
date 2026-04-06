import React, { useRef } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { styles } from './Spinner.styles';

export function Spinner({
  size = 'md',
  tone = 'accent',
  color: colorOverride,
  style,
}: {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'accent' | 'neutral';
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotateAnim]);

  const spinnerSize = size === 'sm' ? 16 : size === 'lg' ? 32 : 22;
  const borderW = size === 'sm' ? 2 : size === 'lg' ? 3 : 2.5;
  const color = colorOverride ?? (tone === 'accent' ? palette.accent : palette.inkMuted);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        {
          width: spinnerSize,
          height: spinnerSize,
          borderRadius: spinnerSize / 2,
          borderWidth: borderW,
          borderColor: palette.border,
          borderTopColor: color,
          transform: [{ rotate }],
        },
        style,
      ]}
    />
  );
}
