export const agentProviderApiFamilies = [
  'chat-completions',
  'responses',
] as const;
export const agentTerminalShells = ['powershell', 'cmd'] as const;
export const agentPermissionModes = [
  'read-only',
  'workspace-write',
  'danger-full-access',
] as const;
export const agentApprovalModes = ['manual', 'never'] as const;
export const agentRunStatuses = [
  'queued',
  'running',
  'needs-approval',
  'completed',
  'failed',
  'cancelled',
  'interrupted',
] as const;
export const agentPlanStepStatuses = [
  'pending',
  'in_progress',
  'completed',
] as const;
export const agentToolCallStatuses = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export const agentToolResultStatuses = [
  'success',
  'error',
  'cancelled',
] as const;
export const agentApprovalStatuses = [
  'pending',
  'approved',
  'rejected',
  'expired',
] as const;
export const agentArtifactKinds = [
  'diff',
  'file',
  'image',
  'log',
  'report',
] as const;
export const agentWorkbenchArtifactPathEnvVar =
  'OPAPP_AGENT_WORKBENCH_ARTIFACT_PATH';
export const agentWorkbenchArtifactKindEnvVar =
  'OPAPP_AGENT_WORKBENCH_ARTIFACT_KIND';
export const agentTerminalEventTypes = [
  'started',
  'stdout',
  'stderr',
  'stdin',
  'exit',
] as const;
export const agentTimelineEntryKinds = [
  'message',
  'plan',
  'tool-call',
  'tool-result',
  'approval',
  'error',
  'artifact',
  'terminal-event',
] as const;

const agentStorageIdPattern = /^[A-Za-z0-9._:-]+$/;

export type AgentProviderApiFamily =
  (typeof agentProviderApiFamilies)[number];
export type AgentTerminalShell = (typeof agentTerminalShells)[number];
export type AgentPermissionMode = (typeof agentPermissionModes)[number];
export type AgentApprovalMode = (typeof agentApprovalModes)[number];
export type AgentRunStatus = (typeof agentRunStatuses)[number];
export type AgentPlanStepStatus = (typeof agentPlanStepStatuses)[number];
export type AgentToolCallStatus = (typeof agentToolCallStatuses)[number];
export type AgentToolResultStatus = (typeof agentToolResultStatuses)[number];
export type AgentApprovalStatus = (typeof agentApprovalStatuses)[number];
export type AgentArtifactKind = (typeof agentArtifactKinds)[number];
export type AgentTerminalEventType =
  (typeof agentTerminalEventTypes)[number];
export type AgentTimelineEntryKind =
  (typeof agentTimelineEntryKinds)[number];

export type AgentRequestedArtifact = {
  kind: AgentArtifactKind;
  path: string;
  label: string;
  mimeType: string | null;
};

export type AgentMessageRole = 'system' | 'user' | 'assistant';

export type AgentProviderProfile = {
  providerId: string;
  label: string | null;
  apiFamily: AgentProviderApiFamily;
  baseUrl: string | null;
  model: string | null;
};

export type AgentWorkspaceTarget = {
  rootPath: string | null;
  displayName: string | null;
  trusted: boolean;
};

export type AgentRunSettings = {
  workspace: AgentWorkspaceTarget;
  provider: AgentProviderProfile;
  permissionMode: AgentPermissionMode;
  approvalMode: AgentApprovalMode;
};

export type AgentTerminalRunRequest = {
  command: string;
  cwd: string | null;
  shell: AgentTerminalShell | null;
  env: Record<string, string>;
};

export type AgentThreadSummary = {
  threadId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  lastRunId: string | null;
  lastRunStatus: AgentRunStatus | null;
};

export type AgentRunSummary = {
  runId: string;
  threadId: string;
  sessionId: string | null;
  goal: string;
  status: AgentRunStatus;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  resumedFromRunId: string | null;
  settings: AgentRunSettings;
  request: AgentTerminalRunRequest | null;
};

export type AgentPlanStep = {
  stepId: string;
  title: string;
  status: AgentPlanStepStatus;
};

type AgentTimelineBase = {
  entryId: string;
  runId: string;
  seq: number;
  createdAt: string;
};

export type AgentMessageTimelineEntry = AgentTimelineBase & {
  kind: 'message';
  role: AgentMessageRole;
  content: string;
};

export type AgentPlanTimelineEntry = AgentTimelineBase & {
  kind: 'plan';
  steps: AgentPlanStep[];
};

export type AgentToolCallTimelineEntry = AgentTimelineBase & {
  kind: 'tool-call';
  callId: string;
  toolName: string;
  status: AgentToolCallStatus;
  inputText: string;
};

export type AgentToolResultTimelineEntry = AgentTimelineBase & {
  kind: 'tool-result';
  callId: string;
  status: AgentToolResultStatus;
  outputText: string;
  exitCode: number | null;
};

export type AgentApprovalTimelineStatus = AgentApprovalStatus;

export type AgentApprovalTimelineEntry = AgentTimelineBase & {
  kind: 'approval';
  approvalId: string;
  status: AgentApprovalTimelineStatus;
  title: string;
  details: string | null;
  permissionMode: AgentPermissionMode | null;
};

export type AgentErrorTimelineEntry = AgentTimelineBase & {
  kind: 'error';
  code: string | null;
  message: string;
  retryable: boolean;
};

export type AgentArtifactTimelineEntry = AgentTimelineBase & {
  kind: 'artifact';
  artifactId: string;
  artifactKind: AgentArtifactKind;
  label: string;
  path: string | null;
  mimeType: string | null;
};

export type AgentTerminalTimelineEntry = AgentTimelineBase & {
  kind: 'terminal-event';
  sessionId: string;
  event: AgentTerminalEventType;
  text: string | null;
  cwd: string | null;
  command: string | null;
  exitCode: number | null;
};

export type AgentTimelineEntry =
  | AgentMessageTimelineEntry
  | AgentPlanTimelineEntry
  | AgentToolCallTimelineEntry
  | AgentToolResultTimelineEntry
  | AgentApprovalTimelineEntry
  | AgentErrorTimelineEntry
  | AgentArtifactTimelineEntry
  | AgentTerminalTimelineEntry;

export type AgentTimelineEntryRecord = AgentTimelineEntry;

export type AgentThreadIndex = {
  updatedAt: string | null;
  threads: AgentThreadSummary[];
};

export type AgentThreadDocument = {
  thread: AgentThreadSummary;
  runIds: string[];
};

export type AgentRunDocument = {
  run: AgentRunSummary;
  timeline: AgentTimelineEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readEnumValue<TValue extends string>(
  values: readonly TValue[],
  value: unknown,
): TValue | null {
  return typeof value === 'string' && values.includes(value as TValue)
    ? (value as TValue)
    : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readOptionalTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function resolveRequestedArtifactLabel(path: string) {
  const segments = path.split(/[\\/]+/).filter(Boolean);
  return segments.at(-1) ?? path;
}

export function resolveRequestedAgentArtifact(
  env: Record<string, string> | null | undefined,
): AgentRequestedArtifact | null {
  if (!env) {
    return null;
  }

  const kind = readEnumValue(agentArtifactKinds, env[agentWorkbenchArtifactKindEnvVar]);
  const path = readOptionalTrimmedString(env[agentWorkbenchArtifactPathEnvVar]);
  if (!kind || !path) {
    return null;
  }

  return {
    kind,
    path,
    label: resolveRequestedArtifactLabel(path),
    mimeType: null,
  };
}

function readRequiredStorageId(value: unknown): string | null {
  const normalized = readOptionalTrimmedString(value);
  if (!normalized || !agentStorageIdPattern.test(normalized)) {
    return null;
  }

  return normalized;
}

function readRequiredTimestamp(value: unknown): string | null {
  return readOptionalTrimmedString(value);
}

function readOptionalInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function readRequiredNonNegativeInteger(value: unknown): number | null {
  const parsed = readOptionalInteger(value);
  if (parsed === null || parsed < 0) {
    return null;
  }

  return parsed;
}

function readBoolean(value: unknown) {
  return value === true;
}

function readStringRecord(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  const record: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim();
    if (!key || typeof rawValue !== 'string') {
      continue;
    }

    record[key] = rawValue;
  }

  return record;
}

function dedupeStorageIdsInOrder(values: ReadonlyArray<string>) {
  return [...new Set(values)];
}

function parseAgentWorkspaceTarget(value: unknown): AgentWorkspaceTarget {
  const record = isRecord(value) ? value : {};

  return {
    rootPath: readOptionalTrimmedString(record.rootPath),
    displayName: readOptionalTrimmedString(record.displayName),
    trusted: readBoolean(record.trusted),
  };
}

export function createDefaultAgentProviderProfile(): AgentProviderProfile {
  return {
    providerId: 'custom-openai-compatible',
    label: null,
    apiFamily: 'chat-completions',
    baseUrl: null,
    model: null,
  };
}

function parseAgentProviderProfile(value: unknown): AgentProviderProfile {
  const defaults = createDefaultAgentProviderProfile();
  const record = isRecord(value) ? value : {};

  return {
    providerId:
      readRequiredStorageId(record.providerId) ?? defaults.providerId,
    label: readOptionalTrimmedString(record.label),
    apiFamily:
      readEnumValue(agentProviderApiFamilies, record.apiFamily) ??
      defaults.apiFamily,
    baseUrl: readOptionalTrimmedString(record.baseUrl),
    model: readOptionalTrimmedString(record.model),
  };
}

function parseAgentTerminalRunRequest(
  value: unknown,
): AgentTerminalRunRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  const command = readOptionalString(value.command)?.trim();
  if (!command) {
    return null;
  }

  return {
    command,
    cwd: readOptionalTrimmedString(value.cwd),
    shell: readEnumValue(agentTerminalShells, value.shell),
    env: readStringRecord(value.env),
  };
}

export function createDefaultAgentRunSettings(): AgentRunSettings {
  return {
    workspace: {
      rootPath: null,
      displayName: null,
      trusted: false,
    },
    provider: createDefaultAgentProviderProfile(),
    permissionMode: 'workspace-write',
    approvalMode: 'manual',
  };
}

export function parseAgentRunSettings(value: unknown): AgentRunSettings {
  const defaults = createDefaultAgentRunSettings();
  const record = isRecord(value) ? value : {};

  return {
    workspace: parseAgentWorkspaceTarget(record.workspace),
    provider: parseAgentProviderProfile(record.provider),
    permissionMode:
      readEnumValue(agentPermissionModes, record.permissionMode) ??
      defaults.permissionMode,
    approvalMode:
      readEnumValue(agentApprovalModes, record.approvalMode) ??
      defaults.approvalMode,
  };
}

export function createDefaultAgentThreadIndex(): AgentThreadIndex {
  return {
    updatedAt: null,
    threads: [],
  };
}

export function normalizeAgentStorageId(
  value: string,
  label = 'agent storage id',
) {
  const normalized = value.trim();
  if (!normalized || !agentStorageIdPattern.test(normalized)) {
    throw new Error(`${label} is invalid.`);
  }

  return normalized;
}

function parseAgentThreadSummaryRecord(value: unknown): AgentThreadSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const threadId = readRequiredStorageId(value.threadId);
  const createdAt = readRequiredTimestamp(value.createdAt);
  const updatedAt = readRequiredTimestamp(value.updatedAt);
  if (!threadId || !createdAt || !updatedAt) {
    return null;
  }

  return {
    threadId,
    title: readOptionalTrimmedString(value.title) ?? '新任务',
    createdAt,
    updatedAt,
    archivedAt: readOptionalTrimmedString(value.archivedAt),
    lastRunId: readRequiredStorageId(value.lastRunId),
    lastRunStatus: readEnumValue(agentRunStatuses, value.lastRunStatus),
  };
}

function parseAgentRunSummaryRecord(value: unknown): AgentRunSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const runId = readRequiredStorageId(value.runId);
  const threadId = readRequiredStorageId(value.threadId);
  const createdAt = readRequiredTimestamp(value.createdAt);
  const updatedAt = readRequiredTimestamp(value.updatedAt);
  const status = readEnumValue(agentRunStatuses, value.status);
  if (!runId || !threadId || !createdAt || !updatedAt || !status) {
    return null;
  }

  return {
    runId,
    threadId,
    sessionId: readRequiredStorageId(value.sessionId),
    goal: readOptionalString(value.goal) ?? '',
    status,
    createdAt,
    updatedAt,
    startedAt: readOptionalTrimmedString(value.startedAt),
    completedAt: readOptionalTrimmedString(value.completedAt),
    resumedFromRunId: readRequiredStorageId(value.resumedFromRunId),
    settings: parseAgentRunSettings(value.settings),
    request: parseAgentTerminalRunRequest(value.request),
  };
}

function parseAgentPlanStep(value: unknown): AgentPlanStep | null {
  if (!isRecord(value)) {
    return null;
  }

  const stepId = readRequiredStorageId(value.stepId);
  const status = readEnumValue(agentPlanStepStatuses, value.status);
  if (!stepId || !status) {
    return null;
  }

  return {
    stepId,
    title: readOptionalTrimmedString(value.title) ?? stepId,
    status,
  };
}

function parseAgentTimelineBase(
  value: unknown,
): (AgentTimelineBase & {kind: AgentTimelineEntryKind}) | null {
  if (!isRecord(value)) {
    return null;
  }

  const entryId = readRequiredStorageId(value.entryId);
  const runId = readRequiredStorageId(value.runId);
  const seq = readRequiredNonNegativeInteger(value.seq);
  const createdAt = readRequiredTimestamp(value.createdAt);
  const kind = readEnumValue(agentTimelineEntryKinds, value.kind);
  if (!entryId || !runId || seq === null || !createdAt || !kind) {
    return null;
  }

  return {
    entryId,
    runId,
    seq,
    createdAt,
    kind,
  };
}

function parseAgentTimelineEntry(value: unknown): AgentTimelineEntry | null {
  const base = parseAgentTimelineBase(value);
  if (!base || !isRecord(value)) {
    return null;
  }

  switch (base.kind) {
    case 'message': {
      const role = readEnumValue(
        ['system', 'user', 'assistant'] as const,
        value.role,
      );
      if (!role || typeof value.content !== 'string') {
        return null;
      }

      return {
        ...base,
        kind: 'message',
        role,
        content: value.content,
      };
    }
    case 'plan': {
      const steps = Array.isArray(value.steps)
        ? value.steps
            .map(parseAgentPlanStep)
            .filter((step): step is AgentPlanStep => step !== null)
        : [];
      if (steps.length === 0) {
        return null;
      }

      return {
        ...base,
        kind: 'plan',
        steps,
      };
    }
    case 'tool-call': {
      const callId = readRequiredStorageId(value.callId);
      const toolName = readOptionalTrimmedString(value.toolName);
      const status = readEnumValue(agentToolCallStatuses, value.status);
      if (!callId || !toolName || !status || typeof value.inputText !== 'string') {
        return null;
      }

      return {
        ...base,
        kind: 'tool-call',
        callId,
        toolName,
        status,
        inputText: value.inputText,
      };
    }
    case 'tool-result': {
      const callId = readRequiredStorageId(value.callId);
      const status = readEnumValue(agentToolResultStatuses, value.status);
      if (!callId || !status || typeof value.outputText !== 'string') {
        return null;
      }

      return {
        ...base,
        kind: 'tool-result',
        callId,
        status,
        outputText: value.outputText,
        exitCode: readOptionalInteger(value.exitCode),
      };
    }
    case 'approval': {
      const approvalId = readRequiredStorageId(value.approvalId);
      const status = readEnumValue(agentApprovalStatuses, value.status);
      const title = readOptionalTrimmedString(value.title);
      if (!approvalId || !status || !title) {
        return null;
      }

      return {
        ...base,
        kind: 'approval',
        approvalId,
        status,
        title,
        details: readOptionalString(value.details),
        permissionMode: readEnumValue(agentPermissionModes, value.permissionMode),
      };
    }
    case 'error': {
      if (typeof value.message !== 'string') {
        return null;
      }

      return {
        ...base,
        kind: 'error',
        code: readOptionalTrimmedString(value.code),
        message: value.message,
        retryable: readBoolean(value.retryable),
      };
    }
    case 'artifact': {
      const artifactId = readRequiredStorageId(value.artifactId);
      const artifactKind = readEnumValue(agentArtifactKinds, value.artifactKind);
      const label = readOptionalTrimmedString(value.label);
      if (!artifactId || !artifactKind || !label) {
        return null;
      }

      return {
        ...base,
        kind: 'artifact',
        artifactId,
        artifactKind,
        label,
        path: readOptionalTrimmedString(value.path),
        mimeType: readOptionalTrimmedString(value.mimeType),
      };
    }
    case 'terminal-event': {
      const sessionId = readRequiredStorageId(value.sessionId);
      const event = readEnumValue(agentTerminalEventTypes, value.event);
      if (!sessionId || !event) {
        return null;
      }

      return {
        ...base,
        kind: 'terminal-event',
        sessionId,
        event,
        text: readOptionalString(value.text),
        cwd: readOptionalTrimmedString(value.cwd),
        command: readOptionalString(value.command),
        exitCode: readOptionalInteger(value.exitCode),
      };
    }
    default:
      return null;
  }
}

function sortThreads(left: AgentThreadSummary, right: AgentThreadSummary) {
  if (left.updatedAt === right.updatedAt) {
    return left.threadId.localeCompare(right.threadId);
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function sortTimeline(left: AgentTimelineEntry, right: AgentTimelineEntry) {
  if (left.seq === right.seq) {
    if (left.createdAt === right.createdAt) {
      return left.entryId.localeCompare(right.entryId);
    }

    return left.createdAt.localeCompare(right.createdAt);
  }

  return left.seq - right.seq;
}

function parseJsonRecord(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parsePersistedAgentThreadIndex(
  raw: string,
): AgentThreadIndex | null {
  const record = parseJsonRecord(raw);
  if (!record) {
    return null;
  }

  const threads = Array.isArray(record.threads)
    ? record.threads
        .map(parseAgentThreadSummaryRecord)
        .filter((thread): thread is AgentThreadSummary => thread !== null)
    : [];

  const dedupedThreads = new Map<string, AgentThreadSummary>();
  for (const thread of threads) {
    dedupedThreads.set(thread.threadId, thread);
  }

  return {
    updatedAt: readOptionalTrimmedString(record.updatedAt),
    threads: [...dedupedThreads.values()].sort(sortThreads),
  };
}

export function serializePersistedAgentThreadIndex(index: AgentThreadIndex) {
  return JSON.stringify(index);
}

export function parsePersistedAgentThreadDocument(
  raw: string,
): AgentThreadDocument | null {
  const record = parseJsonRecord(raw);
  if (!record) {
    return null;
  }

  const thread = parseAgentThreadSummaryRecord(record.thread);
  if (!thread) {
    return null;
  }

  const runIds = Array.isArray(record.runIds)
    ? record.runIds
        .map(readRequiredStorageId)
        .filter((runId): runId is string => runId !== null)
    : [];

  return {
    thread,
    runIds: dedupeStorageIdsInOrder(runIds),
  };
}

export function serializePersistedAgentThreadDocument(
  document: AgentThreadDocument,
) {
  return JSON.stringify(document);
}

export function parsePersistedAgentRunDocument(
  raw: string,
): AgentRunDocument | null {
  const record = parseJsonRecord(raw);
  if (!record) {
    return null;
  }

  const run = parseAgentRunSummaryRecord(record.run);
  if (!run) {
    return null;
  }

  const timeline = Array.isArray(record.timeline)
    ? record.timeline
        .map(parseAgentTimelineEntry)
        .filter((entry): entry is AgentTimelineEntry => entry !== null)
        .filter(entry => entry.runId === run.runId)
        .sort(sortTimeline)
    : [];

  return {
    run,
    timeline,
  };
}

export function serializePersistedAgentRunDocument(document: AgentRunDocument) {
  return JSON.stringify(document);
}
