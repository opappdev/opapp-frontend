import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Pressable,
  Text,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type {
  AgentApprovalDecisionMode,
  AgentApprovalTimelineEntry,
  AgentRunDocument,
} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';
import {
  Icon,
  SelectableRow,
  ActionButton,
  iconCatalog,
  useTheme,
} from '@opapp/ui-native-primitives';
import {resolveApprovalCommandPreview} from './agent-workbench-approval-summary';
import type {createScreenStyles} from './agent-workbench-styles';

type ApprovalDecisionMode = Extract<
  AgentApprovalDecisionMode,
  'approve-once' | 'approve-prefix' | 'reject'
>;

type WorkbenchApprovalDockSectionProps = {
  selectedPendingApproval: AgentApprovalTimelineEntry | null;
  selectedRunRequest: AgentRunDocument['run']['request'] | null;
  selectedCwd: string;
  approvalBusy: 'requesting' | 'approving' | 'rejecting' | null;
  onSubmitDecision: (decision: {
    decisionMode: ApprovalDecisionMode;
    reason?: string;
  }) => void;
  cardStyle?: StyleProp<ViewStyle>;
  screenStyles: ReturnType<typeof createScreenStyles>;
};

const approvalDecisionOptions: Array<{
  key: ApprovalDecisionMode;
  icon: keyof typeof iconCatalog;
}> = [
  {
    key: 'approve-once',
    icon: 'checkmark',
  },
  {
    key: 'approve-prefix',
    icon: 'shieldTask',
  },
  {
    key: 'reject',
    icon: 'dismiss',
  },
];

export function WorkbenchApprovalDockSection({
  selectedPendingApproval,
  selectedRunRequest,
  selectedCwd,
  approvalBusy,
  onSubmitDecision,
  cardStyle,
  screenStyles,
}: WorkbenchApprovalDockSectionProps) {
  const {palette} = useTheme();
  const [selectedDecisionMode, setSelectedDecisionMode] =
    useState<ApprovalDecisionMode>('approve-once');
  const [rejectReason, setRejectReason] = useState('');
  const firstOptionRef = useRef<View | null>(null);
  const approvalKey = selectedPendingApproval?.approvalId ?? 'none';

  useEffect(() => {
    setSelectedDecisionMode('approve-once');
    setRejectReason('');
  }, [approvalKey]);

  useEffect(() => {
    if (!selectedPendingApproval) {
      return;
    }

    const timer = setTimeout(() => {
      const node = firstOptionRef.current as any;
      if (node && typeof node.focus === 'function') {
        node.focus();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedPendingApproval]);

  const approvalReason = useMemo(
    () =>
      selectedPendingApproval?.requestReason?.trim() ||
      selectedPendingApproval?.title?.trim() ||
      appI18n.agentWorkbench.approval.promptTitle,
    [selectedPendingApproval],
  );
  const approvalCommand = selectedPendingApproval
    ? resolveApprovalCommandPreview(selectedPendingApproval, {
        command: selectedRunRequest?.command ?? null,
      }) ??
      selectedRunRequest?.command?.trim() ??
      ''
    : '';
  const submitDisabled =
    approvalBusy !== null ||
    !selectedPendingApproval ||
    (selectedDecisionMode === 'reject' && rejectReason.trim().length === 0);
  const submitLabel =
    approvalBusy === 'approving'
      ? appI18n.agentWorkbench.actions.approvingRequest
      : approvalBusy === 'rejecting'
        ? appI18n.agentWorkbench.actions.rejectingRequest
        : appI18n.agentWorkbench.approval.submitAction;

  if (!selectedPendingApproval) {
    return null;
  }

  return (
    <View
      testID='agent-workbench.approval.panel'
      accessible
      collapsable={false}
      style={[screenStyles.approvalSheet, cardStyle]}>
      <View style={screenStyles.approvalSheetSection}>
        <Text style={screenStyles.approvalSheetLabel}>
          {appI18n.agentWorkbench.approval.reasonLabel}
        </Text>
        <Text style={screenStyles.approvalSheetReasonText}>
          {approvalReason}
        </Text>
      </View>

      <View style={screenStyles.approvalSheetSection}>
        <Text style={screenStyles.approvalSheetLabel}>
          {appI18n.agentWorkbench.approval.commandLabel}
        </Text>
        <View style={screenStyles.approvalCommandShell}>
          <Text
            style={[
              screenStyles.terminalText,
              screenStyles.approvalCommandText,
              {color: palette.ink},
            ]}
            selectable>
            $ {approvalCommand || appI18n.agentWorkbench.values.noTextContent}
          </Text>
        </View>
      </View>

      <View style={screenStyles.approvalSheetSection}>
        <Text style={screenStyles.approvalSheetLabel}>
          {appI18n.agentWorkbench.approval.actionsLabel}
        </Text>
        <View style={screenStyles.approvalDecisionList}>
          {approvalDecisionOptions.map((option, index) => {
            const selected = selectedDecisionMode === option.key;
            const optionTitle =
              option.key === 'approve-once'
                ? appI18n.agentWorkbench.approval.approveOnceOption
                : option.key === 'approve-prefix'
                  ? appI18n.agentWorkbench.approval.approvePrefixOption
                  : appI18n.agentWorkbench.approval.rejectOption;
            const optionDetail =
              option.key === 'approve-once'
                ? appI18n.agentWorkbench.approval.approveOnceOptionDetail
                : option.key === 'approve-prefix'
                  ? appI18n.agentWorkbench.approval.approvePrefixOptionDetail
                  : appI18n.agentWorkbench.approval.rejectOptionDetail;
            return (
              <SelectableRow
                key={option.key}
                ref={(ref: View | null) => {
                  if (index === 0) {
                    firstOptionRef.current = ref;
                  }
                }}
                testID={`agent-workbench.approval.option.${option.key}`}
                title={optionTitle}
                subtitle={optionDetail}
                titleStyle={screenStyles.approvalDecisionTitle}
                subtitleStyle={screenStyles.approvalDecisionDetail}
                leading={
                  <Icon
                    icon={iconCatalog[option.icon]}
                    size={13}
                    color={selected ? palette.accent : palette.inkSoft}
                  />
                }
                trailing={
                  <View
                    style={[
                      screenStyles.approvalDecisionRadio,
                      selected
                        ? {
                            borderColor: palette.accent,
                            backgroundColor: palette.accent,
                          }
                        : null,
                    ]}
                  />
                }
                selected={selected}
                onPress={() => {
                  setSelectedDecisionMode(option.key);
                }}
                style={screenStyles.approvalDecisionRow}
              />
            );
          })}
        </View>
      </View>

      {selectedDecisionMode === 'reject' ? (
        <View style={screenStyles.approvalSheetSection}>
          <Text style={screenStyles.approvalSheetLabel}>
            {appI18n.agentWorkbench.approval.rejectReasonLabel}
          </Text>
          <View
            style={[
              screenStyles.approvalRejectReasonShell,
              {
                borderColor: palette.border,
                backgroundColor: palette.canvasShade,
              },
            ]}>
            <RNTextInput
              testID='agent-workbench.approval.reject-reason'
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={appI18n.agentWorkbench.approval.rejectReasonPlaceholder}
              placeholderTextColor={palette.inkSoft}
              multiline
              textAlignVertical='top'
              style={[
                screenStyles.approvalRejectReasonInput,
                {color: palette.ink},
              ]}
            />
          </View>
        </View>
      ) : null}

      <View style={screenStyles.approvalSheetFooter}>
        <ActionButton
          testID='agent-workbench.approval.submit'
          label={submitLabel}
          onPress={() => {
            if (submitDisabled) {
              return;
            }

            onSubmitDecision({
              decisionMode: selectedDecisionMode,
              reason:
                selectedDecisionMode === 'reject' ? rejectReason.trim() : undefined,
            });
          }}
          disabled={submitDisabled}
        />
      </View>
    </View>
  );
}
