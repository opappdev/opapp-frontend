import React, {forwardRef, useRef} from 'react';
import {
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import {useTheme} from '../theme';
import {
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './shared';
import {styles} from './SelectableRow.styles';

type SupportingContent = string | number | React.ReactNode;

export type SelectableRowProps = {
  title: string;
  subtitle?: SupportingContent;
  meta?: SupportingContent;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onKeyDown?: ((event: any) => void) | undefined;
  keyDownEvents?: readonly {code: string}[] | undefined;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  metaStyle?: StyleProp<TextStyle>;
  titleNumberOfLines?: number;
  subtitleNumberOfLines?: number;
  metaNumberOfLines?: number;
};

function renderSupportingContent(
  content: SupportingContent | undefined,
  defaultStyle: StyleProp<TextStyle>,
  style: StyleProp<TextStyle> | undefined,
  numberOfLines: number,
) {
  if (content === null || content === undefined) {
    return null;
  }

  if (typeof content === 'string' || typeof content === 'number') {
    return (
      <Text numberOfLines={numberOfLines} style={[defaultStyle, style]}>
        {content}
      </Text>
    );
  }

  return content;
}

export const SelectableRow = forwardRef<View, SelectableRowProps>(
  function SelectableRow(
    {
      title,
      subtitle,
      meta,
      leading,
      trailing,
      selected,
      onPress,
      disabled = false,
      testID,
      accessibilityLabel,
      accessibilityHint,
      onKeyDown,
      keyDownEvents,
      style,
      titleStyle,
      subtitleStyle,
      metaStyle,
      titleNumberOfLines = 1,
      subtitleNumberOfLines = 2,
      metaNumberOfLines = 1,
    },
    ref,
  ) {
    const {palette} = useTheme();
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
    const suppressPressForKeyboardRef = useRef(false);

    return (
      <Pressable
        ref={ref as any}
        testID={testID}
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{disabled, selected}}
        disabled={disabled}
        focusable={!disabled}
        {...windowsFocusProps({nativeFocusRing: false})}
        onPress={() => {
          if (disabled) {
            return;
          }
          if (suppressPressForKeyboardRef.current) {
            suppressPressForKeyboardRef.current = false;
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
            suppressPressForKeyboardRef.current = true;
            onPress();
          }
        }}
        onKeyDown={onKeyDown}
        {...(keyDownEvents ? ({keyDownEvents} as any) : {})}
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
        style={({pressed}: any) => [
          styles.selectableRow,
          {
            borderColor: selected ? palette.borderStrong : palette.border,
            backgroundColor: selected ? palette.panelEmphasis : palette.canvas,
          },
          hovered && !pressed && !disabled
            ? {
                borderColor: palette.borderStrong,
                backgroundColor: selected
                  ? palette.panelEmphasis
                  : palette.canvasShade,
              }
            : null,
          focusVisible && !disabled
            ? {borderColor: palette.focusRing, borderWidth: 2}
            : null,
          pressed && !disabled ? styles.selectableRowPressed : null,
          disabled ? {opacity: 0.45} : null,
          !disabled ? desktopCursor : null,
          style,
        ]}>
        <View
          pointerEvents='none'
          style={[
            styles.selectableRowIndicator,
            {backgroundColor: selected ? palette.accent : 'transparent'},
          ]}
        />
        {leading ? (
          <View pointerEvents='none' style={styles.selectableRowLeading}>
            {leading}
          </View>
        ) : null}
        <View pointerEvents='none' style={styles.selectableRowBody}>
          <Text
            numberOfLines={titleNumberOfLines}
            style={[
              styles.selectableRowTitle,
              {color: palette.ink},
              selected ? styles.selectableRowTitleSelected : null,
              titleStyle,
            ]}>
            {title}
          </Text>
          {renderSupportingContent(
            subtitle,
            [styles.selectableRowSubtitle, {color: palette.inkMuted}],
            subtitleStyle,
            subtitleNumberOfLines,
          )}
          {renderSupportingContent(
            meta,
            [styles.selectableRowMeta, {color: palette.inkSoft}],
            metaStyle,
            metaNumberOfLines,
          )}
        </View>
        {trailing ? (
          <View pointerEvents='box-none' style={styles.selectableRowTrailing}>
            {trailing}
          </View>
        ) : null}
      </Pressable>
    );
  },
);
