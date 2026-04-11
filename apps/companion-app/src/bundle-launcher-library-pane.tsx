import React, {useRef} from 'react';
import {ActivityIndicator, Pressable, Text, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  MutedText,
  StatusBadge,
  desktopCursor,
  useDiscretePressableState,
  useTheme,
  windowsFocusProps,
  type AppTone,
} from '@opapp/ui-native-primitives';
import {
  resolveBundleLibraryOpenTarget,
  type BundleLibraryEntry,
  type BundleLibraryGroupId,
} from './bundle-library-model';
import type {
  BundleLauncherScreenStyles,
  ScreenTonePalette,
} from './BundleLauncherScreen';

export type BundleLibrarySection = {
  groupId: BundleLibraryGroupId;
  title: string;
  entries: BundleLibraryEntry[];
};

type BundleLibraryRowProps = {
  entry: BundleLibraryEntry;
  selected: boolean;
  canOpen: boolean;
  openingTargetId: string | null;
  onSelect: () => void;
  onPrimaryAction: () => void;
  onKeyDown: (event: {nativeEvent: {key: string}}) => void;
  onRowRef: (ref: View | null) => void;
  keyDownEvents?: readonly {code: string}[];
  styles: BundleLauncherScreenStyles;
  tonePalette: ScreenTonePalette;
};

function BundleLibraryRow({
  entry,
  selected,
  canOpen,
  openingTargetId,
  onSelect,
  onPrimaryAction,
  onKeyDown,
  onRowRef,
  keyDownEvents,
  styles,
  tonePalette,
}: BundleLibraryRowProps) {
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
  const rowBusy = entry.isBusy;
  const resolvedOpenTarget = resolveBundleLibraryOpenTarget(entry);
  const rowOpenBusy = openingTargetId === resolvedOpenTarget?.targetId;
  const iconToneTokens = tonePalette[entry.iconTone as AppTone].soft;
  const primaryActionLabel =
    entry.primaryActionLabel === null
      ? null
      : rowBusy
        ? entry.primaryActionKind === 'install'
          ? appI18n.bundleLauncher.actions.installing
          : appI18n.bundleLauncher.actions.updating
        : rowOpenBusy
          ? appI18n.bundleLauncher.actions.opening
          : entry.primaryActionLabel;
  const primaryActionDisabled =
    rowBusy ||
    rowOpenBusy ||
    (entry.primaryActionKind === 'open' && !canOpen);
  const rowTriggersPrimaryAction =
    entry.primaryActionKind === 'open' && !primaryActionDisabled;

  function handleActivateRow() {
    onSelect();
    if (rowTriggersPrimaryAction) {
      onPrimaryAction();
    }
  }

  return (
    <View
      style={[
        styles.appRowShell,
        selected ? styles.appRowSelected : styles.appRow,
        hovered && !primaryActionDisabled
          ? {
              borderColor: palette.borderStrong,
              backgroundColor: selected
                ? palette.panelEmphasis
                : palette.canvasShade,
            }
          : null,
        focusVisible ? {borderColor: palette.focusRing, borderWidth: 2} : null,
        primaryActionDisabled ? null : desktopCursor,
      ]}>
      <View
        pointerEvents='none'
        style={[
          styles.appRowIndicator,
          {backgroundColor: selected ? palette.accent : 'transparent'},
        ]}
      />
      <Pressable
        ref={onRowRef as any}
        testID={`bundle-launcher.row.${entry.bundleId}`}
        accessibilityRole='button'
        accessibilityState={{selected}}
        focusable
        hitSlop={4}
        {...windowsFocusProps({nativeFocusRing: false})}
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
        onKeyDown={onKeyDown as any}
        onPress={() => {
          if (suppressPressForKeyboardRef.current) {
            suppressPressForKeyboardRef.current = false;
            return;
          }
          handleActivateRow();
        }}
        onKeyUp={(event: any) => {
          const key = event?.nativeEvent?.key;
          if (
            key === 'Enter' ||
            key === ' ' ||
            key === 'Space' ||
            key === 'Spacebar'
          ) {
            suppressPressForKeyboardRef.current = true;
            handleActivateRow();
          }
        }}
        style={({pressed}: any) => [
          styles.appRowPressable,
          pressed ? styles.appRowPressablePressed : null,
        ]}>
        <View
          pointerEvents='none'
          style={[
            styles.appIcon,
            {backgroundColor: iconToneTokens.container.backgroundColor},
          ]}>
          {rowBusy || rowOpenBusy ? (
            <ActivityIndicator
              size='small'
              color={iconToneTokens.label.color as string}
            />
          ) : (
            <Text
              style={[
                styles.appIconLabel,
                {color: iconToneTokens.label.color as string},
              ]}>
              {entry.monogram}
            </Text>
          )}
        </View>
        <View pointerEvents='none' style={styles.appRowBody}>
          <Text numberOfLines={1} style={styles.appName}>
            {entry.displayName}
          </Text>
          <Text numberOfLines={2} style={styles.appSubtitle}>
            {entry.subtitle}
          </Text>
        </View>
      </Pressable>

      <View style={styles.appRowTrailing}>
        <View style={styles.appRowSummary}>
          {entry.isDefaultStartupApp ? (
            <StatusBadge
              label={appI18n.bundleLauncher.library.defaultStartup}
              tone='accent'
              size='sm'
            />
          ) : null}
          <StatusBadge
            label={entry.stateLabel}
            tone={entry.stateTone}
            size='sm'
          />
          <Text style={styles.appVersionSummary}>{entry.versionSummary}</Text>
        </View>
        {primaryActionLabel ? (
          <View style={styles.appRowAction}>
            <ActionButton
              testID={`bundle-launcher.row-action.${entry.bundleId}`}
              label={primaryActionLabel}
              onPress={() => {
                void onPrimaryAction();
              }}
              disabled={primaryActionDisabled}
              tone={entry.primaryActionTone}
            />
          </View>
        ) : (
          <View style={styles.appRowAction}>
            <MutedText>{appI18n.bundleLauncher.library.readOnlyHint}</MutedText>
          </View>
        )}
      </View>
    </View>
  );
}

type BundleLibraryPaneProps = {
  groupedLibraryEntries: ReadonlyArray<BundleLibrarySection>;
  loading: boolean;
  selectedBundleId: string | null;
  bundleAvailability: Record<string, boolean>;
  openingTargetId: string | null;
  keyDownEvents?: readonly {code: string}[];
  onRowRef: (bundleId: string, ref: View | null) => void;
  onRowKeyDown: (
    bundleId: string,
    event: {nativeEvent: {key: string}},
  ) => void;
  onSelectEntry: (bundleId: string) => void;
  onPrimaryAction: (entry: BundleLibraryEntry) => void;
  styles: BundleLauncherScreenStyles;
  tonePalette: ScreenTonePalette;
};

export function BundleLibraryPane({
  groupedLibraryEntries,
  loading,
  selectedBundleId,
  bundleAvailability,
  openingTargetId,
  keyDownEvents,
  onRowRef,
  onRowKeyDown,
  onSelectEntry,
  onPrimaryAction,
  styles,
  tonePalette,
}: BundleLibraryPaneProps) {
  return (
    <>
      <Text style={styles.paneTitle}>
        {appI18n.bundleLauncher.sections.libraryTitle}
      </Text>
      {loading ? (
        <Text style={styles.loadingHint}>
          {appI18n.bundleLauncher.service.status.loading}
        </Text>
      ) : null}

      {groupedLibraryEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>
            {appI18n.bundleLauncher.empty.title}
          </Text>
          <Text style={styles.emptyStateDescription}>
            {appI18n.bundleLauncher.empty.description}
          </Text>
        </View>
      ) : (
        groupedLibraryEntries.map((section, sectionIndex) => (
          <View
            key={section.groupId}
            style={[
              styles.groupSection,
              sectionIndex > 0 ? styles.groupSectionSeparated : null,
            ]}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{section.title}</Text>
              <Text style={styles.groupCount}>{section.entries.length}</Text>
            </View>
            <View accessibilityRole='list' style={styles.groupList}>
              {section.entries.map(entry => {
                const rowSelected = selectedBundleId === entry.bundleId;
                const resolvedOpenTarget = resolveBundleLibraryOpenTarget(entry);
                const rowCanOpen = resolvedOpenTarget
                  ? bundleAvailability[resolvedOpenTarget.bundleId] ?? true
                  : false;

                return (
                  <BundleLibraryRow
                    key={entry.bundleId}
                    entry={entry}
                    selected={rowSelected}
                    canOpen={rowCanOpen}
                    openingTargetId={openingTargetId}
                    onRowRef={(ref: View | null) => {
                      onRowRef(entry.bundleId, ref);
                    }}
                    keyDownEvents={keyDownEvents}
                    onKeyDown={event => {
                      onRowKeyDown(entry.bundleId, event);
                    }}
                    onSelect={() => {
                      onSelectEntry(entry.bundleId);
                    }}
                    onPrimaryAction={() => {
                      onPrimaryAction(entry);
                    }}
                    styles={styles}
                    tonePalette={tonePalette}
                  />
                );
              })}
            </View>
          </View>
        ))
      )}
    </>
  );
}
