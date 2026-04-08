import React, { useRef } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { appI18n } from '@opapp/framework-i18n';
import { useTheme } from '../theme';
import {
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './shared';
import { styles } from './ChoiceChip.styles';

export function ChoiceChip({
  label,
  active,
  detail,
  meta,
  onPress,
  onPressIn,
  emphasized = false,
  activationBehavior = 'press',
  activeBadgeLabel = appI18n.common.choiceStatus.selected,
  inactiveBadgeLabel = appI18n.common.choiceStatus.available,
  style,
  testID,
}: {
  label: string;
  active: boolean;
  detail?: string;
  meta?: string;
  onPress: () => void;
  onPressIn?: () => void;
  activeBadgeLabel?: string;
  inactiveBadgeLabel?: string;
  emphasized?: boolean;
  activationBehavior?: 'press' | 'press-in';
  style?: StyleProp<ViewStyle>;
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
    handlePressIn,
    handlePressOut,
    handleFocus,
    handleKeyDownCapture,
    handleBlur,
  } = useDiscretePressableState();
  const activationIdRef = useRef(0);
  const suppressPressForActivationRef = useRef<number | null>(null);
  const suppressPressForKeyboardActivationRef = useRef(false);

  const chipIdle = {
    backgroundColor: palette.canvas,
    borderColor: palette.border,
  };
  const chipActive = {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityState={{ selected: active }}
      focusable
      {...windowsFocusProps({ nativeFocusRing: false })}
      hitSlop={6}
      pressRetentionOffset={{ top: 12, right: 12, bottom: 12, left: 12 }}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPressIn={(event: any) => {
        handlePressIn(event);
        onPressIn?.();
        if (activationBehavior === 'press-in') {
          activationIdRef.current += 1;
          suppressPressForActivationRef.current = activationIdRef.current;
          onPress();
        }
      }}
      onPressOut={handlePressOut}
      onKeyDownCapture={handleKeyDownCapture}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={() => {
        if (suppressPressForKeyboardActivationRef.current) {
          suppressPressForKeyboardActivationRef.current = false;
          return;
        }
        if (
          activationBehavior === 'press-in' &&
          suppressPressForActivationRef.current === activationIdRef.current
        ) {
          suppressPressForActivationRef.current = null;
          return;
        }
        onPress();
      }}
      onKeyUp={(event: any) => {
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
      style={({ pressed }: any) => [
        styles.chip,
        active ? chipActive : chipIdle,
        emphasized
          ? active
            ? { backgroundColor: palette.accentSoft, borderColor: palette.accent }
            : { backgroundColor: palette.panelEmphasis, borderColor: palette.borderStrong }
          : null,
        hovered && !pressed
          ? active
            ? { borderColor: palette.accentHover }
            : { backgroundColor: palette.canvasShade, borderColor: palette.borderStrong }
          : null,
        focusVisible ? { borderColor: palette.focusRing, borderWidth: 2 } : null,
        pressed && activationBehavior === 'press'
          ? active
            ? { backgroundColor: palette.accentSoft, borderColor: palette.accentHover }
            : { backgroundColor: palette.canvasShade, borderColor: palette.borderStrong }
          : null,
        desktopCursor,
        style,
      ]}
    >
      {emphasized ? (
        <View
          pointerEvents='none'
          style={[
            styles.chipEmphasisBand,
            active
              ? { backgroundColor: palette.accent }
              : { backgroundColor: palette.borderStrong },
          ]}
        />
      ) : null}
      <View style={styles.chipHeader}>
        <Text
          numberOfLines={2}
          style={[
            styles.chipLabel,
            { color: palette.ink },
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.chipIndicator,
            active
              ? { backgroundColor: palette.accent, borderColor: palette.accent }
              : {
                  backgroundColor: palette.panel,
                  borderColor: palette.borderStrong,
                },
          ]}
        >
          <Text
            style={[
              styles.chipIndicatorLabel,
              active ? { color: palette.canvas } : { color: palette.inkMuted },
            ]}
          >
            {active ? activeBadgeLabel : inactiveBadgeLabel}
          </Text>
        </View>
      </View>
      {detail ? (
        <Text
          style={[
            styles.chipDetail,
            { color: palette.inkMuted },
          ]}
        >
          {detail}
        </Text>
      ) : null}
      {meta ? (
        <Text
          style={[
            styles.chipMeta,
            { color: palette.inkSoft },
          ]}
        >
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
}
