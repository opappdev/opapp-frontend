import {appI18n} from '@opapp/framework-i18n';
import type {
  AgentArtifactKind,
  AgentApprovalTimelineEntry,
  AgentMessageRole,
  AgentPlanStepStatus,
  AgentPlanTimelineEntry,
  AgentRunDocument,
  AgentRunStatus,
  AgentTerminalEventType,
  AgentTimelineEntry,
  AgentToolCallStatus,
  AgentToolResultStatus,
  AgentSessionAttentionState,
  AgentSessionLifecycleState,
} from '@opapp/framework-agent-runtime';
import type {AppTone} from '@opapp/ui-native-primitives';
import {type IconDefinition, iconCatalog} from '@opapp/ui-native-primitives';
import type {WorkbenchToolInvocationTimelineItem} from './agent-workbench-model';
import type {WorkspaceEntry} from '@opapp/framework-filesystem';

export function formatIsoTimestamp(value: string | null) {
  if (!value) {
    return appI18n.common.unknown;
  }

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/,
  );
  if (!match) {
    return value;
  }

  return `${match[1]} ${match[2]} UTC`;
}

export function formatSizeBytes(value: number | null) {
  if (value === null || value < 0) {
    return appI18n.common.unknown;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function resolveRunStatusTone(status: AgentRunStatus | null): AppTone {
  switch (status) {
    case 'running':
      return 'accent';
    case 'needs-approval':
      return 'warning';
    case 'completed':
      return 'support';
    case 'failed':
      return 'danger';
    case 'cancelled':
    case 'interrupted':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function resolveRunStatusLabel(status: AgentRunStatus | null) {
  switch (status) {
    case 'queued':
      return appI18n.agentWorkbench.status.queued;
    case 'running':
      return appI18n.agentWorkbench.status.running;
    case 'needs-approval':
      return appI18n.agentWorkbench.status.needsApproval;
    case 'completed':
      return appI18n.agentWorkbench.status.completed;
    case 'failed':
      return appI18n.agentWorkbench.status.failed;
    case 'cancelled':
      return appI18n.agentWorkbench.status.cancelled;
    case 'interrupted':
      return appI18n.agentWorkbench.status.interrupted;
    default:
      return appI18n.agentWorkbench.status.idle;
  }
}

export function resolveTerminalEventLabel(event: AgentTerminalEventType) {
  switch (event) {
    case 'started':
      return appI18n.agentWorkbench.events.started;
    case 'stdout':
      return appI18n.agentWorkbench.events.stdout;
    case 'stderr':
      return appI18n.agentWorkbench.events.stderr;
    case 'stdin':
      return appI18n.agentWorkbench.events.stdin;
    case 'exit':
      return appI18n.agentWorkbench.events.exit;
    default:
      return event;
  }
}

export function resolveApprovalStatusTone(
  status: AgentApprovalTimelineEntry['status'],
): AppTone {
  switch (status) {
    case 'approved':
      return 'support';
    case 'rejected':
      return 'danger';
    case 'expired':
      return 'neutral';
    default:
      return 'warning';
  }
}

export function resolveApprovalStatusLabel(
  status: AgentApprovalTimelineEntry['status'],
) {
  switch (status) {
    case 'approved':
      return appI18n.agentWorkbench.approval.status.approved;
    case 'rejected':
      return appI18n.agentWorkbench.approval.status.rejected;
    case 'expired':
      return appI18n.agentWorkbench.approval.status.expired;
    default:
      return appI18n.agentWorkbench.approval.status.pending;
  }
}

export function resolvePermissionModeLabel(
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

export function resolveArtifactKindLabel(kind: AgentArtifactKind | null) {
  switch (kind) {
    case 'diff':
      return appI18n.agentWorkbench.artifactKinds.diff;
    case 'file':
      return appI18n.agentWorkbench.artifactKinds.file;
    case 'image':
      return appI18n.agentWorkbench.artifactKinds.image;
    case 'log':
      return appI18n.agentWorkbench.artifactKinds.log;
    case 'report':
      return appI18n.agentWorkbench.artifactKinds.report;
    default:
      return appI18n.common.unknown;
  }
}

export function resolveArtifactKindTone(kind: AgentArtifactKind | null): AppTone {
  switch (kind) {
    case 'diff':
      return 'accent';
    case 'image':
    case 'report':
      return 'support';
    case 'log':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function resolveRetryableLabel(retryable: boolean) {
  return retryable
    ? appI18n.agentWorkbench.values.retryable
    : appI18n.agentWorkbench.values.notRetryable;
}

export function resolveMessageRoleLabel(role: AgentMessageRole) {
  switch (role) {
    case 'system':
      return appI18n.agentWorkbench.roles.system;
    case 'user':
      return appI18n.agentWorkbench.roles.user;
    case 'assistant':
      return appI18n.agentWorkbench.roles.assistant;
    default:
      return appI18n.common.unknown;
  }
}

export function resolveMessageRoleTone(role: AgentMessageRole): AppTone {
  switch (role) {
    case 'user':
      return 'accent';
    case 'assistant':
      return 'support';
    default:
      return 'neutral';
  }
}

export function resolvePlanStepStatusLabel(status: AgentPlanStepStatus) {
  switch (status) {
    case 'completed':
      return appI18n.agentWorkbench.planStepStatus.completed;
    case 'in_progress':
      return appI18n.agentWorkbench.planStepStatus.inProgress;
    case 'pending':
      return appI18n.agentWorkbench.planStepStatus.pending;
    default:
      return appI18n.common.unknown;
  }
}

export function resolvePlanStepStatusTone(status: AgentPlanStepStatus): AppTone {
  switch (status) {
    case 'completed':
      return 'support';
    case 'in_progress':
      return 'accent';
    case 'pending':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function countCompletedPlanSteps(steps: AgentPlanTimelineEntry['steps']) {
  return steps.filter(step => step.status === 'completed').length;
}

export function resolveToolCallStatusLabel(status: AgentToolCallStatus) {
  switch (status) {
    case 'queued':
      return appI18n.agentWorkbench.toolCallStatus.queued;
    case 'running':
      return appI18n.agentWorkbench.toolCallStatus.running;
    case 'completed':
      return appI18n.agentWorkbench.toolCallStatus.completed;
    case 'failed':
      return appI18n.agentWorkbench.toolCallStatus.failed;
    case 'cancelled':
      return appI18n.agentWorkbench.toolCallStatus.cancelled;
    default:
      return appI18n.common.unknown;
  }
}

export function resolveToolCallStatusTone(status: AgentToolCallStatus): AppTone {
  switch (status) {
    case 'completed':
      return 'support';
    case 'running':
      return 'accent';
    case 'failed':
      return 'danger';
    case 'cancelled':
      return 'warning';
    case 'queued':
    default:
      return 'neutral';
  }
}

export function resolveToolResultStatusLabel(status: AgentToolResultStatus) {
  switch (status) {
    case 'success':
      return appI18n.agentWorkbench.toolResultStatus.success;
    case 'error':
      return appI18n.agentWorkbench.toolResultStatus.error;
    case 'cancelled':
      return appI18n.agentWorkbench.toolResultStatus.cancelled;
    default:
      return appI18n.common.unknown;
  }
}

export function resolveToolResultStatusTone(status: AgentToolResultStatus): AppTone {
  switch (status) {
    case 'success':
      return 'support';
    case 'error':
      return 'danger';
    case 'cancelled':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function resolveTimelineEntryTitle(entry: AgentTimelineEntry) {
  switch (entry.kind) {
    case 'message':
      return resolveMessageRoleLabel(entry.role);
    case 'plan':
      return appI18n.agentWorkbench.events.plan;
    case 'terminal-event':
      return resolveTerminalEventLabel(entry.event);
    case 'artifact':
      return entry.label || appI18n.agentWorkbench.events.artifact;
    case 'approval':
      return entry.title;
    case 'error':
      return appI18n.agentWorkbench.events.error;
    default:
      return appI18n.common.unknown;
  }
}

export function resolveToolInvocationTitle(item: WorkbenchToolInvocationTimelineItem) {
  if (item.toolName) {
    return item.toolName;
  }

  return item.result
    ? appI18n.agentWorkbench.events.toolResult
    : appI18n.agentWorkbench.events.toolCall;
}

/**
 * Human-readable title for tool invocation Expander.
 * Shows the actual command/input instead of raw tool name.
 * For shell_command: "$ git status"  (multi-line: "$ git status  (+N lines)")
 * For read_file / file_read: "Read path/to/file"
 * For write_file / file_write / create_file: "Write path/to/file"
 * For edit_file / str_replace / str_replace_in_file: "Edit path/to/file"
 * For list_directory / list_dir: "List directory"
 * For search / search_files / grep: "Search ..."
 * For other tools: "toolName: first line of input"
 * Falls back to resolveToolInvocationTitle.
 */
export function resolveToolInvocationHumanTitle(item: WorkbenchToolInvocationTimelineItem) {
  const inputText = item.call?.inputText;
  if (inputText) {
    const lines = inputText.split('\n');
    const firstLine = lines[0].trim();
    const extraLines = lines.filter(l => l.trim().length > 0).length - 1;
    const suffix = extraLines > 0 ? `  (+${extraLines})` : '';

    if (item.toolName === 'shell_command') {
      const maxLen = 60 - suffix.length;
      const cmd = firstLine.length <= maxLen
        ? firstLine
        : `${firstLine.substring(0, maxLen - 1)}…`;
      return `$ ${cmd}${suffix}`;
    }

    // File-oriented tools: extract path from first meaningful token
    const pathMatch = firstLine.match(/^(?:["'])?([^\s"']+)/);
    const filePath = pathMatch ? pathMatch[1] : firstLine;
    const shortPath = filePath.length > 40 ? `…${filePath.slice(-37)}` : filePath;

    if (item.toolName === 'read_file' || item.toolName === 'file_read') {
      return `Read ${shortPath}`;
    }
    if (item.toolName === 'write_file' || item.toolName === 'file_write' || item.toolName === 'create_file') {
      return `Write ${shortPath}`;
    }
    if (item.toolName === 'edit_file' || item.toolName === 'str_replace' || item.toolName === 'str_replace_in_file') {
      return `Edit ${shortPath}`;
    }
    if (item.toolName === 'list_directory' || item.toolName === 'list_dir') {
      return `List ${shortPath}`;
    }
    if (item.toolName === 'search' || item.toolName === 'search_files' || item.toolName === 'grep') {
      const query = firstLine.length <= 40 ? firstLine : `${firstLine.substring(0, 37)}…`;
      return `Search "${query}"`;
    }

    if (item.toolName) {
      const maxLen = 48 - suffix.length;
      return firstLine.length <= maxLen
        ? `${item.toolName}: ${firstLine}${suffix}`
        : `${item.toolName}: ${firstLine.substring(0, maxLen - 1)}…${suffix}`;
    }
  }
  return resolveToolInvocationTitle(item);
}

export function resolveToolInvocationTone(item: WorkbenchToolInvocationTimelineItem) {
  if (item.result) {
    return resolveToolResultStatusTone(item.result.status);
  }

  if (item.call) {
    return resolveToolCallStatusTone(item.call.status);
  }

  return 'neutral';
}

export function resolveToolInvocationTrailingLabel(
  item: WorkbenchToolInvocationTimelineItem,
) {
  if (item.result) {
    return resolveToolResultStatusLabel(item.result.status);
  }

  if (item.call) {
    return resolveToolCallStatusLabel(item.call.status);
  }

  return appI18n.common.unknown;
}

export function resolveToolInvocationUpdatedAt(
  item: WorkbenchToolInvocationTimelineItem,
) {
  return item.result?.createdAt ?? item.call?.createdAt ?? null;
}

export function resolveToolInvocationSessionId(
  item: WorkbenchToolInvocationTimelineItem,
) {
  return item.terminalEvents[0]?.sessionId ?? null;
}

export function resolveToolInvocationTerminalEventsLabel(
  item: WorkbenchToolInvocationTimelineItem,
) {
  if (item.terminalEvents.length === 0) {
    return appI18n.agentWorkbench.values.noTerminalEventsYet;
  }

  const seenEvents = new Set<AgentTerminalEventType>();
  const labels: string[] = [];
  for (const terminalEvent of item.terminalEvents) {
    if (seenEvents.has(terminalEvent.event)) {
      continue;
    }

    seenEvents.add(terminalEvent.event);
    labels.push(resolveTerminalEventLabel(terminalEvent.event));
  }

  return labels.join(' / ');
}

export function resolveTimelineEntryTone(entry: AgentTimelineEntry): AppTone {
  switch (entry.kind) {
    case 'message':
      return resolveMessageRoleTone(entry.role);
    case 'plan':
      return 'accent';
    case 'tool-call':
      return resolveToolCallStatusTone(entry.status);
    case 'tool-result':
      return resolveToolResultStatusTone(entry.status);
    case 'approval':
      return resolveApprovalStatusTone(entry.status);
    case 'artifact':
      return resolveArtifactKindTone(entry.artifactKind);
    case 'error':
      return 'danger';
    case 'terminal-event':
      return entry.event === 'stderr' ? 'warning' : 'neutral';
    default:
      return 'neutral';
  }
}

export function resolveTimelineEntryTrailingLabel(entry: AgentTimelineEntry) {
  switch (entry.kind) {
    case 'plan':
      return appI18n.agentWorkbench.values.planProgress(
        countCompletedPlanSteps(entry.steps),
        entry.steps.length,
      );
    case 'tool-call':
      return resolveToolCallStatusLabel(entry.status);
    case 'tool-result':
      return resolveToolResultStatusLabel(entry.status);
    case 'approval':
      return resolveApprovalStatusLabel(entry.status);
    case 'artifact':
      return resolveArtifactKindLabel(entry.artifactKind);
    default:
      return formatIsoTimestamp(entry.createdAt);
  }
}

export function findPendingApproval(document: AgentRunDocument | null) {
  if (!document) {
    return null;
  }

  for (let index = document.timeline.length - 1; index >= 0; index -= 1) {
    const entry = document.timeline[index];
    if (entry.kind === 'approval' && entry.status === 'pending') {
      return entry;
    }
  }

  return null;
}

export function findLatestApproval(document: AgentRunDocument | null) {
  if (!document) {
    return null;
  }

  for (let index = document.timeline.length - 1; index >= 0; index -= 1) {
    const entry = document.timeline[index];
    if (entry.kind === 'approval') {
      return entry;
    }
  }

  return null;
}

export function formatThreadSubtitle(thread: {lastRunStatus: AgentRunStatus | null; updatedAt: string | null}) {
  return `${resolveRunStatusLabel(thread.lastRunStatus)} · ${formatIsoTimestamp(thread.updatedAt)}`;
}

export function formatWorkspaceSelection(
  selectedWorkspaceStat: WorkspaceEntry | null,
  trustedWorkspace: {displayName?: string | null; rootPath: string} | null,
) {
  if (!selectedWorkspaceStat) {
    return (
      trustedWorkspace?.displayName ??
      appI18n.agentWorkbench.workspace.rootLabel
    );
  }

  return selectedWorkspaceStat.relativePath || selectedWorkspaceStat.name;
}

export function resolveWorkspaceKindLabel(kind: WorkspaceEntry['kind']) {
  return kind === 'directory'
    ? appI18n.agentWorkbench.workspace.directoryKind
    : appI18n.agentWorkbench.workspace.fileKind;
}

export function formatWorkspaceEntryMeta(entry: WorkspaceEntry) {
  const kind = resolveWorkspaceKindLabel(entry.kind);
  if (entry.sizeBytes === null || entry.sizeBytes < 0) {
    return kind;
  }
  return `${kind} · ${formatSizeBytes(entry.sizeBytes)}`;
}

// ---------------------------------------------------------------------------
//  Icon resolvers — map semantic context to IconDefinition
// ---------------------------------------------------------------------------

export function resolveToolInvocationIcon(item: WorkbenchToolInvocationTimelineItem): IconDefinition {
  switch (item.toolName) {
    case 'shell_command':
      return iconCatalog.terminal;
    case 'read_file':
    case 'file_read':
      return iconCatalog.document;
    case 'write_file':
    case 'file_write':
    case 'create_file':
      return iconCatalog.edit;
    case 'edit_file':
    case 'str_replace':
    case 'str_replace_in_file':
      return iconCatalog.edit;
    case 'list_directory':
    case 'list_dir':
      return iconCatalog.folderOpen;
    case 'search':
    case 'search_files':
    case 'grep':
      return iconCatalog.search;
    default:
      return iconCatalog.code;
  }
}

export function resolveTimelineEntryIcon(entry: AgentTimelineEntry): IconDefinition {
  switch (entry.kind) {
    case 'message':
      return entry.role === 'user' ? iconCatalog.chat : iconCatalog.robot;
    case 'plan':
      return iconCatalog.checkmark;
    case 'terminal-event':
      return iconCatalog.terminal;
    case 'approval':
      return iconCatalog.shieldTask;
    case 'error':
      return iconCatalog.errorBadge;
    case 'artifact':
      return entry.artifactKind === 'diff' ? iconCatalog.diffView : iconCatalog.document;
    default:
      return iconCatalog.info;
  }
}

export function resolveApprovalTargetDescription(approval: AgentApprovalTimelineEntry): string | null {
  if (!approval.details) {
    return null;
  }
  // Extract file path from approval details (common patterns: "write to path", path in first line)
  const pathMatch = approval.details.match(
    /(?:^|\s)((?:[\w./-]+\/)+[\w.-]+)/,
  );
  if (pathMatch) {
    const filePath = pathMatch[1];
    switch (approval.permissionMode) {
      case 'workspace-write':
        return `Write → ${filePath}`;
      case 'danger-full-access':
        return `Full access → ${filePath}`;
      default:
        return filePath;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
//  Run status → icon
// ---------------------------------------------------------------------------

export function resolveRunStatusIcon(status: AgentRunStatus | null): IconDefinition {
  switch (status) {
    case 'running':
      return iconCatalog.play;
    case 'completed':
      return iconCatalog.checkmark;
    case 'failed':
      return iconCatalog.errorBadge;
    case 'needs-approval':
      return iconCatalog.shieldTask;
    case 'cancelled':
      return iconCatalog.dismiss;
    case 'interrupted':
      return iconCatalog.warning;
    case 'queued':
      return iconCatalog.clock;
    default:
      return iconCatalog.chat;
  }
}

// ---------------------------------------------------------------------------
//  Session attention & lifecycle resolvers
// ---------------------------------------------------------------------------

export function resolveSessionAttentionTone(attention: AgentSessionAttentionState): AppTone {
  switch (attention) {
    case 'unread':
      return 'accent';
    case 'stale-unread':
      return 'warning';
    case 'read':
    default:
      return 'neutral';
  }
}

export function resolveSessionAttentionLabel(attention: AgentSessionAttentionState) {
  switch (attention) {
    case 'unread':
      return appI18n.agentWorkbench.sessionAttention.unread;
    case 'stale-unread':
      return appI18n.agentWorkbench.sessionAttention.staleUnread;
    case 'read':
    default:
      return appI18n.agentWorkbench.sessionAttention.read;
  }
}

export function resolveSessionAttentionIcon(attention: AgentSessionAttentionState): IconDefinition {
  switch (attention) {
    case 'unread':
      return iconCatalog.chat;
    case 'stale-unread':
      return iconCatalog.clock;
    case 'read':
    default:
      return iconCatalog.checkmark;
  }
}

export function resolveSessionLifecycleLabel(lifecycle: AgentSessionLifecycleState) {
  switch (lifecycle) {
    case 'running':
      return appI18n.agentWorkbench.status.running;
    case 'idle':
    default:
      return appI18n.agentWorkbench.status.idle;
  }
}

export function resolveSessionLifecycleTone(lifecycle: AgentSessionLifecycleState): AppTone {
  switch (lifecycle) {
    case 'running':
      return 'accent';
    case 'idle':
    default:
      return 'neutral';
  }
}

// ---------------------------------------------------------------------------
//  Workspace entry → icon
// ---------------------------------------------------------------------------

export function resolveWorkspaceEntryIcon(entry: WorkspaceEntry): IconDefinition {
  return entry.kind === 'directory' ? iconCatalog.folder : iconCatalog.document;
}
