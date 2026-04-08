import { useCallback, useRef, useState } from 'react';
import { Platform, ViewStyle } from 'react-native';

export const desktopCursor: ViewStyle =
  Platform.OS === 'windows' ? ({ cursor: 'pointer' } as any) : {};

const keyboardFocusVisibleWindowMs = 1_000;
const keyboardFocusVisibleKeys = new Set([
  'Tab',
  'Enter',
  ' ',
  'Space',
  'Spacebar',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

let lastKeyboardFocusIntentAt = 0;

function markKeyboardModality(event?: any) {
  const key = event?.nativeEvent?.key;
  if (!key || !keyboardFocusVisibleKeys.has(key)) {
    return;
  }
  lastKeyboardFocusIntentAt = Date.now();
}

function clearKeyboardModality() {
  lastKeyboardFocusIntentAt = 0;
}

function hasRecentKeyboardFocusIntent() {
  return Date.now() - lastKeyboardFocusIntentAt <= keyboardFocusVisibleWindowMs;
}

export function windowsFocusProps(options?: { nativeFocusRing?: boolean }) {
  if (Platform.OS === 'windows') {
    return { enableFocusRing: options?.nativeFocusRing ?? true } as any;
  }
  return {};
}

export function useDiscretePressableState() {
  const [hovered, setHovered] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const hoveredRef = useRef(false);
  const suppressFocusVisibleRef = useRef(false);

  const handleHoverIn = useCallback(() => {
    clearKeyboardModality();
    hoveredRef.current = true;
    setHovered(true);
  }, []);

  const handleHoverOut = useCallback(() => {
    hoveredRef.current = false;
    setHovered(false);
  }, []);

  const handlePointerDown = useCallback(() => {
    clearKeyboardModality();
    suppressFocusVisibleRef.current = true;
    setFocusVisible(false);
  }, []);

  const handlePointerUp = useCallback(() => {
    // Keep pointer-initiated focus from reappearing as a keyboard-style ring
    // after release. The suppression resets on blur.
  }, []);

  const handlePressIn = useCallback((event?: any) => {
    if (event?.nativeEvent?.pointerType) {
      handlePointerDown();
    }
  }, [handlePointerDown]);

  const handlePressOut = useCallback((event?: any) => {
    if (event?.nativeEvent?.pointerType) {
      handlePointerUp();
    }
  }, [handlePointerUp]);

  const handleFocus = useCallback(() => {
    // Keep keyboard focus treatment visible only when focus closely follows a
    // navigation/activation keystroke, which better matches :focus-visible.
    setFocusVisible(
      hasRecentKeyboardFocusIntent() &&
        !suppressFocusVisibleRef.current &&
        !hoveredRef.current,
    );
  }, []);

  const handleKeyDownCapture = useCallback((event: any) => {
    markKeyboardModality(event);
  }, []);

  const handleBlur = useCallback(() => {
    hoveredRef.current = false;
    suppressFocusVisibleRef.current = false;
    setFocusVisible(false);
  }, []);

  return {
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
  };
}
