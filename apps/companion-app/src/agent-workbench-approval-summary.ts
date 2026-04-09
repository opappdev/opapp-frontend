import type {AgentApprovalTimelineEntry} from '@opapp/framework-agent-runtime';
import {appI18n} from '@opapp/framework-i18n';

export type WorkbenchApprovalSummaryItem = {
  key: 'what' | 'impact' | 'output';
  label: string;
  value: string;
};

type ResolveApprovalSummaryOptions = {
  requestedCwd?: string | null;
  command?: string | null;
};

type ParsedApprovalDetails = {
  requestedCwd: string | null;
  targetPath: string | null;
  command: string | null;
  mentionsDiffPreview: boolean;
};

function normalizeApprovalSummaryText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function resolveApprovalPermissionModeLabel(
  permissionMode: AgentApprovalTimelineEntry['permissionMode'],
) {
  switch (permissionMode) {
    case 'read-only':
      return appI18n.agentWorkbench.permissionModes.readOnly;
    case 'danger-full-access':
      return appI18n.agentWorkbench.permissionModes.dangerFullAccess;
    case 'workspace-write':
      return appI18n.agentWorkbench.permissionModes.workspaceWrite;
    default:
      return appI18n.common.unknown;
  }
}

function parseApprovalDetails(
  details: AgentApprovalTimelineEntry['details'],
): ParsedApprovalDetails {
  const normalizedDetails = normalizeApprovalSummaryText(details);
  if (!normalizedDetails) {
    return {
      requestedCwd: null,
      targetPath: null,
      command: null,
      mentionsDiffPreview: false,
    };
  }

  const requestedCwdMatch = normalizedDetails.match(
    /批准后会在\s+(.+?)\s+下(?:更新|执行|继续)/,
  );
  const targetPathMatch = normalizedDetails.match(/文件\s+([^\s，。]+)/);
  const commandMatch = normalizedDetails.match(/执行以下命令[:：]\s*([\s\S]+)/);

  return {
    requestedCwd: normalizeApprovalSummaryText(requestedCwdMatch?.[1] ?? null),
    targetPath: normalizeApprovalSummaryText(targetPathMatch?.[1] ?? null),
    command: normalizeApprovalSummaryText(commandMatch?.[1] ?? null),
    mentionsDiffPreview: normalizedDetails.includes('diff 预览'),
  };
}

export function resolveApprovalRequestedCwd(
  approval: AgentApprovalTimelineEntry,
  options?: ResolveApprovalSummaryOptions,
) {
  const structuredRequestedCwd = normalizeApprovalSummaryText(
    approval.requestedCwd,
  );
  const parsed = parseApprovalDetails(approval.details);
  return (
    normalizeApprovalSummaryText(options?.requestedCwd) ??
    structuredRequestedCwd ??
    parsed.requestedCwd
  );
}

export function resolveApprovalCommandPreview(
  approval: AgentApprovalTimelineEntry,
  options?: ResolveApprovalSummaryOptions,
) {
  const structuredCommand = normalizeApprovalSummaryText(approval.commandText);
  const parsed = parseApprovalDetails(approval.details);
  return (
    normalizeApprovalSummaryText(options?.command) ??
    structuredCommand ??
    parsed.command
  );
}

export function approvalMentionsDiffPreview(
  approval: AgentApprovalTimelineEntry,
) {
  return parseApprovalDetails(approval.details).mentionsDiffPreview;
}

function resolveApprovalImpactSummary(
  approval: AgentApprovalTimelineEntry,
  options?: ResolveApprovalSummaryOptions,
) {
  const parsed = parseApprovalDetails(approval.details);
  const requestedCwd = resolveApprovalRequestedCwd(approval, options);
  const command = resolveApprovalCommandPreview(approval, options);

  if (parsed.targetPath && requestedCwd) {
    return appI18n.agentWorkbench.approval.summaryImpact.fileInWorkspace(
      requestedCwd,
      parsed.targetPath,
    );
  }

  if (parsed.targetPath) {
    return appI18n.agentWorkbench.approval.summaryImpact.fileOnly(
      parsed.targetPath,
    );
  }

  if (command && requestedCwd) {
    return appI18n.agentWorkbench.approval.summaryImpact.commandInWorkspace(
      requestedCwd,
    );
  }

  if (requestedCwd) {
    return appI18n.agentWorkbench.approval.summaryImpact.workspaceOnly(
      requestedCwd,
    );
  }

  return appI18n.agentWorkbench.approval.summaryImpact.generic(
    resolveApprovalPermissionModeLabel(approval.permissionMode),
  );
}

function resolveApprovalOutputSummary(approval: AgentApprovalTimelineEntry) {
  const hasDiffPreview = approvalMentionsDiffPreview(approval);

  switch (approval.status) {
    case 'approved':
      return hasDiffPreview
        ? appI18n.agentWorkbench.approval.summaryOutput.approvedDiffPreview
        : appI18n.agentWorkbench.approval.summaryOutput.approved;
    case 'rejected':
      return appI18n.agentWorkbench.approval.summaryOutput.rejected;
    case 'expired':
      return appI18n.agentWorkbench.approval.summaryOutput.expired;
    default:
      return hasDiffPreview
        ? appI18n.agentWorkbench.approval.summaryOutput.pendingDiffPreview
        : appI18n.agentWorkbench.approval.summaryOutput.pending;
  }
}

export function buildApprovalSummaryItems(
  approval: AgentApprovalTimelineEntry,
  options?: ResolveApprovalSummaryOptions,
): WorkbenchApprovalSummaryItem[] {
  return [
    {
      key: 'what',
      label: appI18n.agentWorkbench.approval.summaryLabels.what,
      value:
        normalizeApprovalSummaryText(approval.requestReason) ??
        normalizeApprovalSummaryText(approval.title) ??
        appI18n.common.unknown,
    },
    {
      key: 'impact',
      label: appI18n.agentWorkbench.approval.summaryLabels.impact,
      value: resolveApprovalImpactSummary(approval, options),
    },
    {
      key: 'output',
      label: appI18n.agentWorkbench.approval.summaryLabels.output,
      value: resolveApprovalOutputSummary(approval),
    },
  ];
}

export function resolveApprovalTargetDescription(
  approval: AgentApprovalTimelineEntry,
): string | null {
  const targetPath = parseApprovalDetails(approval.details).targetPath;
  if (!targetPath) {
    return null;
  }

  return `${resolveApprovalPermissionModeLabel(approval.permissionMode)} · ${targetPath}`;
}
