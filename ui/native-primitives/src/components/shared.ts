import { useCallback, useRef, useState } from 'react';
import { Platform, ViewStyle } from 'react-native';

export const desktopCursor: ViewStyle =
  Platform.OS === 'windows' ? ({ cursor: 'pointer' } as any) : {};

export function windowsFocusProps(options?: { nativeFocusRing?: boolean }) {
  if (Platform.OS === 'windows' && (options?.nativeFocusRing ?? true)) {
    return { enableFocusRing: true } as any;
  }
  return {};
}

export function useDiscretePressableState() {
  const [hovered, setHovered] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const pointerInteractingRef = useRef(false);

  const handleHoverIn = useCallback(() => {
    setHovered(true);
  }, []);

  const handleHoverOut = useCallback(() => {
    setHovered(false);
  }, []);

  const handlePointerDown = useCallback(() => {
    pointerInteractingRef.current = true;
    setFocusVisible(false);
  }, []);

  const handlePointerUp = useCallback(() => {
    pointerInteractingRef.current = false;
  }, []);

  const handleFocus = useCallback(() => {
    // Pointer clicks on Windows also transfer focus. Keep keyboard focus
    // treatment visible, but do not leave every clicked button with a ring.
    setFocusVisible(!pointerInteractingRef.current);
  }, []);

  const handleBlur = useCallback(() => {
    pointerInteractingRef.current = false;
    setFocusVisible(false);
  }, []);

  return {
    hovered,
    focusVisible,
    handleHoverIn,
    handleHoverOut,
    handlePointerDown,
    handlePointerUp,
    handleFocus,
    handleBlur,
  };
}
