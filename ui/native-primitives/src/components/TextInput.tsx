import React, { useState } from 'react';
import { Pressable, StyleProp, Text, TextInput as RNTextInput, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { appFontFamily } from '../tokens';
import { desktopCursor } from './shared';
import { styles } from './TextInput.styles';

export function TextInput({
  value,
  onChangeText,
  placeholder,
  onClear,
  invalid = false,
  multiline = false,
  numberOfLines,
  textAlignVertical,
  style,
  inputStyle,
  testID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  invalid?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  textAlignVertical?: 'auto' | 'top' | 'center' | 'bottom';
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const { palette, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.textInputContainer,
        {
          borderColor: invalid
            ? palette.errorRed
            : focused
              ? palette.focusRing
              : palette.border,
          backgroundColor: palette.panel,
        },
        style,
      ]}
    >
      <RNTextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.inkSoft}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={textAlignVertical}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.textInputField,
          { color: palette.ink, fontFamily: appFontFamily ?? undefined },
          inputStyle,
        ]}
      />
      {value.length > 0 && onClear ? (
        <Pressable
          accessibilityRole='button'
          onPress={onClear}
          style={({ pressed }: any) => [
            styles.textInputClear,
            pressed ? { opacity: 0.6 } : null,
            desktopCursor,
          ]}
        >
          <Text
            style={[styles.textInputClearLabel, { color: palette.inkMuted }]}
          >
            ✕
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
