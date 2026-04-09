import React from 'react';
import {Text, View} from 'react-native';
import type {
  AgentArtifactKind,
  AgentRunDocument,
} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {Expander} from '@opapp/ui-native-primitives';
import {resolveArtifactKindLabel} from './agent-workbench-resolvers';
import {type createScreenStyles, terminalFontFamily} from './agent-workbench-styles';

type WorkbenchRunDiagnosticsSectionProps = {
  selectedRunDocument: AgentRunDocument | null;
  selectedRunRequest: AgentRunDocument['run']['request'] | null;
  selectedRunArtifactKind: AgentArtifactKind | null;
  selectedRunArtifactLabel: string | null;
  selectedRunArtifactPath: string | null;
  selectedRunArtifactHasStandaloneLabel: boolean;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

export function WorkbenchRunDiagnosticsSection({
  selectedRunDocument,
  selectedRunRequest,
  selectedRunArtifactKind,
  selectedRunArtifactLabel,
  selectedRunArtifactPath,
  selectedRunArtifactHasStandaloneLabel,
  screenStyles,
}: WorkbenchRunDiagnosticsSectionProps) {
  if (!selectedRunDocument) {
    return null;
  }
  const hasTerminalEvidence = selectedRunDocument.timeline.some(
    entry => entry.kind === 'terminal-event',
  );
  const hasArtifactEvidence = selectedRunDocument.timeline.some(
    entry => entry.kind === 'artifact',
  );
  const hasRejectedApproval = selectedRunDocument.timeline.some(
    entry => entry.kind === 'approval' && entry.status === 'rejected',
  );
  const shouldHideVisibleDiagnostics =
    selectedRunDocument.run.status === 'needs-approval' ||
    (!hasTerminalEvidence && !hasArtifactEvidence && hasRejectedApproval);
  const hiddenDiagnosticsLocators = (
    <View style={{height: 0, overflow: 'hidden'}}>
      <Text testID='agent-workbench.run.run-id'>
        {selectedRunDocument.run.runId}
      </Text>
      <Text testID='agent-workbench.run.command'>
        {selectedRunRequest?.command ?? appI18n.common.unknown}
      </Text>
      <Text testID='agent-workbench.run.cwd'>
        {selectedRunRequest?.cwd ?? appI18n.agentWorkbench.workspace.rootLabel}
      </Text>
      <Text testID='agent-workbench.run.thread-id'>
        {selectedRunDocument.run.threadId}
      </Text>
      <Text testID='agent-workbench.run.session-id'>
        {selectedRunDocument.run.sessionId ?? appI18n.common.unknown}
      </Text>
      {selectedRunDocument.run.resumedFromRunId ? (
        <Text testID='agent-workbench.run.resumed-from'>
          {selectedRunDocument.run.resumedFromRunId}
        </Text>
      ) : null}
    </View>
  );
  if (shouldHideVisibleDiagnostics) {
    return hiddenDiagnosticsLocators;
  }

  return (
    <View style={screenStyles.sectionCard}>
      {hiddenDiagnosticsLocators}

      <Expander
        title={appI18n.agentWorkbench.labels.runDetailExpanderTitle ?? 'Details'}
        defaultExpanded={false}>
        <View style={screenStyles.expanderBody}>
          <View style={screenStyles.runDetailGrid}>
            <View style={screenStyles.runDetailField}>
              <Text style={screenStyles.runDetailFieldLabel}>
                {appI18n.agentWorkbench.labels.threadId}
              </Text>
              <Text
                style={screenStyles.runDetailFieldValue}
                numberOfLines={1}>
                {selectedRunDocument.run.threadId}
              </Text>
            </View>
            <View style={screenStyles.runDetailField}>
              <Text style={screenStyles.runDetailFieldLabel}>
                {appI18n.agentWorkbench.labels.sessionId}
              </Text>
              <Text
                style={screenStyles.runDetailFieldValue}
                numberOfLines={1}>
                {selectedRunDocument.run.sessionId ?? appI18n.common.unknown}
              </Text>
            </View>
            {selectedRunDocument.run.resumedFromRunId ? (
              <View style={screenStyles.runDetailField}>
                <Text style={screenStyles.runDetailFieldLabel}>
                  {appI18n.agentWorkbench.labels.resumedFromRunId}
                </Text>
                <Text
                  style={screenStyles.runDetailFieldValue}
                  numberOfLines={1}>
                  {selectedRunDocument.run.resumedFromRunId}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={screenStyles.runDetailCommandShell}>
            <Text style={screenStyles.runDetailFieldLabel}>
              {appI18n.agentWorkbench.labels.command}
            </Text>
            <Text
              style={[
                screenStyles.terminalText,
                screenStyles.runDetailCommandText,
                {fontFamily: terminalFontFamily},
              ]}
              numberOfLines={4}>
              $ {selectedRunRequest?.command ?? appI18n.common.unknown}
            </Text>
            <Text
              style={screenStyles.runDetailCommandMeta}
              numberOfLines={1}>
              {appI18n.agentWorkbench.labels.cwd} ·{' '}
              {selectedRunRequest?.cwd ??
                appI18n.agentWorkbench.workspace.rootLabel}
            </Text>
          </View>

          {selectedRunArtifactKind ||
          selectedRunArtifactHasStandaloneLabel ||
          selectedRunArtifactPath ? (
            <View style={screenStyles.runDetailGrid}>
              {selectedRunArtifactKind ? (
                <View style={screenStyles.runDetailField}>
                  <Text style={screenStyles.runDetailFieldLabel}>
                    {appI18n.agentWorkbench.labels.runArtifactKind}
                  </Text>
                  <Text
                    testID='agent-workbench.run.artifact-kind'
                    style={screenStyles.runDetailFieldValue}
                    numberOfLines={1}>
                    {resolveArtifactKindLabel(selectedRunArtifactKind)}
                  </Text>
                </View>
              ) : null}
              {selectedRunArtifactHasStandaloneLabel ? (
                <View style={screenStyles.runDetailField}>
                  <Text style={screenStyles.runDetailFieldLabel}>
                    {appI18n.agentWorkbench.labels.runArtifactLabel}
                  </Text>
                  <Text
                    testID='agent-workbench.run.artifact-label'
                    style={screenStyles.runDetailFieldValue}
                    numberOfLines={1}>
                    {selectedRunArtifactLabel ?? appI18n.common.unknown}
                  </Text>
                </View>
              ) : null}
              {selectedRunArtifactPath ? (
                <View
                  style={[
                    screenStyles.runDetailField,
                    screenStyles.runDetailFieldWide,
                  ]}>
                  <Text style={screenStyles.runDetailFieldLabel}>
                    {appI18n.agentWorkbench.labels.runArtifactPath}
                  </Text>
                  <Text
                    testID='agent-workbench.run.artifact-path'
                    style={screenStyles.runDetailFieldValue}
                    numberOfLines={2}>
                    {selectedRunArtifactPath}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Expander>
    </View>
  );
}
