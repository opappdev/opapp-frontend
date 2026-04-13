import React, { PropsWithChildren, type RefObject } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme';
import { ActionButton } from './ActionButton';
import { styles } from './AppFrame.styles';

export function AppFrame({
  eyebrow,
  title,
  description,
  showHero = true,
  topInset = 0,
  headerActionsHostRef,
  onHeaderActionsLayout,
  headerActions = [],
  children,
  testID,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  showHero?: boolean;
  topInset?: number;
  headerActionsHostRef?: RefObject<View | null>;
  onHeaderActionsLayout?: () => void;
  headerActions?: ReadonlyArray<{
    label: string;
    onPress: () => void;
    disabled?: boolean;
    tone?: 'accent' | 'ghost';
    testID?: string;
  }>;
  testID?: string;
}>) {
  const { palette, spacing } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.frame,
        {
          backgroundColor: palette.canvas,
          paddingTop: topInset > 0 ? topInset + 16 : undefined,
        },
      ]}
    >
      <View style={[styles.frameInner, { gap: spacing.xl }]}>
        {headerActions.length > 0 ? (
          <View
            ref={headerActionsHostRef}
            onLayout={() => {
              onHeaderActionsLayout?.();
            }}
            style={[
              styles.headerActionsShell,
              {
                backgroundColor: palette.panel,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.headerActionsDots}>
              <View
                style={[
                  styles.headerActionsDot,
                  {
                    backgroundColor: palette.accentSoft,
                    borderColor: palette.accent,
                  },
                ]}
              />
              <View
                style={[
                  styles.headerActionsDot,
                  {
                    backgroundColor: palette.supportSoft,
                    borderColor: palette.support,
                  },
                ]}
              />
              <View
                style={[
                  styles.headerActionsDot,
                  {
                    backgroundColor: palette.canvasShade,
                    borderColor: palette.borderStrong,
                  },
                ]}
              />
            </View>
            <View style={[styles.headerActionsRow, { gap: spacing.sm }]}>
              {headerActions.map((action, index) => (
                <ActionButton
                  key={action.testID ?? `${action.label}-${index}`}
                  label={action.label}
                  onPress={action.onPress}
                  disabled={action.disabled}
                  tone={action.tone ?? 'ghost'}
                  testID={action.testID}
                />
              ))}
            </View>
          </View>
        ) : null}
        {showHero ? (
          <View
            style={[
              styles.heroShell,
              { backgroundColor: palette.panel, borderColor: palette.border },
            ]}
          >
            <View style={styles.heroTopline}>
              <Text style={[styles.eyebrow, { color: palette.accent }]}>
                {eyebrow}
              </Text>
              <View
                style={[styles.heroRule, { backgroundColor: palette.border }]}
              />
            </View>
            <Text style={[styles.heroTitle, { color: palette.ink }]}>
              {title}
            </Text>
            <Text style={[styles.heroDescription, { color: palette.inkMuted }]}>
              {description}
            </Text>
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}
