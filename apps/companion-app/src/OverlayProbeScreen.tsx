import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {appI18n} from '@opapp/framework-i18n';
import {
  useCurrentWindowId,
  useCurrentWindowPolicy,
  useTitleBarMetrics,
} from '@opapp/framework-windowing';
import {
  AppFrame,
  InlineMetric,
  MutedText,
  SectionCard,
  Stack,
  StatusBadge,
  type AppPalette,
  useTheme,
} from '@opapp/ui-native-primitives';

function formatWindowTargetLabel(policy: string | null) {
  if (policy === 'main') {
    return appI18n.common.windowTarget.main;
  }

  if (policy === 'settings') {
    return appI18n.common.windowTarget.settings;
  }

  if (policy === 'tool') {
    return appI18n.common.windowTarget.tool;
  }

  if (policy === 'overlay') {
    return appI18n.common.windowTarget.overlay;
  }

  return appI18n.common.windowTarget.current;
}

function createScreenStyles(palette: AppPalette) {
  return StyleSheet.create({
    scrollContent: {
      gap: 16,
      paddingBottom: 24,
    },
    badgeRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metricCell: {
      flexGrow: 1,
      minWidth: 168,
    },
    noteItem: {
      color: palette.inkMuted,
      lineHeight: 21,
    },
  });
}

export function OverlayProbeScreen() {
  const {palette} = useTheme();
  const styles = useMemo(() => createScreenStyles(palette), [palette]);
  const currentWindowId = useCurrentWindowId();
  const currentWindowPolicy = useCurrentWindowPolicy();
  const titleBarMetrics = useTitleBarMetrics();
  const metrics = [
    {
      label: appI18n.overlayProbe.status.surfaceId,
      value: 'companion.overlay-probe',
    },
    {
      label: appI18n.overlayProbe.status.windowId,
      value: currentWindowId ?? appI18n.common.unknown,
    },
    {
      label: appI18n.overlayProbe.status.windowPolicy,
      value: formatWindowTargetLabel(currentWindowPolicy),
    },
    {
      label: appI18n.overlayProbe.status.titleBarHeight,
      value: `${titleBarMetrics?.height ?? 0}px`,
    },
  ] as const;

  return (
    <AppFrame
      eyebrow={appI18n.overlayProbe.frame.eyebrow}
      title={appI18n.overlayProbe.frame.title}
      description={appI18n.overlayProbe.frame.description}
      testID="overlay-probe.frame"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard
          title={appI18n.overlayProbe.sections.metricsTitle}
          description={appI18n.overlayProbe.sections.metricsDescription}
          testID="overlay-probe.metrics"
        >
          <View style={styles.badgeRow}>
            <StatusBadge
              label={appI18n.overlayProbe.badges.publicProbe}
              tone="accent"
            />
            <StatusBadge
              label={appI18n.overlayProbe.badges.hostBootstrap}
              tone="support"
            />
          </View>
          <View style={styles.metricGrid}>
            {metrics.map(metric => (
              <View key={metric.label} style={styles.metricCell}>
                <InlineMetric label={metric.label} value={metric.value} />
              </View>
            ))}
          </View>
          <MutedText>{appI18n.overlayProbe.status.expectation}</MutedText>
        </SectionCard>
        <SectionCard
          title={appI18n.overlayProbe.sections.notesTitle}
          description={appI18n.overlayProbe.sections.notesDescription}
          testID="overlay-probe.notes"
        >
          <Stack>
            <MutedText style={styles.noteItem}>
              1. {appI18n.overlayProbe.notes.publicBoundary}
            </MutedText>
            <MutedText style={styles.noteItem}>
              2. {appI18n.overlayProbe.notes.notHomepage}
            </MutedText>
            <MutedText style={styles.noteItem}>
              3. {appI18n.overlayProbe.notes.notAvatar}
            </MutedText>
            <MutedText style={styles.noteItem}>
              4. {appI18n.overlayProbe.notes.overlayExpectation}
            </MutedText>
          </Stack>
        </SectionCard>
      </ScrollView>
    </AppFrame>
  );
}
