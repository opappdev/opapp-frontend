import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ResolvedSurfaceSession } from '@opapp/framework-surfaces';
import { appI18n } from '@opapp/framework-i18n';
import { useTheme } from '../theme';
import {
  desktopCursor,
  useDiscretePressableState,
  windowsFocusProps,
} from './shared';
import { styles } from './SurfaceSessionChrome.styles';

export function SurfaceSessionChrome({
  label = appI18n.app.surfaceSessionLabel,
  session,
  onSelectTab,
  onCloseTab,
  testID,
}: {
  label?: string;
  session: ResolvedSurfaceSession;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  testID?: string;
}) {
  const { palette } = useTheme();

  if (session.tabs.length <= 1) {
    return null;
  }

  return (
    <View
      testID={testID}
      style={[
        styles.surfaceHostChrome,
        {
          borderBottomColor: palette.border,
          backgroundColor: palette.canvasShade,
        },
      ]}
    >
      <View style={styles.surfaceHostChromeInner}>
        <Text style={[styles.surfaceHostLabel, { color: palette.inkSoft }]}>
          {label}
        </Text>
        <View style={styles.surfaceTabRow}>
          {session.tabs.map((tab) => (
            <View
              key={tab.tabId}
              style={[
                styles.surfaceTab,
                { borderColor: palette.border, backgroundColor: palette.panel },
                tab.isActive
                  ? {
                      backgroundColor: palette.panelEmphasis,
                      borderColor: palette.borderStrong,
                    }
                  : null,
              ]}
            >
              <SurfaceTabAction
                title={tab.title}
                meta={tab.policy}
                active={tab.isActive}
                onPress={() => onSelectTab(tab.tabId)}
              />
              <SurfaceTabCloseButton
                label={`${appI18n.app.closeTabLabelPrefix}${tab.title}`}
                onPress={() => onCloseTab(tab.tabId)}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ==========================================================================
//  NEW COMPONENTS
// ==========================================================================

function SurfaceTabAction({
  title,
  meta,
  active,
  onPress,
}: {
  title: string;
  meta: string;
  active: boolean;
  onPress: () => void;
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
        styles.surfaceTabBody,
        !active && hovered ? { backgroundColor: palette.canvasShade } : null,
        focusVisible ? { backgroundColor: palette.panelEmphasis } : null,
        pressed ? styles.surfaceTabPressed : null,
        desktopCursor,
      ]}
    >
      <Text style={[styles.surfaceTabTitle, { color: palette.ink }]}>
        {title}
      </Text>
      <Text
        style={[
          styles.surfaceTabMeta,
          { color: palette.inkSoft },
          active ? { color: palette.accent } : null,
        ]}
      >
        {meta}
      </Text>
    </Pressable>
  );
}

function SurfaceTabCloseButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
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
      accessibilityRole='button'
      accessibilityLabel={label}
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
        styles.surfaceTabClose,
        {
          borderLeftColor: palette.border,
          backgroundColor: palette.canvasShade,
        },
        hovered && !pressed ? { backgroundColor: palette.panel } : null,
        focusVisible ? { backgroundColor: palette.panelEmphasis } : null,
        pressed ? { backgroundColor: palette.panelEmphasis } : null,
        desktopCursor,
      ]}
    >
      <Text
        style={[
          styles.surfaceTabCloseLabel,
          { color: palette.inkSoft },
        ]}
      >
        X
      </Text>
    </Pressable>
  );
}
