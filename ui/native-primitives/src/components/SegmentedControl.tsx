import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconDefinition } from '../icons';
import {
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './shared';
import { styles } from './SegmentedControl.styles';

export type SegmentedControlItem<T extends string = string> = {
  key: T;
  label: string;
  icon?: IconDefinition;
};
export function SegmentedControl<T extends string = string>({
  items,
  selectedKey,
  onSelect,
  size = 'md',
  style,
  testID,
}: {
  items: readonly SegmentedControlItem<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.segmentedControl,
        { borderColor: palette.border, backgroundColor: palette.canvasShade },
        style,
      ]}
    >
      {items.map((item) => {
        const isSelected = item.key === selectedKey;
        return (
          <SegmentedControlSegment
            key={item.key}
            item={item}
            isSelected={isSelected}
            onPress={() => onSelect(item.key)}
            size={size}
          />
        );
      })}
    </View>
  );
}

function SegmentedControlSegment<T extends string>({
  item,
  isSelected,
  onPress,
  size,
}: {
  item: SegmentedControlItem<T>;
  isSelected: boolean;
  onPress: () => void;
  size: 'sm' | 'md';
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

  return (
    <Pressable
      accessibilityRole='tab'
      accessibilityState={{ selected: isSelected }}
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
      style={({ pressed }: any) => [
        styles.segmentedControlSegment,
        size === 'sm'
          ? styles.segmentedControlSegmentSm
          : styles.segmentedControlSegmentMd,
        isSelected
          ? {
              backgroundColor: palette.panel,
              borderColor: palette.border,
            }
          : { backgroundColor: 'transparent', borderColor: 'transparent' },
        !isSelected && hovered && !pressed
          ? { backgroundColor: palette.canvasShade }
          : null,
        focusVisible ? { borderColor: palette.focusRing } : null,
        pressed && !isSelected ? { opacity: 0.8 } : null,
        desktopCursor,
      ]}
    >
      {item.icon ? (
        <Icon
          icon={item.icon}
          size={size === 'sm' ? 11 : 12}
          color={isSelected ? palette.ink : palette.inkMuted}
        />
      ) : null}
      <Text
        style={[
          styles.segmentedControlLabel,
          size === 'sm'
            ? styles.segmentedControlLabelSm
            : styles.segmentedControlLabelMd,
          { color: isSelected ? palette.ink : palette.inkMuted },
          isSelected ? { fontWeight: '700' } : null,
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}
