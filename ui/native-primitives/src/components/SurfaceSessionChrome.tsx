import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ResolvedSurfaceSession } from '@opapp/framework-surfaces';
import { appI18n } from '@opapp/framework-i18n';
import { useTheme } from '../theme';
import { desktopCursor, windowsFocusProps } from './shared';
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
              <Pressable
                focusable
                {...windowsFocusProps()}
                onPress={() => onSelectTab(tab.tabId)}
                style={({ pressed }: any) => [
                  styles.surfaceTabBody,
                  pressed ? styles.surfaceTabPressed : null,
                  desktopCursor,
                ]}
              >
                <Text style={[styles.surfaceTabTitle, { color: palette.ink }]}>
                  {tab.title}
                </Text>
                <Text
                  style={[
                    styles.surfaceTabMeta,
                    { color: palette.inkSoft },
                    tab.isActive ? { color: palette.accent } : null,
                  ]}
                >
                  {tab.policy}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel={`${appI18n.app.closeTabLabelPrefix}${tab.title}`}
                focusable
                {...windowsFocusProps()}
                onPress={() => onCloseTab(tab.tabId)}
                style={({ pressed }: any) => [
                  styles.surfaceTabClose,
                  {
                    borderLeftColor: palette.border,
                    backgroundColor: palette.canvasShade,
                  },
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
