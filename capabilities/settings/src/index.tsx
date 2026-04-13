import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  appearancePresets,
} from '@opapp/contracts-windowing';
import type {
  AppearancePreset,
  SettingsSurfacePresentation,
  WindowPolicyId,
  WindowPreferences,
  WindowSizeMode,
} from '@opapp/contracts-windowing';
import {
  closeWindow,
  defaultWindowPreferences,
  focusWindow,
  useCurrentWindowId,
  useCurrentWindowPolicy,
  useOpenSurface,
  useTitleBarPassthroughTargets,
  useTitleBarMetrics,
  useWindowPreferences,
} from '@opapp/framework-windowing';
import {
  ActionButton,
  AppFrame,
  ChoiceChip,
  MutedText,
  SectionCard,
  Stack,
  StatusBadge,
  blossomLightPalette,
  desktopCursor,
  lightPalette,
  useTheme,
  useDensityPreference,
  windowsFocusProps,
  appRadius,
  appSpacing,
  appTypography,
} from '@opapp/ui-native-primitives';
import type { AppDensity, AppPalette } from '@opapp/ui-native-primitives';
import {appI18n} from '@opapp/framework-i18n';

const windowModeOptions: {
  mode: WindowSizeMode;
  label: string;
  detail: string;
}[] = [
  {
    mode: 'balanced',
    label: appI18n.settings.windowModes.balanced.label,
    detail: appI18n.settings.windowModes.balanced.detail,
  },
  {
    mode: 'compact',
    label: appI18n.settings.windowModes.compact.label,
    detail: appI18n.settings.windowModes.compact.detail,
  },
  {
    mode: 'wide',
    label: appI18n.settings.windowModes.wide.label,
    detail: appI18n.settings.windowModes.wide.detail,
  },
];

const settingsPresentationOptions: {
  mode: SettingsSurfacePresentation;
  label: string;
  detail: string;
}[] = [
  {
    mode: 'current-window',
    label: appI18n.settings.presentationOptions['current-window'].label,
    detail: appI18n.settings.presentationOptions['current-window'].detail,
  },
  {
    mode: 'new-window',
    label: appI18n.settings.presentationOptions['new-window'].label,
    detail: appI18n.settings.presentationOptions['new-window'].detail,
  },
];

const settingsTypographyExceptions = {
  footerStatus: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
} as const;

const densityOptions: {
  mode: AppDensity;
  label: string;
  detail: string;
}[] = [
  {
    mode: 'standard',
    label: appI18n.settings.densityModes.standard.label,
    detail: appI18n.settings.densityModes.standard.detail,
  },
  {
    mode: 'compact',
    label: appI18n.settings.densityModes.compact.label,
    detail: appI18n.settings.densityModes.compact.detail,
  },
];

const appearanceOptions: {
  mode: AppearancePreset;
  label: string;
  detail: string;
}[] = appearancePresets.map(mode => ({
  mode,
  label: appI18n.settings.appearancePresets[mode].label,
  detail: appI18n.settings.appearancePresets[mode].detail,
}));

const appearancePreviewPalettes: Record<
  AppearancePreset,
  Pick<
    AppPalette,
    | 'canvas'
    | 'panel'
    | 'panelEmphasis'
    | 'border'
    | 'ink'
    | 'inkMuted'
    | 'accent'
    | 'accentSoft'
    | 'support'
    | 'supportSoft'
  >
> = {
  classic: lightPalette,
  blossom: blossomLightPalette,
};

type SettingsScreenProps = Record<string, unknown> & {
};

function AppearancePresetCard({
  mode,
  label,
  detail,
  active,
  palette,
  styles,
  onPress,
}: {
  mode: AppearancePreset;
  label: string;
  detail: string;
  active: boolean;
  palette: AppPalette;
  styles: ReturnType<typeof createScreenStyles>;
  onPress: () => void;
}) {
  const previewPalette = appearancePreviewPalettes[mode];

  return (
    <Pressable
      testID={`settings.appearance.${mode}`}
      accessibilityRole='button'
      accessibilityState={{selected: active}}
      focusable
      {...windowsFocusProps({nativeFocusRing: false})}
      hitSlop={6}
      onPress={onPress}
      style={({pressed, hovered, focused}: any) => [
        styles.appearanceCard,
        {
          borderColor: active ? palette.accent : palette.border,
          backgroundColor: active ? palette.panel : palette.panelEmphasis,
        },
        hovered && !pressed
          ? {
              borderColor: active ? palette.accentHover : palette.border,
              transform: [{translateY: -1}],
            }
          : null,
        pressed
          ? {
              borderColor: active ? palette.accentHover : palette.border,
              transform: [{translateY: 0}],
              opacity: 0.96,
            }
          : null,
        focused ? {borderColor: palette.focusRing, borderWidth: 2} : null,
        desktopCursor,
      ]}>
      <View style={styles.appearanceCardHeader}>
        <View style={styles.appearanceCardCopy}>
          <Text style={styles.appearanceCardLabel}>{label}</Text>
          <Text style={styles.appearanceCardDetail}>{detail}</Text>
        </View>
        <View
          style={[
            styles.appearanceCardBadge,
            active
              ? {
                  backgroundColor: palette.accentSoft,
                  borderColor: palette.accent,
                }
              : {
                  backgroundColor: palette.panel,
                  borderColor: palette.border,
                },
          ]}>
          <Text
            style={[
              styles.appearanceCardBadgeLabel,
              {color: active ? palette.accentHover : palette.inkSoft},
            ]}>
            {active
              ? appI18n.common.choiceStatus.current
              : appI18n.common.choiceStatus.switchTo}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.appearancePreview,
          {backgroundColor: previewPalette.canvas},
        ]}>
        <View
          style={[
            styles.appearancePreviewRibbon,
            {backgroundColor: previewPalette.accentSoft},
          ]}
        />
        <View
          style={[
            styles.appearancePreviewWindow,
            {
              backgroundColor: previewPalette.panel,
              borderColor: previewPalette.border,
            },
          ]}>
          <View style={styles.appearancePreviewChrome}>
            <View style={styles.appearancePreviewDots}>
              <View
                style={[
                  styles.appearancePreviewDot,
                  {backgroundColor: previewPalette.accent},
                ]}
              />
              <View
                style={[
                  styles.appearancePreviewDot,
                  {backgroundColor: previewPalette.support},
                ]}
              />
              <View
                style={[
                  styles.appearancePreviewDot,
                  {backgroundColor: previewPalette.panelEmphasis},
                ]}
              />
            </View>
            <View
              style={[
                styles.appearancePreviewCapsule,
                {
                  backgroundColor: previewPalette.panelEmphasis,
                  borderColor: previewPalette.border,
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.appearancePreviewHero,
              {
                backgroundColor: previewPalette.panelEmphasis,
                borderColor: previewPalette.border,
              },
            ]}>
            <View
              style={[
                styles.appearancePreviewTitleLine,
                {
                  backgroundColor: previewPalette.ink,
                  opacity: 0.9,
                },
              ]}
            />
            <View
              style={[
                styles.appearancePreviewBodyLine,
                {
                  backgroundColor: previewPalette.inkMuted,
                  opacity: 0.24,
                },
              ]}
            />
          </View>

          <View style={styles.appearancePreviewBody}>
            <View
              style={[
                styles.appearancePreviewPanePrimary,
                {
                  backgroundColor: previewPalette.panel,
                  borderColor: previewPalette.border,
                },
              ]}>
              <View
                style={[
                  styles.appearancePreviewAccentBar,
                  {backgroundColor: previewPalette.accent},
                ]}
              />
              <View style={styles.appearancePreviewPaneCopy}>
                <View
                  style={[
                    styles.appearancePreviewPaneTitle,
                    {backgroundColor: previewPalette.ink, opacity: 0.88},
                  ]}
                />
                <View
                  style={[
                    styles.appearancePreviewPaneBody,
                    {backgroundColor: previewPalette.inkMuted, opacity: 0.2},
                  ]}
                />
              </View>
            </View>
            <View
              style={[
                styles.appearancePreviewPaneSecondary,
                {
                  backgroundColor: previewPalette.panelEmphasis,
                  borderColor: previewPalette.border,
                },
              ]}>
              <View style={styles.appearancePreviewSignalRow}>
                <View
                  style={[
                    styles.appearancePreviewSignal,
                    {
                      backgroundColor: previewPalette.supportSoft,
                      borderColor: previewPalette.support,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.appearancePreviewSignal,
                    {
                      backgroundColor: previewPalette.accentSoft,
                      borderColor: previewPalette.accent,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.appearancePreviewAction,
                  {backgroundColor: previewPalette.accent},
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function arePreferencesEqual(left: WindowPreferences, right: WindowPreferences) {
  return (
    left.mainWindowMode === right.mainWindowMode &&
    left.settingsWindowMode === right.settingsWindowMode &&
    left.settingsPresentation === right.settingsPresentation &&
    left.appearancePreset === right.appearancePreset
  );
}

function formatSettingsPresentation(mode: SettingsSurfacePresentation) {
  return appI18n.common.settingsPresentation[mode];
}

function formatWindowTargetLabel(policy: WindowPolicyId | null) {
  if (policy === 'settings') {
    return appI18n.common.windowTarget.settings;
  }

  if (policy === 'main') {
    return appI18n.common.windowTarget.main;
  }

  if (policy === 'tool') {
    return appI18n.common.windowTarget.tool;
  }

  return appI18n.common.windowTarget.current;
}

function formatWindowMode(mode: WindowSizeMode) {
  return appI18n.settings.windowModes[mode].label;
}

function formatAppearancePreset(mode: AppearancePreset) {
  return appI18n.settings.appearancePresets[mode].label;
}

function buildImmediateApplyHint(policy: WindowPolicyId | null) {
  if (policy === 'settings') {
    return appI18n.settings.feedback.immediateApply.settings;
  }

  if (policy === 'main') {
    return appI18n.settings.feedback.immediateApply.main;
  }

  return appI18n.settings.feedback.immediateApply.generic;
}

function buildSaveNotice(
  policy: WindowPolicyId | null,
  savedPreferences: WindowPreferences,
) {
  const targetLabel = formatWindowTargetLabel(policy);
  const immediateMode =
    policy === 'settings'
      ? savedPreferences.settingsWindowMode
      : savedPreferences.mainWindowMode;

  if (policy === 'settings') {
    return `${appI18n.settings.feedback.saveNotice.settingsPrefix}${formatWindowMode(immediateMode)}${appI18n.settings.feedback.saveNotice.settingsSuffix}`;
  }

  if (policy === 'main') {
    return `${appI18n.settings.feedback.saveNotice.mainPrefix}${formatWindowMode(immediateMode)}${appI18n.settings.feedback.saveNotice.mainSuffix}`;
  }

  return `${appI18n.settings.feedback.saveNotice.genericPrefix}${targetLabel}${appI18n.settings.feedback.saveNotice.genericSuffix}`;
}

export function SettingsScreen(props: SettingsScreenProps = {}) {
  const { appearancePreset, palette } = useTheme();
  const { density, setDensity } = useDensityPreference();
  const styles = useMemo(() => createScreenStyles(palette), [palette]);
  const titleBarMetrics = useTitleBarMetrics(appearancePreset);
  const currentWindowId = useCurrentWindowId();
  const headerActionsHostRef = useRef<View>(null);
  const [headerActionsLayoutVersion, setHeaderActionsLayoutVersion] = useState(0);
  const [openingDetachedWindow, setOpeningDetachedWindow] = useState(false);
  const [returningInline, setReturningInline] = useState(false);
  const [openingMainTab, setOpeningMainTab] = useState(false);
  const [openingViewShotLab, setOpeningViewShotLab] = useState<
    SettingsSurfacePresentation | null
  >(null);
  const [openingWindowCaptureLab, setOpeningWindowCaptureLab] = useState<
    SettingsSurfacePresentation | null
  >(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<WindowPreferences>(defaultWindowPreferences);
  const [focusingMainWindow, setFocusingMainWindow] = useState(false);
  const [closingCurrentWindow, setClosingCurrentWindow] = useState(false);
  const currentWindowPolicy = useCurrentWindowPolicy();
  const openSurface = useOpenSurface();
  const {
    preferences,
    loading,
    error,
    save,
  } = useWindowPreferences();

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const isDirty = useMemo(
    () => !arePreferencesEqual(draft, preferences),
    [draft, preferences],
  );
  const footerSignal = useMemo(() => {
    if (loading) {
      return {
        label: appI18n.settings.status.footerSignalLoading,
        tone: 'neutral' as const,
      };
    }

    if (isDirty) {
      return {
        label: appI18n.settings.status.footerSignalDirty,
        tone: 'warning' as const,
      };
    }

    if (saveNotice) {
      return {
        label: appI18n.settings.status.footerSignalSaved,
        tone: 'support' as const,
      };
    }

    return {
      label: appI18n.settings.status.footerSignalClean,
      tone: 'neutral' as const,
    };
  }, [isDirty, loading, saveNotice]);
  const footerStatusDetail = loading
    ? appI18n.settings.status.loadingFooter
    : isDirty
      ? appI18n.settings.status.unsavedChanges
      : saveNotice
        ? appI18n.settings.status.savedToPolicy
        : appI18n.settings.status.noUnsavedChanges;

  useEffect(() => {
    if (isDirty && saveNotice) {
      setSaveNotice(null);
    }
  }, [isDirty, saveNotice]);

  const immediateApplyHint = useMemo(
    () => buildImmediateApplyHint(currentWindowPolicy),
    [currentWindowPolicy],
  );
  async function handleReturnInline() {
    if (returningInline) {
      return;
    }

    setReturningInline(true);

    try {
      await openSurface({
        surfaceId: 'companion.main',
        presentation: 'current-window',
        initialProps: {
          skipStartupAutoOpen: true,
        },
      });
    } catch (switchError) {
      console.error('Failed to switch back to the main surface', switchError);
    } finally {
      setReturningInline(false);
    }
  }

  async function handleOpenDetachedWindow() {
    if (openingDetachedWindow) {
      return;
    }

    setOpeningDetachedWindow(true);

    try {
      await openSurface({
        surfaceId: 'companion.settings',
        presentation: 'new-window',
      });
    } catch (openError) {
      console.error('Failed to open detached settings window', openError);
    } finally {
      setOpeningDetachedWindow(false);
    }
  }

  async function handleOpenMainTab() {
    if (openingMainTab) {
      return;
    }

    setOpeningMainTab(true);

    try {
      await openSurface({
        surfaceId: 'companion.main',
        presentation: 'tab',
        initialProps: {
          skipStartupAutoOpen: true,
        },
      });
    } catch (openError) {
      console.error('Failed to open main surface as a tab', openError);
    } finally {
      setOpeningMainTab(false);
    }
  }

  async function handleOpenViewShotLab(presentation: SettingsSurfacePresentation) {
    if (openingViewShotLab) {
      return;
    }

    setOpeningViewShotLab(presentation);

    try {
      await openSurface({
        surfaceId: 'companion.view-shot',
        presentation,
      });
    } catch (openError) {
      console.error('Failed to open view-shot lab surface', openError);
    } finally {
      setOpeningViewShotLab(null);
    }
  }

  async function handleOpenWindowCaptureLab(
    presentation: SettingsSurfacePresentation,
  ) {
    if (openingWindowCaptureLab) {
      return;
    }

    setOpeningWindowCaptureLab(presentation);

    try {
      await openSurface({
        surfaceId: 'companion.window-capture',
        presentation,
      });
    } catch (openError) {
      console.error('Failed to open window-capture lab surface', openError);
    } finally {
      setOpeningWindowCaptureLab(null);
    }
  }

  async function handleSaveDraft() {
    if (savingDraft || !isDirty) {
      return;
    }

    setSavingDraft(true);
    setSaveNotice(null);

    try {
      const savedPreferences = await save(draft);
      setSaveNotice(buildSaveNotice(currentWindowPolicy, savedPreferences));
    } catch (saveError) {
      console.error('Failed to save window preferences', saveError);
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleFocusMainWindow() {
    if (focusingMainWindow) {
      return;
    }

    setFocusingMainWindow(true);

    try {
      await focusWindow('window.main');
    } catch (focusError) {
      console.error('Failed to focus the main window', focusError);
    } finally {
      setFocusingMainWindow(false);
    }
  }

  async function handleCloseCurrentWindow() {
    if (closingCurrentWindow || !currentWindowId || currentWindowId === 'window.main') {
      return;
    }

    setClosingCurrentWindow(true);

    try {
      await closeWindow(currentWindowId);
    } catch (closeError) {
      console.error('Failed to close the current window', closeError);
    } finally {
      setClosingCurrentWindow(false);
    }
  }

  const titleBarPassthroughTargets = useMemo(
    () => [headerActionsHostRef],
    [],
  );

  useTitleBarPassthroughTargets({
    windowId: currentWindowId,
    enabled: Boolean(titleBarMetrics?.extendsContentIntoTitleBar),
    targets: titleBarPassthroughTargets,
    refreshKey: `${appearancePreset}:${titleBarMetrics?.height ?? 0}:${headerActionsLayoutVersion}`,
  });

  return (
    <View testID='settings.screen' style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AppFrame
          eyebrow={appI18n.settings.frame.eyebrow}
          title={appI18n.settings.frame.title}
          description={appI18n.settings.frame.description}
          headerActionsHostRef={headerActionsHostRef}
          onHeaderActionsLayout={() => {
            setHeaderActionsLayoutVersion(version => version + 1);
          }}
          headerActions={[
            {
              label: returningInline
                ? appI18n.common.navigation.returnHomeBusy
                : appI18n.common.navigation.returnHome,
              onPress: () => {
                void handleReturnInline();
              },
              disabled: returningInline,
              tone: 'ghost',
              testID: 'settings.frame.action.return-home',
            },
          ]}>
          <Stack>
            <SectionCard
              testID='settings.section.display-density'
              title={appI18n.settings.sections.displayDensityTitle}
              description={appI18n.settings.sections.displayDensityDescription}>
              <View style={styles.choiceRow}>
                {densityOptions.map(option => (
                  <ChoiceChip
                    key={`density-${option.mode}`}
                    testID={`settings.density.${option.mode}`}
                    label={option.label}
                    detail={option.detail}
                    active={density === option.mode}
                    activeBadgeLabel={appI18n.common.choiceStatus.current}
                    inactiveBadgeLabel={appI18n.common.choiceStatus.switchTo}
                    onPress={() => {
                      setDensity(option.mode);
                    }}
                  />
                ))}
              </View>
            </SectionCard>

            <SectionCard
              testID='settings.section.appearance'
              title={appI18n.settings.sections.appearanceTitle}
              description={appI18n.settings.sections.appearanceDescription}>
              <Stack>
                <View style={styles.appearancePreviewRow}>
                  {appearanceOptions.map(option => (
                    <AppearancePresetCard
                      key={`appearance-${option.mode}`}
                      mode={option.mode}
                      label={option.label}
                      detail={option.detail}
                      active={draft.appearancePreset === option.mode}
                      palette={palette}
                      styles={styles}
                      onPress={() => {
                        setDraft((current: WindowPreferences) => ({
                          ...current,
                          appearancePreset: option.mode,
                        }));
                      }}
                    />
                  ))}
                </View>
                <View style={styles.appearanceSavedShell}>
                  <View style={styles.appearanceSavedDots}>
                    <View
                      style={[
                        styles.appearanceSavedDot,
                        {backgroundColor: palette.accent},
                      ]}
                    />
                    <View
                      style={[
                        styles.appearanceSavedDot,
                        {backgroundColor: palette.support},
                      ]}
                    />
                  </View>
                  <MutedText style={styles.appearanceSavedText}>
                  <Text testID='settings.saved-appearance'>
                    {appI18n.settings.status.currentSavedAppearancePrefix}
                    {formatAppearancePreset(preferences.appearancePreset)}。
                  </Text>
                  </MutedText>
                </View>
              </Stack>
            </SectionCard>

            <SectionCard
              testID='settings.section.window-sizing'
              title={appI18n.settings.sections.windowSizingTitle}
              description={appI18n.settings.sections.windowSizingDescription}>
              <Stack>
                <View style={styles.preferenceGroup}>
                  <Text style={styles.groupLabel}>{appI18n.settings.sections.mainWindow}</Text>
                  <View style={styles.choiceRow}>
                    {windowModeOptions.map(option => (
                      <ChoiceChip
                        key={`main-${option.mode}`}
                        testID={`settings.main-window-mode.${option.mode}`}
                        label={option.label}
                        detail={option.detail}
                        active={draft.mainWindowMode === option.mode}
                        activeBadgeLabel={appI18n.common.choiceStatus.current}
                        inactiveBadgeLabel={appI18n.common.choiceStatus.switchTo}
                        onPress={() => {
                          setDraft((current: WindowPreferences) => ({
                            ...current,
                            mainWindowMode: option.mode,
                          }));
                        }}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.preferenceGroup}>
                  <Text style={styles.groupLabel}>{appI18n.settings.sections.detachedSettingsWindow}</Text>
                  <View style={styles.choiceRow}>
                    {windowModeOptions.map(option => (
                      <ChoiceChip
                        key={`settings-${option.mode}`}
                        testID={`settings.settings-window-mode.${option.mode}`}
                        label={option.label}
                        detail={option.detail}
                        active={draft.settingsWindowMode === option.mode}
                        activeBadgeLabel={appI18n.common.choiceStatus.current}
                        inactiveBadgeLabel={appI18n.common.choiceStatus.switchTo}
                        onPress={() => {
                          setDraft((current: WindowPreferences) => ({
                            ...current,
                            settingsWindowMode: option.mode,
                          }));
                        }}
                      />
                    ))}
                  </View>
                </View>
              </Stack>
            </SectionCard>

            <SectionCard
              testID='settings.section.presentation'
              title={appI18n.settings.sections.settingsPresentationTitle}
              description={appI18n.settings.sections.settingsPresentationDescription}>
              <View style={styles.choiceRow}>
                {settingsPresentationOptions.map(option => (
                  <ChoiceChip
                    key={option.mode}
                    testID={`settings.presentation.${option.mode}`}
                    label={option.label}
                    detail={option.detail}
                    active={draft.settingsPresentation === option.mode}
                    activeBadgeLabel={appI18n.common.choiceStatus.current}
                    inactiveBadgeLabel={appI18n.common.choiceStatus.switchTo}
                    onPress={() => {
                      setDraft((current: WindowPreferences) => ({
                        ...current,
                        settingsPresentation: option.mode,
                      }));
                    }}
                  />
                ))}
              </View>
              <MutedText>
                <Text testID='settings.saved-presentation'>
                {appI18n.settings.status.currentSavedDefaultPrefix}{formatSettingsPresentation(preferences.settingsPresentation)}.
                </Text>
              </MutedText>
            </SectionCard>

            <SectionCard
              testID='settings.section.apply-preview'
              title={appI18n.settings.sections.applyPreviewTitle}
              description={appI18n.settings.sections.applyPreviewDescription}>
              <View style={styles.statusBlock}>
                <MutedText>
                  <Text testID='settings.current-window-policy'>
                  {appI18n.settings.status.currentHostWindowPrefix}{formatWindowTargetLabel(currentWindowPolicy)}.
                  </Text>
                </MutedText>
                <MutedText>
                  <Text testID='settings.current-draft'>
                  {appI18n.settings.status.mainWindowModePrefix}{formatWindowMode(draft.mainWindowMode)}。{appI18n.settings.status.settingsWindowModePrefix}{formatWindowMode(draft.settingsWindowMode)}。{appI18n.settings.status.settingsOpenPrefix}{formatSettingsPresentation(draft.settingsPresentation)}。{appI18n.settings.status.appearancePresetPrefix}{formatAppearancePreset(draft.appearancePreset)}。
                  </Text>
                </MutedText>
                {loading ? <MutedText>{appI18n.settings.status.loadingPreferences}</MutedText> : null}
                {saveNotice ? <Text testID='settings.save-notice' style={styles.successText}>{saveNotice}</Text> : null}
                {error ? <Text testID='settings.error-message' style={styles.errorText}>{error}</Text> : null}
                <MutedText>{immediateApplyHint}</MutedText>
              </View>
              <View style={styles.actionRow}>
                <ActionButton
                  testID='settings.action.return-inline'
                  label={returningInline ? appI18n.settings.actions.returnInlineBusy : appI18n.settings.actions.returnInline}
                  onPress={() => {
                    void handleReturnInline();
                  }}
                  disabled={returningInline}
                  tone="ghost"
                />
                <ActionButton
                  testID='settings.action.open-main-tab'
                  label={openingMainTab ? appI18n.settings.actions.openMainTabBusy : appI18n.settings.actions.openMainTab}
                  onPress={() => {
                    void handleOpenMainTab();
                  }}
                  disabled={openingMainTab}
                  tone="ghost"
                />
                <ActionButton
                  testID='settings.action.open-detached-settings'
                  label={
                    openingDetachedWindow
                      ? appI18n.settings.actions.openDetachedSettingsBusy
                      : appI18n.settings.actions.openDetachedSettings
                  }
                  onPress={() => {
                    void handleOpenDetachedWindow();
                  }}
                  disabled={openingDetachedWindow}
                />
              </View>
            </SectionCard>

            <SectionCard
              testID='settings.section.window-actions'
              title={appI18n.settings.sections.windowActionsTitle}
              description={appI18n.settings.sections.windowActionsDescription}>
              <View style={styles.statusBlock}>
                <MutedText>
                  <Text testID='settings.current-window-id'>
                    {appI18n.settings.status.currentWindowIdPrefix}{currentWindowId ?? appI18n.common.unknown}。
                  </Text>
                </MutedText>
                <MutedText>{appI18n.settings.status.mainWindowId}</MutedText>
              </View>
              <View style={styles.actionRow}>
                <ActionButton
                  testID='settings.action.focus-main-window'
                  label={focusingMainWindow ? appI18n.settings.actions.focusMainWindowBusy : appI18n.settings.actions.focusMainWindow}
                  onPress={() => {
                    void handleFocusMainWindow();
                  }}
                  disabled={focusingMainWindow}
                  tone="ghost"
                />
                {currentWindowId && currentWindowId !== 'window.main' ? (
                  <ActionButton
                    testID='settings.action.close-current-window'
                    label={closingCurrentWindow ? appI18n.settings.actions.closeCurrentWindowBusy : appI18n.settings.actions.closeCurrentWindow}
                    onPress={() => {
                      void handleCloseCurrentWindow();
                    }}
                    disabled={closingCurrentWindow}
                    tone="ghost"
                  />
                ) : null}
              </View>
            </SectionCard>

            <SectionCard
              testID='settings.section.view-shot-entry'
              title={appI18n.viewShotLab.sections.entryTitle}
              description={appI18n.viewShotLab.sections.entryDescription}>
              <View style={styles.statusBlock}>
                <MutedText>{appI18n.viewShotLab.feedback.settingsEntryHint}</MutedText>
              </View>
              <View style={styles.actionRow}>
                <ActionButton
                  testID='settings.action.open-view-shot-current'
                  label={appI18n.viewShotLab.actions.openCurrentLab}
                  onPress={() => {
                    void handleOpenViewShotLab('current-window');
                  }}
                  disabled={openingViewShotLab !== null}
                  tone="ghost"
                />
                <ActionButton
                  testID='settings.action.open-view-shot-detached'
                  label={
                    openingViewShotLab === 'new-window'
                      ? appI18n.viewShotLab.actions.openDetachedLabBusy
                      : appI18n.viewShotLab.actions.openDetachedLab
                  }
                  onPress={() => {
                    void handleOpenViewShotLab('new-window');
                  }}
                  disabled={openingViewShotLab !== null}
                />
              </View>
            </SectionCard>

            <SectionCard
              testID='settings.section.window-capture-entry'
              title={appI18n.windowCaptureLab.sections.entryTitle}
              description={appI18n.windowCaptureLab.sections.entryDescription}>
              <View style={styles.statusBlock}>
                <MutedText>{appI18n.windowCaptureLab.feedback.settingsEntryHint}</MutedText>
              </View>
              <View style={styles.actionRow}>
                <ActionButton
                  testID='settings.action.open-window-capture-current'
                  label={appI18n.windowCaptureLab.actions.openCurrentLab}
                  onPress={() => {
                    void handleOpenWindowCaptureLab('current-window');
                  }}
                  disabled={openingWindowCaptureLab !== null}
                  tone="ghost"
                />
                <ActionButton
                  testID='settings.action.open-window-capture-detached'
                  label={
                    openingWindowCaptureLab === 'new-window'
                      ? appI18n.windowCaptureLab.actions.openDetachedLabBusy
                      : appI18n.windowCaptureLab.actions.openDetachedLab
                  }
                  onPress={() => {
                    void handleOpenWindowCaptureLab('new-window');
                  }}
                  disabled={openingWindowCaptureLab !== null}
                />
              </View>
            </SectionCard>
          </Stack>
        </AppFrame>
      </ScrollView>

      <View style={styles.footerShell}>
        <View style={styles.footerHeader}>
          <Text style={styles.footerEyebrow}>{appI18n.settings.sections.footerEyebrow}</Text>
          <View style={styles.footerStatusRow}>
            <StatusBadge
              testID='settings.footer.signal'
              label={footerSignal.label}
              tone={footerSignal.tone}
              size="sm"
            />
            <Text testID='settings.footer.status' style={styles.footerStatus}>{footerStatusDetail}</Text>
          </View>
        </View>
        <View style={styles.footerActions}>
          <ActionButton
            testID='settings.action.reset-draft'
            label={appI18n.settings.actions.resetDraft}
            onPress={() => {
              setDraft(preferences);
              setSaveNotice(null);
            }}
            disabled={loading || savingDraft || !isDirty}
            tone="ghost"
          />
          <ActionButton
            testID='settings.action.save-preferences'
            label={
              savingDraft
                ? appI18n.settings.actions.saveWindowPreferencesBusy
                : saveNotice && !isDirty
                  ? appI18n.settings.actions.saveWindowPreferencesDone
                  : appI18n.settings.actions.saveWindowPreferences
            }
            onPress={() => {
              void handleSaveDraft();
            }}
            disabled={loading || savingDraft || !isDirty}
          />
        </View>
      </View>
    </View>
  );
}

function createScreenStyles(palette: AppPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 18,
  },
  preferenceGroup: {
    gap: 10,
  },
  groupLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  appearancePreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  appearanceCard: {
    flexBasis: 280,
    flexGrow: 1,
    minWidth: 260,
    gap: 12,
    borderRadius: appRadius.panel,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  appearanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  appearanceCardCopy: {
    flex: 1,
    gap: 4,
  },
  appearanceCardLabel: {
    color: palette.ink,
    ...appTypography.bodyStrong,
  },
  appearanceCardDetail: {
    color: palette.inkMuted,
    ...appTypography.caption,
  },
  appearanceCardBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  appearanceCardBadgeLabel: {
    letterSpacing: 0.4,
    ...appTypography.labelTightBold,
  },
  appearancePreview: {
    overflow: 'hidden',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  appearancePreviewRibbon: {
    height: 4,
    borderRadius: 999,
    marginBottom: 8,
    opacity: 0.92,
  },
  appearancePreviewWindow: {
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  appearancePreviewChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  appearancePreviewDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appearancePreviewDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  appearancePreviewCapsule: {
    width: 58,
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  appearancePreviewHero: {
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  appearancePreviewTitleLine: {
    width: '58%',
    height: 9,
    borderRadius: 999,
  },
  appearancePreviewBodyLine: {
    width: '74%',
    height: 6,
    borderRadius: 999,
  },
  appearancePreviewBody: {
    flexDirection: 'row',
    gap: 8,
  },
  appearancePreviewPanePrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  appearancePreviewAccentBar: {
    width: 3,
    height: 28,
    borderRadius: 999,
  },
  appearancePreviewPaneCopy: {
    flex: 1,
    gap: 5,
  },
  appearancePreviewPaneTitle: {
    width: '65%',
    height: 8,
    borderRadius: 999,
  },
  appearancePreviewPaneBody: {
    width: '86%',
    height: 6,
    borderRadius: 999,
  },
  appearancePreviewPaneSecondary: {
    width: 86,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  appearancePreviewSignalRow: {
    flexDirection: 'row',
    gap: 6,
  },
  appearancePreviewSignal: {
    flex: 1,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  appearancePreviewAction: {
    alignSelf: 'stretch',
    height: 18,
    borderRadius: 9,
  },
  appearanceSavedShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panelEmphasis,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  appearanceSavedDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appearanceSavedDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  appearanceSavedText: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusBlock: {
    gap: 6,
    backgroundColor: palette.canvas,
    borderRadius: appRadius.control,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successText: {
    color: palette.support,
    ...appTypography.bodyStrong,
  },
  errorText: {
    color: palette.errorRed,
    ...appTypography.bodyStrong,
  },
  footerShell: {
    borderTopWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  footerHeader: {
    gap: 4,
  },
  footerStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: appSpacing.sm,
  },
  footerEyebrow: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  footerStatus: {
    color: palette.inkMuted,
    ...settingsTypographyExceptions.footerStatus,
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  });
}









