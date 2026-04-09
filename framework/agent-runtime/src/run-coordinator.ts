import {
  createDefaultAgentProviderProfile,
  createDefaultAgentRunSettings,
  createDefaultAgentThreadIndex,
  normalizeAgentStorageId,
  parsePersistedAgentRunDocument,
  parsePersistedAgentApprovalRulesDocument,
  parsePersistedAgentLlmProviderConfig,
  parsePersistedAgentThreadDocument,
  parsePersistedAgentThreadIndex,
  serializePersistedAgentRunDocument,
  serializePersistedAgentApprovalRulesDocument,
  serializePersistedAgentThreadDocument,
  serializePersistedAgentThreadIndex,
  type AgentApprovalDecisionMode,
  type AgentApprovalMode,
  type AgentApprovalRule,
  type AgentApprovalRulesDocument,
  type AgentApprovalTimelineEntry,
  type AgentArtifactTimelineEntry,
  type AgentErrorTimelineEntry,
  type AgentLlmProviderConfig,
  type AgentMessageTimelineEntry,
  type AgentPermissionMode,
  type AgentPlanTimelineEntry,
  type AgentProviderProfile,
  type AgentRunDocument,
  type AgentRunSettings,
  type AgentRunStatus,
  type AgentRunSummary,
  type AgentTerminalRunRequest,
  type AgentThreadSummary,
  type AgentToolCallTimelineEntry,
  type AgentToolResultTimelineEntry,
  type AgentWorkspaceTarget,
  resolveRequestedAgentArtifact,
} from './model';
import {
  agentApprovalRulesPath,
  agentLlmProviderConfigPath,
  agentThreadIndexPath,
  buildAgentRunDocumentPath,
  buildAgentThreadDocumentPath,
} from './storage';
import {
  createAgentTerminalTimelineEntry,
  type AgentTerminalSessionEvent,
  type AgentTerminalSessionHandle,
  type OpenAgentTerminalSessionOptions,
} from './terminal-core';
import {
  requestOpenAiCompatibleAgentTurn,
  type OpenAiCompatibleAgentSseRequest,
  type OpenAiCompatibleAgentTurnResult,
} from './openai-compatible-chat';

const approvalRejectedToolResultOutput = '用户手动拒绝';
const defaultAgentWorkbenchSystemPrompt = [
  '你是 OPApp Agent Workbench 的模型层。',
  '你可以使用 shell_command 工具。',
  '当用户消息明确给出 command / cwd / shell / env 提示时，必须先发起一次 shell_command 工具调用，并且严格使用提示里的参数，不要改写命令。',
  '收到 shell_command 的 tool result 后，再用简体中文输出一小段收尾消息。',
  '如果 tool result 说明“用户手动拒绝”，要明确说明命令没有执行，并引用拒绝原因。',
].join('\n');
const defaultRejectedDecisionReason = '用户手动拒绝';

type AgentRuntimeUserFileReader = (
  relativePath: string,
) => Promise<string | null>;
type AgentRuntimeUserFileWriter = (
  relativePath: string,
  content: string,
) => Promise<boolean>;
type TrustedWorkspaceTarget = {
  rootPath: string;
  displayName: string | null;
  trusted: boolean;
};

export type OpenPersistedAgentTerminalRunOptions =
  OpenAgentTerminalSessionOptions & {
    threadId?: string | null;
    title?: string | null;
    goal?: string | null;
    permissionMode?: AgentPermissionMode | null;
    approvalMode?: AgentApprovalMode | null;
    provider?: AgentProviderProfile | null;
    requiresApproval?: boolean | null;
    approvalTitle?: string | null;
    approvalDetails?: string | null;
  };

export type ApprovePersistedAgentTerminalRunOptions = {
  runId: string;
  approvalId?: string | null;
  decisionMode?: 'once' | 'prefix-rule';
};

export type RejectPersistedAgentTerminalRunOptions = {
  runId: string;
  approvalId?: string | null;
  reason?: string | null;
};

export type ReconcileInterruptedAgentRunsResult = {
  interruptedRunIds: string[];
};

export type ReconcileRequestedAgentRunArtifactsResult = {
  reconciledRunIds: string[];
};

export type PersistedAgentTerminalRunHandle = {
  threadId: string;
  runId: string;
  readonly sessionId: string | null;
  whenSettled: Promise<AgentRunDocument>;
  getSnapshot(): AgentRunDocument;
  cancel(): Promise<void>;
  sendInput(text: string): Promise<void>;
};

type PersistedRunState = {
  runDocument: AgentRunDocument;
  thread: AgentThreadSummary;
  runIds: string[];
};

type RunSettlementListener = (document: AgentRunDocument) => void;

let persistenceQueue = Promise.resolve();

function enqueuePersistenceTask(task: () => Promise<void>) {
  const queuedTask = persistenceQueue.then(task);
  persistenceQueue = queuedTask.catch(() => {});
  return queuedTask;
}

function sortThreadSummaries(
  left: AgentThreadSummary,
  right: AgentThreadSummary,
) {
  if (left.updatedAt === right.updatedAt) {
    return left.threadId.localeCompare(right.threadId);
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function createStorageId(prefix: string) {
  return normalizeAgentStorageId(
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    `${prefix} id`,
  );
}

function cloneRunDocument(document: AgentRunDocument) {
  return (
    parsePersistedAgentRunDocument(
      serializePersistedAgentRunDocument(document),
    ) ?? document
  );
}

function formatGoal({
  command,
  cwd,
  goal,
}: {
  command: string;
  cwd?: string | null;
  goal?: string | null;
}) {
  const normalizedGoal = goal?.trim();
  if (normalizedGoal) {
    return normalizedGoal;
  }

  const normalizedCwd = cwd?.trim();
  return normalizedCwd ? `${command.trim()} (${normalizedCwd})` : command.trim();
}

function formatThreadTitle({
  title,
  goal,
  command,
}: {
  title?: string | null;
  goal: string;
  command: string;
}) {
  const normalizedTitle = title?.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const candidate = goal.trim() || command.trim() || '新任务';
  return candidate.length <= 72 ? candidate : `${candidate.slice(0, 69)}...`;
}

function createWorkspaceTarget(
  workspaceTarget: TrustedWorkspaceTarget | null,
): AgentWorkspaceTarget {
  if (!workspaceTarget) {
    return {
      rootPath: null,
      displayName: null,
      trusted: false,
    };
  }

  return {
    rootPath: workspaceTarget.rootPath,
    displayName: workspaceTarget.displayName,
    trusted: workspaceTarget.trusted,
  };
}

function resolveRunSettings({
  workspaceTarget,
  provider,
  permissionMode,
  approvalMode,
}: {
  workspaceTarget: TrustedWorkspaceTarget | null;
  provider?: AgentProviderProfile | null;
  permissionMode?: AgentPermissionMode | null;
  approvalMode?: AgentApprovalMode | null;
}): AgentRunSettings {
  const defaults = createDefaultAgentRunSettings();

  return {
    workspace: createWorkspaceTarget(workspaceTarget),
    provider: provider ?? defaults.provider,
    permissionMode: permissionMode ?? defaults.permissionMode,
    approvalMode: approvalMode ?? defaults.approvalMode,
  };
}

function createProviderProfileFromConfig(
  providerConfig: AgentLlmProviderConfig | null,
) {
  if (!providerConfig) {
    return null;
  }

  return {
    providerId:
      providerConfig.providerId ||
      createDefaultAgentProviderProfile().providerId,
    label: providerConfig.label,
    apiFamily: providerConfig.apiFamily,
    baseUrl: providerConfig.baseUrl,
    model: providerConfig.model,
  };
}

async function loadAgentLlmProviderConfig(
  readUserFile: AgentRuntimeUserFileReader,
): Promise<AgentLlmProviderConfig | null> {
  const raw = await readUserFile(agentLlmProviderConfigPath);
  return raw ? parsePersistedAgentLlmProviderConfig(raw) : null;
}

async function loadApprovalRulesDocument(
  readUserFile: AgentRuntimeUserFileReader,
): Promise<AgentApprovalRulesDocument> {
  const raw = await readUserFile(agentApprovalRulesPath);
  return (
    (raw ? parsePersistedAgentApprovalRulesDocument(raw) : null) ?? {
      updatedAt: null,
      rules: [],
    }
  );
}

function normalizeApprovalCommandPrefix(command: string) {
  return command.trim().replace(/\s+/g, ' ').toLowerCase();
}

function findMatchingApprovalRule({
  rules,
  request,
  permissionMode,
}: {
  rules: ReadonlyArray<AgentApprovalRule>;
  request: AgentTerminalRunRequest;
  permissionMode: AgentPermissionMode;
}) {
  const requestPrefix = normalizeApprovalCommandPrefix(request.command);
  const requestCwd = request.cwd?.trim() || null;

  return (
    rules.find(
      rule =>
        rule.permissionMode === permissionMode &&
        (rule.cwd?.trim() || null) === requestCwd &&
        rule.commandPrefix === requestPrefix,
    ) ?? null
  );
}

function normalizeRunRequest(
  options: OpenAgentTerminalSessionOptions,
): AgentTerminalRunRequest {
  const command = options.command.trim();
  if (!command) {
    throw new Error('Persisted agent terminal command is required.');
  }

  const env: Record<string, string> = {};
  if (options.env) {
    for (const [rawKey, rawValue] of Object.entries(options.env)) {
      const key = rawKey.trim();
      if (!key || typeof rawValue !== 'string') {
        continue;
      }

      env[key] = rawValue;
    }
  }

  return {
    command,
    cwd: typeof options.cwd === 'string' ? options.cwd.trim() || null : null,
    shell: options.shell ?? null,
    env,
  };
}

function buildThreadDocument({
  thread,
  runIds,
}: {
  thread: AgentThreadSummary;
  runIds: ReadonlyArray<string>;
}) {
  return {
    thread,
    runIds: [...new Set(runIds)],
  };
}

function createInitialRunDocument({
  threadId,
  runId,
  goal,
  settings,
  request,
  createdAt,
  resumedFromRunId = null,
  status,
}: {
  threadId: string;
  runId: string;
  goal: string;
  settings: AgentRunSettings;
  request: AgentTerminalRunRequest;
  createdAt: string;
  resumedFromRunId?: string | null;
  status: AgentRunStatus;
}): AgentRunDocument {
  const run: AgentRunSummary = {
    runId,
    threadId,
    sessionId: null,
    goal,
    status,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    completedAt: null,
    resumedFromRunId,
    settings,
    request,
  };

  return {
    run,
    timeline: [],
  };
}

function createThreadSummary({
  threadId,
  runId,
  title,
  createdAt,
  lastRunStatus = 'queued',
}: {
  threadId: string;
  runId: string;
  title: string;
  createdAt: string;
  lastRunStatus?: AgentRunStatus;
}) {
  return {
    threadId,
    title,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
    lastRunId: runId,
    lastRunStatus,
    attention: 'unread' as const,
    lastReadAt: null,
    lastAttentionAt: createdAt,
  };
}

function createErrorTimelineEntry({
  entryId,
  runId,
  seq,
  createdAt,
  code,
  message,
}: {
  entryId: string;
  runId: string;
  seq: number;
  createdAt: string;
  code?: string | null;
  message: string;
}): AgentErrorTimelineEntry {
  return {
    entryId,
    runId,
    seq,
    kind: 'error',
    createdAt,
    code: code?.trim() || null,
    message,
    retryable: false,
  };
}

function createApprovalTimelineEntry({
  entryId,
  runId,
  seq,
  createdAt,
  approvalId,
  title,
  details,
  permissionMode,
  requestReason,
  commandText,
  requestedCwd,
  decisionMode = null,
  decisionNote = null,
  matchedRuleId = null,
  status = 'pending',
}: {
  entryId: string;
  runId: string;
  seq: number;
  createdAt: string;
  approvalId: string;
  title: string;
  details?: string | null;
  permissionMode?: AgentPermissionMode | null;
  requestReason?: string | null;
  commandText?: string | null;
  requestedCwd?: string | null;
  decisionMode?: AgentApprovalDecisionMode | null;
  decisionNote?: string | null;
  matchedRuleId?: string | null;
  status?: AgentApprovalTimelineEntry['status'];
}): AgentApprovalTimelineEntry {
  return {
    entryId,
    runId,
    seq,
    kind: 'approval',
    createdAt,
    approvalId,
    status,
    title,
    details: details?.trim() || null,
    permissionMode: permissionMode ?? null,
    requestReason: requestReason?.trim() || title,
    commandText: commandText ?? null,
    requestedCwd: requestedCwd?.trim() || null,
    decisionMode,
    decisionNote: decisionNote ?? null,
    matchedRuleId: matchedRuleId?.trim() || null,
  };
}

function createArtifactTimelineEntry({
  entryId,
  artifactId,
  runId,
  seq,
  createdAt,
  artifact,
}: {
  entryId: string;
  artifactId: string;
  runId: string;
  seq: number;
  createdAt: string;
  artifact: {
    kind: AgentArtifactTimelineEntry['artifactKind'];
    path: string;
    label: string;
    mimeType: string | null;
  };
}): AgentArtifactTimelineEntry {
  return {
    entryId,
    runId,
    seq,
    kind: 'artifact',
    artifactId,
    artifactKind: artifact.kind,
    label: artifact.label,
    path: artifact.path,
    mimeType: artifact.mimeType,
    createdAt,
  };
}

function buildStructuredTimelineEntryId(runId: string, suffix: string) {
  return `${runId}:${suffix}`;
}

function buildStructuredToolCallId(runId: string) {
  return `${runId}:shell-command`;
}

function createMessageTimelineEntry({
  entryId,
  runId,
  seq,
  createdAt,
  role,
  content,
}: {
  entryId?: string;
  runId: string;
  seq: number;
  createdAt: string;
  role: AgentMessageTimelineEntry['role'];
  content: string;
}): AgentMessageTimelineEntry {
  return {
    entryId: entryId ?? buildStructuredTimelineEntryId(runId, 'message'),
    runId,
    seq,
    kind: 'message',
    createdAt,
    role,
    content,
  };
}

function createPlanTimelineEntry({
  runId,
  seq,
  createdAt,
  title,
  status,
}: {
  runId: string;
  seq: number;
  createdAt: string;
  title: string;
  status: AgentPlanTimelineEntry['steps'][number]['status'];
}): AgentPlanTimelineEntry {
  return {
    entryId: buildStructuredTimelineEntryId(runId, 'plan'),
    runId,
    seq,
    kind: 'plan',
    createdAt,
    steps: [
      {
        stepId: buildStructuredTimelineEntryId(runId, 'plan-step'),
        title,
        status,
      },
    ],
  };
}

function createToolCallTimelineEntry({
  runId,
  seq,
  createdAt,
  inputText,
  status,
}: {
  runId: string;
  seq: number;
  createdAt: string;
  inputText: string;
  status: AgentToolCallTimelineEntry['status'];
}): AgentToolCallTimelineEntry {
  return {
    entryId: buildStructuredTimelineEntryId(runId, 'tool-call'),
    runId,
    seq,
    kind: 'tool-call',
    callId: buildStructuredToolCallId(runId),
    toolName: 'shell_command',
    status,
    inputText,
    createdAt,
  };
}

function createToolResultTimelineEntry({
  runId,
  seq,
  createdAt,
  outputText,
  status,
  exitCode,
}: {
  runId: string;
  seq: number;
  createdAt: string;
  outputText: string;
  status: AgentToolResultTimelineEntry['status'];
  exitCode: number | null;
}): AgentToolResultTimelineEntry {
  return {
    entryId: buildStructuredTimelineEntryId(runId, 'tool-result'),
    runId,
    seq,
    kind: 'tool-result',
    callId: buildStructuredToolCallId(runId),
    status,
    outputText,
    exitCode,
    createdAt,
  };
}

function findStructuredPlanEntry(document: AgentRunDocument) {
  const entryId = buildStructuredTimelineEntryId(document.run.runId, 'plan');
  return document.timeline.find(
    (entry): entry is AgentPlanTimelineEntry =>
      entry.kind === 'plan' && entry.entryId === entryId,
  );
}

function findStructuredToolCallEntry(document: AgentRunDocument) {
  const callId = buildStructuredToolCallId(document.run.runId);
  return document.timeline.find(
    (entry): entry is AgentToolCallTimelineEntry =>
      entry.kind === 'tool-call' && entry.callId === callId,
  );
}

function hasStructuredToolResultEntry(document: AgentRunDocument) {
  return findStructuredToolResultEntry(document) !== null;
}

function findStructuredToolResultEntry(document: AgentRunDocument) {
  const callId = buildStructuredToolCallId(document.run.runId);
  return (
    document.timeline.find(
      (entry): entry is AgentToolResultTimelineEntry =>
        entry.kind === 'tool-result' && entry.callId === callId,
    ) ?? null
  );
}

function updateStructuredPlanStatus(
  document: AgentRunDocument,
  status: AgentPlanTimelineEntry['steps'][number]['status'],
) {
  const planEntry = findStructuredPlanEntry(document);
  const firstStep = planEntry?.steps[0];
  if (!planEntry || !firstStep || firstStep.status === status) {
    return;
  }

  planEntry.steps[0] = {
    ...firstStep,
    status,
  };
}

function updateStructuredToolCallStatus(
  document: AgentRunDocument,
  status: AgentToolCallTimelineEntry['status'],
) {
  const toolCallEntry = findStructuredToolCallEntry(document);
  if (!toolCallEntry || toolCallEntry.status === status) {
    return;
  }

  toolCallEntry.status = status;
}

function createStructuredTimelineSeed({
  runDocument,
  createdAt,
  requiresApproval,
}: {
  runDocument: AgentRunDocument;
  createdAt: string;
  requiresApproval: boolean;
}) {
  const goal = runDocument.run.goal.trim();
  const inputText = runDocument.run.request?.command ?? goal;

  runDocument.timeline.push(
    createMessageTimelineEntry({
      entryId: buildStructuredTimelineEntryId(runDocument.run.runId, 'message'),
      runId: runDocument.run.runId,
      seq: 0,
      createdAt,
      role: 'user',
      content: goal,
    }),
  );
  runDocument.timeline.push(
    createPlanTimelineEntry({
      runId: runDocument.run.runId,
      seq: 1,
      createdAt,
      title: goal,
      status: requiresApproval ? 'pending' : 'in_progress',
    }),
  );
  runDocument.timeline.push(
    createToolCallTimelineEntry({
      runId: runDocument.run.runId,
      seq: 2,
      createdAt,
      inputText,
      status: 'queued',
    }),
  );
}

function formatStructuredToolCommand(command: string) {
  const normalized = command.trim();
  if (!normalized) {
    return '';
  }

  const statements = normalized
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
  if (statements.length <= 1) {
    return `$ ${normalized}\n`;
  }

  return `${statements.map(statement => `$ ${statement}`).join('\n')}\n`;
}

function buildStructuredToolResultOutput(document: AgentRunDocument) {
  const terminalEntries = document.timeline.filter(
    entry => entry.kind === 'terminal-event',
  );
  const output: string[] = [];

  if (
    terminalEntries.length > 0 &&
    !terminalEntries.some(entry => entry.event === 'started')
  ) {
    const fallbackCommand =
      terminalEntries.find(
        entry => typeof entry.command === 'string' && entry.command.trim(),
      )?.command ??
      document.run.request?.command ??
      document.run.goal;

    if (fallbackCommand.trim()) {
      output.push(formatStructuredToolCommand(fallbackCommand));
    }
  }

  for (const entry of terminalEntries) {
    switch (entry.event) {
      case 'started':
        output.push(formatStructuredToolCommand(entry.command ?? document.run.goal));
        break;
      case 'stdout':
        output.push(entry.text ?? '');
        break;
      case 'stderr':
        if (entry.text) {
          output.push(`[stderr] ${entry.text}`);
        }
        break;
      case 'stdin':
        if (entry.text) {
          output.push(`> ${entry.text}`);
        }
        break;
      case 'exit':
        output.push(`\n[exit ${entry.exitCode ?? 'unknown'}]\n`);
        break;
      default:
        break;
    }
  }

  return output.join('');
}

function buildAgentWorkbenchSystemPrompt(
  providerConfig: AgentLlmProviderConfig,
) {
  const customPrompt = providerConfig.systemPrompt.trim();
  return customPrompt
    ? `${defaultAgentWorkbenchSystemPrompt}\n\n${customPrompt}`
    : defaultAgentWorkbenchSystemPrompt;
}

function serializeToolRequestArguments(request: AgentTerminalRunRequest) {
  return JSON.stringify({
    command: request.command,
    cwd: request.cwd,
    shell: request.shell,
    env: request.env,
  });
}

function buildAgentWorkbenchInitialMessages({
  providerConfig,
  goal,
  request,
}: {
  providerConfig: AgentLlmProviderConfig;
  goal: string;
  request: AgentTerminalRunRequest;
}) {
  return [
    {
      role: 'system' as const,
      content: buildAgentWorkbenchSystemPrompt(providerConfig),
    },
    {
      role: 'user' as const,
      content: [
        `任务目标：${goal}`,
        '',
        '请先调用一次 shell_command 工具，并且严格使用下面这些参数，不要改写命令：',
        serializeToolRequestArguments(request),
      ].join('\n'),
    },
  ];
}

function buildAgentWorkbenchContinuationMessages({
  providerConfig,
  runDocument,
  toolResultOutput,
}: {
  providerConfig: AgentLlmProviderConfig;
  runDocument: AgentRunDocument;
  toolResultOutput: string;
}) {
  const request = runDocument.run.request;
  if (!request) {
    throw new Error('Persisted agent run is missing its terminal request.');
  }

  const callId = buildStructuredToolCallId(runDocument.run.runId);
  return [
    ...buildAgentWorkbenchInitialMessages({
      providerConfig,
      goal: runDocument.run.goal,
      request,
    }),
    {
      role: 'assistant' as const,
      content: null,
      toolCalls: [
        {
          id: callId,
          name: 'shell_command',
          argumentsText: serializeToolRequestArguments(request),
        },
      ],
    },
    {
      role: 'tool' as const,
      toolCallId: callId,
      content: toolResultOutput,
    },
  ];
}

function resolveShellToolRequestFromTurnResult({
  turnResult,
  fallbackRequest,
}: {
  turnResult: OpenAiCompatibleAgentTurnResult;
  fallbackRequest: AgentTerminalRunRequest;
}) {
  const shellToolCall =
    turnResult.toolCalls.find(
      toolCall => toolCall.name === 'shell_command' && toolCall.request,
    ) ?? null;
  if (!shellToolCall?.request) {
    throw new Error('Agent model did not return a valid shell_command tool call.');
  }

  return {
    callId: shellToolCall.callId,
    request: {
      ...fallbackRequest,
      ...shellToolCall.request,
      env:
        Object.keys(shellToolCall.request.env).length > 0
          ? shellToolCall.request.env
          : fallbackRequest.env,
    },
  };
}

function resolveExitStatus({
  exitCode,
  cancelRequested,
}: {
  exitCode: number | null;
  cancelRequested: boolean;
}): AgentRunStatus {
  if (cancelRequested) {
    return 'cancelled';
  }

  return exitCode === 0 ? 'completed' : 'failed';
}

function mergeRunIds(runIds: ReadonlyArray<string>, runId: string) {
  return [...new Set([...runIds, runId])];
}

function markThreadAttention(
  thread: AgentThreadSummary,
  timestamp: string,
) {
  thread.attention = 'unread';
  thread.lastAttentionAt = timestamp;
}

function findPendingApprovalEntry(
  document: AgentRunDocument,
  approvalId?: string | null,
) {
  for (let index = document.timeline.length - 1; index >= 0; index -= 1) {
    const entry = document.timeline[index];
    if (
      entry.kind === 'approval' &&
      entry.status === 'pending' &&
      (!approvalId || entry.approvalId === approvalId)
    ) {
      return entry;
    }
  }

  return null;
}

async function loadThreadIndex(
  readUserFile: AgentRuntimeUserFileReader,
) {
  const raw = await readUserFile(agentThreadIndexPath);
  return raw
    ? parsePersistedAgentThreadIndex(raw) ?? createDefaultAgentThreadIndex()
    : createDefaultAgentThreadIndex();
}

export function createPersistedAgentTerminalRuntime({
  readUserFile = async relativePath => {
    const {readUserFile: readUserFileFromFilesystem} = await import(
      '@opapp/framework-filesystem'
    );
    return readUserFileFromFilesystem(relativePath);
  },
  writeUserFile = async (relativePath, content) => {
    const {writeUserFile: writeUserFileFromFilesystem} = await import(
      '@opapp/framework-filesystem'
    );
    return writeUserFileFromFilesystem(relativePath, content);
  },
  getTrustedWorkspaceTarget = async () => {
    const {getTrustedWorkspaceTarget: getTrustedWorkspaceTargetFromFilesystem} =
      await import('@opapp/framework-filesystem');
    return getTrustedWorkspaceTargetFromFilesystem();
  },
  openAgentTerminalSession = async (
    options: OpenAgentTerminalSessionOptions,
    listener?: {
      onEvent?: (event: AgentTerminalSessionEvent) => void;
      onError?: (error: Error & {code?: string}) => void;
    },
  ) => {
    const {openAgentTerminalSession: openNativeAgentTerminalSession} =
      await import('./terminal');
    return openNativeAgentTerminalSession(options, listener);
  },
  openSseRequestImpl,
  now = () => new Date().toISOString(),
  createId = createStorageId,
}: {
  readUserFile?: AgentRuntimeUserFileReader;
  writeUserFile?: AgentRuntimeUserFileWriter;
  getTrustedWorkspaceTarget?: () => Promise<TrustedWorkspaceTarget | null>;
  openAgentTerminalSession?: (
    options: OpenAgentTerminalSessionOptions,
    listener?: {
      onEvent?: (event: AgentTerminalSessionEvent) => void;
      onError?: (error: Error & {code?: string}) => void;
    },
  ) => Promise<AgentTerminalSessionHandle>;
  openSseRequestImpl?: OpenAiCompatibleAgentSseRequest;
  now?: () => string;
  createId?: (prefix: string) => string;
}) {
  const settlementListeners = new Map<string, Set<RunSettlementListener>>();

  function createWhenSettledPromise(runId: string) {
    return new Promise<AgentRunDocument>(resolve => {
      const listeners = settlementListeners.get(runId) ?? new Set();
      listeners.add(resolve);
      settlementListeners.set(runId, listeners);
    });
  }

  function resolveSettlement(runId: string, document: AgentRunDocument) {
    const listeners = settlementListeners.get(runId);
    if (!listeners || listeners.size === 0) {
      return;
    }

    settlementListeners.delete(runId);
    const snapshot = cloneRunDocument(document);
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  async function persistUserFile(relativePath: string, content: string) {
    const persisted = await writeUserFile(relativePath, content);
    if (!persisted) {
      throw new Error(`Failed to persist ${relativePath}.`);
    }
  }

  async function persistApprovalRulesDocument(
    document: AgentApprovalRulesDocument,
  ) {
    await persistUserFile(
      agentApprovalRulesPath,
      serializePersistedAgentApprovalRulesDocument(document),
    );
  }

  async function resolveRuntimeProviderConfig(
    providerOverride?: AgentProviderProfile | null,
  ): Promise<AgentLlmProviderConfig | null> {
    const persistedProviderConfig = await loadAgentLlmProviderConfig(readUserFile);
    if (!persistedProviderConfig) {
      return null;
    }

    return {
      ...persistedProviderConfig,
      providerId:
        providerOverride?.providerId?.trim() || persistedProviderConfig.providerId,
      label: providerOverride?.label ?? persistedProviderConfig.label,
      apiFamily:
        providerOverride?.apiFamily ?? persistedProviderConfig.apiFamily,
      baseUrl:
        providerOverride?.baseUrl?.trim() || persistedProviderConfig.baseUrl,
      model: providerOverride?.model?.trim() || persistedProviderConfig.model,
    };
  }

  async function requestInitialLlmShellToolCall({
    providerConfig,
    goal,
    request,
  }: {
    providerConfig: AgentLlmProviderConfig;
    goal: string;
    request: AgentTerminalRunRequest;
  }) {
    const turnResult = await requestOpenAiCompatibleAgentTurn({
      provider: providerConfig,
      messages: buildAgentWorkbenchInitialMessages({
        providerConfig,
        goal,
        request,
      }),
      allowToolCalls: true,
      openSseRequestImpl,
    });

    return resolveShellToolRequestFromTurnResult({
      turnResult,
      fallbackRequest: request,
    }).request;
  }

  async function appendLlmContinuationMessage({
    runDocument,
    thread,
    providerConfig,
    toolResultOutput,
    createdAt,
  }: {
    runDocument: AgentRunDocument;
    thread: AgentThreadSummary;
    providerConfig: AgentLlmProviderConfig | null;
    toolResultOutput: string;
    createdAt: string;
  }) {
    if (!providerConfig) {
      return;
    }

    const turnResult = await requestOpenAiCompatibleAgentTurn({
      provider: providerConfig,
      messages: buildAgentWorkbenchContinuationMessages({
        providerConfig,
        runDocument,
        toolResultOutput,
      }),
      allowToolCalls: false,
      openSseRequestImpl,
    });
    const assistantText = turnResult.assistantText.trim();
    if (!assistantText) {
      return;
    }

    const nextSeq =
      runDocument.timeline.reduce(
        (maxSeq, entry) => Math.max(maxSeq, entry.seq),
        -1,
      ) + 1;
    runDocument.timeline.push(
      createMessageTimelineEntry({
        entryId: createId('entry'),
        runId: runDocument.run.runId,
        seq: nextSeq,
        createdAt,
        role: 'assistant',
        content: assistantText,
      }),
    );
    runDocument.run.updatedAt = createdAt;
    thread.updatedAt = createdAt;
    thread.lastRunStatus = runDocument.run.status;
    thread.lastRunId = runDocument.run.runId;
    markThreadAttention(thread, createdAt);
  }

  async function persistRunState({
    runDocument,
    thread,
    runIds,
    includeThreadState = true,
  }: {
    runDocument: AgentRunDocument;
    thread: AgentThreadSummary;
    runIds: ReadonlyArray<string>;
    includeThreadState?: boolean;
  }) {
    await persistUserFile(
      buildAgentRunDocumentPath(runDocument.run.runId),
      serializePersistedAgentRunDocument(runDocument),
    );

    if (!includeThreadState) {
      return;
    }

    await persistUserFile(
      buildAgentThreadDocumentPath(thread.threadId),
      serializePersistedAgentThreadDocument(
        buildThreadDocument({
          thread,
          runIds,
        }),
      ),
    );

    const index = await loadThreadIndex(readUserFile);
    const threads = [
      ...index.threads.filter(existing => existing.threadId !== thread.threadId),
      {...thread},
    ].sort(sortThreadSummaries);

    await persistUserFile(
      agentThreadIndexPath,
      serializePersistedAgentThreadIndex({
        updatedAt: thread.updatedAt,
        threads,
      }),
    );
  }

  async function loadPersistedRunState(runId: string): Promise<PersistedRunState> {
    const normalizedRunId = normalizeAgentStorageId(runId, 'run id');
    const rawRunDocument = await readUserFile(
      buildAgentRunDocumentPath(normalizedRunId),
    );
    const runDocument = rawRunDocument
      ? parsePersistedAgentRunDocument(rawRunDocument)
      : null;
    if (!runDocument) {
      throw new Error(`Persisted agent run ${normalizedRunId} was not found.`);
    }

    const rawThreadDocument = await readUserFile(
      buildAgentThreadDocumentPath(runDocument.run.threadId),
    );
    const threadDocument = rawThreadDocument
      ? parsePersistedAgentThreadDocument(rawThreadDocument)
      : null;

    if (threadDocument) {
      return {
        runDocument,
        thread: {
          ...threadDocument.thread,
          updatedAt: runDocument.run.updatedAt,
          lastRunId: runDocument.run.runId,
          lastRunStatus: runDocument.run.status,
        },
        runIds: mergeRunIds(threadDocument.runIds, runDocument.run.runId),
      };
    }

    const threadFromIndex = (
      await loadThreadIndex(readUserFile)
    ).threads.find(thread => thread.threadId === runDocument.run.threadId);

    return {
      runDocument,
      thread:
        (threadFromIndex
          ? {
              ...threadFromIndex,
              updatedAt: runDocument.run.updatedAt,
              lastRunId: runDocument.run.runId,
              lastRunStatus: runDocument.run.status,
            }
          : null) ??
        createThreadSummary({
          threadId: runDocument.run.threadId,
          runId: runDocument.run.runId,
          title: formatThreadTitle({
            goal: runDocument.run.goal,
            command: runDocument.run.request?.command ?? runDocument.run.goal,
          }),
          createdAt: runDocument.run.createdAt,
          lastRunStatus: runDocument.run.status,
        }),
      runIds: [runDocument.run.runId],
    };
  }

  async function loadPersistedThreadState(threadId: string) {
    const normalizedThreadId = normalizeAgentStorageId(threadId, 'thread id');
    const rawThreadDocument = await readUserFile(
      buildAgentThreadDocumentPath(normalizedThreadId),
    );
    const threadDocument = rawThreadDocument
      ? parsePersistedAgentThreadDocument(rawThreadDocument)
      : null;
    if (threadDocument) {
      return {
        thread: threadDocument.thread,
        runIds: [...threadDocument.runIds],
      };
    }

    const threadFromIndex = (
      await loadThreadIndex(readUserFile)
    ).threads.find(thread => thread.threadId === normalizedThreadId);
    if (!threadFromIndex) {
      throw new Error(`Persisted agent thread ${normalizedThreadId} was not found.`);
    }

    return {
      thread: threadFromIndex,
      runIds: threadFromIndex.lastRunId ? [threadFromIndex.lastRunId] : [],
    };
  }

  function buildHandle({
    runDocument,
    whenSettled,
    cancel,
    sendInput,
  }: {
    runDocument: AgentRunDocument;
    whenSettled: Promise<AgentRunDocument>;
    cancel: () => Promise<void>;
    sendInput: (text: string) => Promise<void>;
  }): PersistedAgentTerminalRunHandle {
    return {
      threadId: runDocument.run.threadId,
      runId: runDocument.run.runId,
      get sessionId() {
        return runDocument.run.sessionId;
      },
      whenSettled,
      getSnapshot() {
        return cloneRunDocument(runDocument);
      },
      async cancel() {
        await cancel();
      },
      async sendInput(text: string) {
        await sendInput(text);
      },
    };
  }

  async function startRunExecution({
    runDocument,
    thread,
    runIds,
    whenSettled,
  }: PersistedRunState & {whenSettled: Promise<AgentRunDocument>}) {
    const request = runDocument.run.request;
    if (!request) {
      throw new Error('Persisted agent run is missing its terminal request.');
    }
    const requiresLlmContinuation = runDocument.timeline.some(
      entry => entry.kind === 'approval',
    );

    const requestedArtifact = resolveRequestedAgentArtifact(request.env);
    let nextSeq =
      runDocument.timeline.reduce(
        (maxSeq, entry) => Math.max(maxSeq, entry.seq),
        -1,
      ) + 1;
    let cancelRequested = false;
    let artifactRecorded = runDocument.timeline.some(entry => entry.kind === 'artifact');
    let toolResultRecorded = hasStructuredToolResultEntry(runDocument);

    const persistSnapshot = (includeThreadState: boolean) =>
      enqueuePersistenceTask(async () => {
        await persistRunState({
          runDocument,
          thread,
          runIds,
          includeThreadState,
        });
      });

    const settleWhenReady = (persistPromise: Promise<void>) => {
      void persistPromise.finally(() => {
        resolveSettlement(runDocument.run.runId, runDocument);
      });
    };

    const appendTerminalEvent = (event: AgentTerminalSessionEvent) => {
      runDocument.timeline.push(
        createAgentTerminalTimelineEntry({
          entryId: createId('entry'),
          runId: runDocument.run.runId,
          seq: nextSeq,
          event,
        }),
      );
      nextSeq += 1;

      runDocument.run.updatedAt = event.createdAt;
      thread.updatedAt = event.createdAt;
      thread.lastRunStatus = runDocument.run.status;
      thread.lastRunId = runDocument.run.runId;
    };

    const appendErrorEvent = ({
      code,
      message,
      createdAt,
    }: {
      code?: string | null;
      message: string;
      createdAt: string;
    }) => {
      runDocument.timeline.push(
        createErrorTimelineEntry({
          entryId: createId('entry'),
          runId: runDocument.run.runId,
          seq: nextSeq,
          createdAt,
          code,
          message,
        }),
      );
      nextSeq += 1;
      runDocument.run.updatedAt = createdAt;
      thread.updatedAt = createdAt;
    };

    const appendRequestedArtifact = (createdAt: string) => {
      if (!requestedArtifact || artifactRecorded) {
        return;
      }

      runDocument.timeline.push(
        createArtifactTimelineEntry({
          entryId: createId('entry'),
          artifactId: createId('artifact'),
          runId: runDocument.run.runId,
          seq: nextSeq,
          createdAt,
          artifact: requestedArtifact,
        }),
      );
      nextSeq += 1;
      artifactRecorded = true;
      runDocument.run.updatedAt = createdAt;
      thread.updatedAt = createdAt;
      thread.lastRunStatus = runDocument.run.status;
      thread.lastRunId = runDocument.run.runId;
    };

    const appendToolResult = ({
      createdAt,
      status,
      outputText,
      exitCode,
    }: {
      createdAt: string;
      status: AgentToolResultTimelineEntry['status'];
      outputText: string;
      exitCode: number | null;
    }) => {
      if (toolResultRecorded) {
        return;
      }

      runDocument.timeline.push(
        createToolResultTimelineEntry({
          runId: runDocument.run.runId,
          seq: nextSeq,
          createdAt,
          status,
          outputText,
          exitCode,
        }),
      );
      nextSeq += 1;
      toolResultRecorded = true;
      runDocument.run.updatedAt = createdAt;
      thread.updatedAt = createdAt;
      thread.lastRunStatus = runDocument.run.status;
      thread.lastRunId = runDocument.run.runId;
    };

    const appendContinuationAndPersist = async ({
      createdAt,
      toolResultOutput,
    }: {
      createdAt: string;
      toolResultOutput: string;
    }) => {
      if (requiresLlmContinuation) {
        try {
          const providerConfig = await resolveRuntimeProviderConfig(
            runDocument.run.settings.provider,
          );
          await appendLlmContinuationMessage({
            runDocument,
            thread,
            providerConfig,
            toolResultOutput,
            createdAt,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Agent continuation failed after shell execution.';
          appendErrorEvent({
            code: null,
            message,
            createdAt,
          });
          runDocument.run.status = 'failed';
          runDocument.run.updatedAt = createdAt;
          runDocument.run.completedAt = createdAt;
          thread.updatedAt = createdAt;
          thread.lastRunStatus = runDocument.run.status;
          thread.lastRunId = runDocument.run.runId;
        }
      }

      await persistSnapshot(true);
    };

    let sessionHandle: AgentTerminalSessionHandle;
    try {
      sessionHandle = await openAgentTerminalSession(
        {
          command: request.command,
          cwd: request.cwd,
          env: request.env,
          shell: request.shell,
        },
        {
          onEvent(event) {
            appendTerminalEvent(event);

            if (event.event === 'started') {
              runDocument.run.status = 'running';
              runDocument.run.startedAt =
                runDocument.run.startedAt ?? event.createdAt;
              updateStructuredPlanStatus(runDocument, 'in_progress');
              updateStructuredToolCallStatus(runDocument, 'running');
              markThreadAttention(thread, event.createdAt);
            } else if (event.event === 'exit') {
              const toolResultOutput = buildStructuredToolResultOutput(runDocument);
              runDocument.run.status = resolveExitStatus({
                exitCode: event.exitCode,
                cancelRequested,
              });
              runDocument.run.completedAt = event.createdAt;
              updateStructuredPlanStatus(runDocument, 'completed');
              updateStructuredToolCallStatus(
                runDocument,
                runDocument.run.status === 'completed'
                  ? 'completed'
                  : runDocument.run.status === 'failed'
                    ? 'failed'
                    : 'cancelled',
              );
              appendToolResult({
                createdAt: event.createdAt,
                status:
                  runDocument.run.status === 'completed'
                    ? 'success'
                    : runDocument.run.status === 'failed'
                      ? 'error'
                      : 'cancelled',
                outputText: toolResultOutput,
                exitCode: event.exitCode,
              });
              if (runDocument.run.status === 'completed') {
                appendRequestedArtifact(event.createdAt);
              }
              markThreadAttention(thread, event.createdAt);
            }

            thread.lastRunStatus = runDocument.run.status;
            thread.lastRunId = runDocument.run.runId;

            const persistPromise =
              event.event === 'exit'
                ? appendContinuationAndPersist({
                    createdAt: event.createdAt,
                    toolResultOutput:
                      buildStructuredToolResultOutput(runDocument),
                  })
                : persistSnapshot(event.event === 'started');
            if (event.event === 'exit') {
              settleWhenReady(persistPromise);
            }
          },
          onError(error) {
            const createdAt = now();
            const toolResultOutput =
              buildStructuredToolResultOutput(runDocument) || error.message;
            updateStructuredPlanStatus(runDocument, 'completed');
            updateStructuredToolCallStatus(
              runDocument,
              cancelRequested ? 'cancelled' : 'failed',
            );
            appendToolResult({
              createdAt,
              status: cancelRequested ? 'cancelled' : 'error',
              outputText: toolResultOutput,
              exitCode: null,
            });
            appendErrorEvent({
              code: error.code,
              message: error.message,
              createdAt,
            });
            runDocument.run.status = cancelRequested ? 'cancelled' : 'failed';
            runDocument.run.completedAt = createdAt;
            runDocument.run.updatedAt = createdAt;
            thread.updatedAt = createdAt;
            thread.lastRunStatus = runDocument.run.status;
            thread.lastRunId = runDocument.run.runId;
            markThreadAttention(thread, createdAt);

            settleWhenReady(
              appendContinuationAndPersist({
                createdAt,
                toolResultOutput,
              }),
            );
          },
        },
      );
    } catch (error) {
      const createdAt = now();
      const normalizedError =
        error instanceof Error
          ? (error as Error & {code?: string})
          : (new Error('Failed to open persisted agent terminal run.') as Error & {
              code?: string;
            });

      updateStructuredPlanStatus(runDocument, 'completed');
      updateStructuredToolCallStatus(runDocument, 'failed');
      const toolResultOutput =
        buildStructuredToolResultOutput(runDocument) || normalizedError.message;
      appendToolResult({
        createdAt,
        status: 'error',
        outputText: toolResultOutput,
        exitCode: null,
      });
      appendErrorEvent({
        code: normalizedError.code,
        message: normalizedError.message,
        createdAt,
      });
      runDocument.run.status = 'failed';
      runDocument.run.completedAt = createdAt;
      runDocument.run.updatedAt = createdAt;
      thread.updatedAt = createdAt;
      thread.lastRunStatus = runDocument.run.status;
      thread.lastRunId = runDocument.run.runId;
      markThreadAttention(thread, createdAt);

      settleWhenReady(
        appendContinuationAndPersist({
          createdAt,
          toolResultOutput,
        }),
      );
      throw normalizedError;
    }

    runDocument.run.sessionId = sessionHandle.sessionId;
    const sessionOpenedAt = now();
    if (runDocument.run.updatedAt.localeCompare(sessionOpenedAt) < 0) {
      runDocument.run.updatedAt = sessionOpenedAt;
      thread.updatedAt = sessionOpenedAt;
    }
    thread.lastRunStatus = runDocument.run.status;
    thread.lastRunId = runDocument.run.runId;
    void persistSnapshot(true);

    return buildHandle({
      runDocument,
      whenSettled,
      cancel: async () => {
        cancelRequested = true;
        await sessionHandle.cancel();
      },
      sendInput: async text => {
        await sessionHandle.sendInput(text);
      },
    });
  }

  async function openRun(
    options: OpenPersistedAgentTerminalRunOptions,
  ): Promise<PersistedAgentTerminalRunHandle> {
    const continuedThreadId = options.threadId?.trim() || null;
    const threadId = continuedThreadId ?? createId('thread');
    const runId = createId('run');
    const createdAt = now();
    const workspaceTarget = await getTrustedWorkspaceTarget();
    const requestedRunRequest = normalizeRunRequest(options);
    const goal = formatGoal({
      command: requestedRunRequest.command,
      cwd: requestedRunRequest.cwd,
      goal: options.goal,
    });
    const llmProviderConfig =
      options.requiresApproval === true
        ? await resolveRuntimeProviderConfig(options.provider)
        : null;
    const plannedRunRequest =
      options.requiresApproval === true && llmProviderConfig
        ? await requestInitialLlmShellToolCall({
            providerConfig: llmProviderConfig,
            goal,
            request: requestedRunRequest,
          })
        : requestedRunRequest;
    const settings = resolveRunSettings({
      workspaceTarget,
      provider:
        createProviderProfileFromConfig(llmProviderConfig) ?? options.provider,
      permissionMode: options.permissionMode,
      approvalMode: options.approvalMode,
    });
    const requiresApproval =
      options.requiresApproval === true && settings.approvalMode === 'manual';
    const approvalRules = requiresApproval
      ? await loadApprovalRulesDocument(readUserFile)
      : {
          updatedAt: null,
          rules: [],
        };
    const matchedApprovalRule = requiresApproval
      ? findMatchingApprovalRule({
          rules: approvalRules.rules,
          request: plannedRunRequest,
          permissionMode: settings.permissionMode,
        })
      : null;
    const initialRunStatus: AgentRunStatus = requiresApproval
      ? matchedApprovalRule
        ? 'queued'
        : 'needs-approval'
      : 'queued';
    const previousThreadState = continuedThreadId
      ? await loadPersistedThreadState(continuedThreadId)
      : null;
    const resumedFromRunId =
      previousThreadState?.thread.lastRunId ??
      previousThreadState?.runIds.at(-1) ??
      null;
    const thread = previousThreadState
      ? {
          ...previousThreadState.thread,
          updatedAt: createdAt,
          lastRunId: runId,
          lastRunStatus: initialRunStatus,
        }
      : createThreadSummary({
          threadId,
          runId,
          title: formatThreadTitle({
            title: options.title,
            goal,
            command: plannedRunRequest.command,
          }),
          createdAt,
          lastRunStatus: initialRunStatus,
        });
    markThreadAttention(thread, createdAt);
    const runDocument = createInitialRunDocument({
      threadId,
      runId,
      goal,
      settings,
      request: plannedRunRequest,
      createdAt,
      resumedFromRunId,
      status: initialRunStatus,
    });
    createStructuredTimelineSeed({
      runDocument,
      createdAt,
      requiresApproval: requiresApproval && matchedApprovalRule === null,
    });
    const runIds = previousThreadState
      ? mergeRunIds(previousThreadState.runIds, runId)
      : [runId];
    const whenSettled = createWhenSettledPromise(runId);

    if (requiresApproval) {
      const approvalId = createId('approval');
      runDocument.timeline.push(
        createApprovalTimelineEntry({
          entryId: createId('entry'),
          runId,
          seq: runDocument.timeline.length,
          createdAt,
          approvalId,
          title: options.approvalTitle?.trim() || goal,
          details: options.approvalDetails,
          permissionMode: settings.permissionMode,
          requestReason: options.approvalTitle?.trim() || goal,
          commandText: plannedRunRequest.command,
          requestedCwd: plannedRunRequest.cwd,
          status: matchedApprovalRule ? 'approved' : 'pending',
          decisionMode: matchedApprovalRule ? 'approve-prefix' : null,
          matchedRuleId: matchedApprovalRule?.ruleId ?? null,
        }),
      );

      await persistRunState({
        runDocument,
        thread,
        runIds,
      });

      if (matchedApprovalRule === null) {
        return buildHandle({
          runDocument,
          whenSettled,
          cancel: async () => {
            await rejectRun({
              runId,
              approvalId,
            });
          },
          sendInput: async () => {
            throw new Error('Persisted agent terminal run is waiting for approval.');
          },
        });
      }
    }

    await persistRunState({
      runDocument,
      thread,
      runIds,
    });

    return startRunExecution({
      runDocument,
      thread,
      runIds,
      whenSettled,
    });
  }

  async function approveRun({
    runId,
    approvalId,
    decisionMode = 'once',
  }: ApprovePersistedAgentTerminalRunOptions) {
    const state = await loadPersistedRunState(runId);
    const pendingApproval = findPendingApprovalEntry(
      state.runDocument,
      approvalId,
    );
    if (!pendingApproval) {
      throw new Error('Persisted agent run does not have a pending approval.');
    }
    if (!state.runDocument.run.request) {
      throw new Error('Persisted agent run is missing its terminal request.');
    }

    const createdAt = now();
    pendingApproval.status = 'approved';
    pendingApproval.decisionMode =
      decisionMode === 'prefix-rule' ? 'approve-prefix' : 'approve-once';
    pendingApproval.decisionNote = null;
    if (decisionMode === 'prefix-rule') {
      const approvalRulesDocument = await loadApprovalRulesDocument(readUserFile);
      const existingRule = findMatchingApprovalRule({
        rules: approvalRulesDocument.rules,
        request: state.runDocument.run.request,
        permissionMode: state.runDocument.run.settings.permissionMode,
      });
      const ruleId = existingRule?.ruleId ?? createId('approval-rule');
      pendingApproval.matchedRuleId = ruleId;
      if (!existingRule) {
        approvalRulesDocument.rules.push({
          ruleId,
          commandPrefix: normalizeApprovalCommandPrefix(
            state.runDocument.run.request.command,
          ),
          cwd: state.runDocument.run.request.cwd,
          permissionMode: state.runDocument.run.settings.permissionMode,
          createdAt,
        });
        approvalRulesDocument.updatedAt = createdAt;
        await persistApprovalRulesDocument(approvalRulesDocument);
      }
    } else {
      pendingApproval.matchedRuleId = null;
    }
    state.runDocument.run.status = 'queued';
    state.runDocument.run.updatedAt = createdAt;
    state.runDocument.run.completedAt = null;
    state.thread.updatedAt = createdAt;
    state.thread.lastRunStatus = state.runDocument.run.status;
    state.thread.lastRunId = state.runDocument.run.runId;

    await persistRunState({
      ...state,
    });

    const whenSettled = createWhenSettledPromise(state.runDocument.run.runId);
    return startRunExecution({
      ...state,
      whenSettled,
    });
  }

  async function rejectRun({
    runId,
    approvalId,
    reason,
  }: RejectPersistedAgentTerminalRunOptions) {
    const state = await loadPersistedRunState(runId);
    const pendingApproval = findPendingApprovalEntry(
      state.runDocument,
      approvalId,
    );
    if (!pendingApproval) {
      throw new Error('Persisted agent run does not have a pending approval.');
    }

    const createdAt = now();
    const rejectionReason = reason?.trim() || defaultRejectedDecisionReason;
    const rejectionToolResultOutput = `${approvalRejectedToolResultOutput}：${rejectionReason}`;
    pendingApproval.status = 'rejected';
    pendingApproval.decisionMode = 'reject';
    pendingApproval.decisionNote = rejectionReason;
    updateStructuredPlanStatus(state.runDocument, 'completed');
    updateStructuredToolCallStatus(state.runDocument, 'cancelled');
    if (!hasStructuredToolResultEntry(state.runDocument)) {
      const nextSeq =
        state.runDocument.timeline.reduce(
          (maxSeq, entry) => Math.max(maxSeq, entry.seq),
          -1,
        ) + 1;
      state.runDocument.timeline.push(
        createToolResultTimelineEntry({
          runId: state.runDocument.run.runId,
          seq: nextSeq,
          createdAt,
          status: 'cancelled',
          outputText: rejectionToolResultOutput,
          exitCode: -1,
        }),
      );
    }
    state.runDocument.run.status = 'completed';
    state.runDocument.run.updatedAt = createdAt;
    state.runDocument.run.completedAt = createdAt;
    state.thread.updatedAt = createdAt;
    state.thread.lastRunStatus = state.runDocument.run.status;
    state.thread.lastRunId = state.runDocument.run.runId;

    try {
      const providerConfig = await resolveRuntimeProviderConfig(
        state.runDocument.run.settings.provider,
      );
      await appendLlmContinuationMessage({
        runDocument: state.runDocument,
        thread: state.thread,
        providerConfig,
        toolResultOutput: rejectionToolResultOutput,
        createdAt,
      });
    } catch (error) {
      state.runDocument.run.status = 'failed';
      state.runDocument.run.updatedAt = createdAt;
      state.runDocument.run.completedAt = createdAt;
      state.thread.updatedAt = createdAt;
      state.thread.lastRunStatus = state.runDocument.run.status;
      state.thread.lastRunId = state.runDocument.run.runId;
      state.runDocument.timeline.push(
        createErrorTimelineEntry({
          entryId: createId('entry'),
          runId: state.runDocument.run.runId,
          seq:
            state.runDocument.timeline.reduce(
              (maxSeq, entry) => Math.max(maxSeq, entry.seq),
              -1,
            ) + 1,
          createdAt,
          code: null,
          message:
            error instanceof Error
              ? error.message
              : 'Agent continuation failed after approval rejection.',
        }),
      );
    }

    await persistRunState({
      ...state,
    });
    resolveSettlement(state.runDocument.run.runId, state.runDocument);
    return cloneRunDocument(state.runDocument);
  }

  async function reconcileInterruptedRuns(): Promise<ReconcileInterruptedAgentRunsResult> {
    const threadIndex = await loadThreadIndex(readUserFile);
    const interruptedRunIds: string[] = [];

    for (const thread of threadIndex.threads) {
      if (
        !thread.lastRunId ||
        (thread.lastRunStatus !== 'queued' && thread.lastRunStatus !== 'running')
      ) {
        continue;
      }

      const state = await loadPersistedRunState(thread.lastRunId);
      const currentStatus = state.runDocument.run.status;
      if (currentStatus !== 'queued' && currentStatus !== 'running') {
        continue;
      }

      const interruptedAt = now();
      updateStructuredPlanStatus(state.runDocument, 'completed');
      updateStructuredToolCallStatus(state.runDocument, 'cancelled');
      if (!hasStructuredToolResultEntry(state.runDocument)) {
        const nextSeq =
          state.runDocument.timeline.reduce(
            (maxSeq, entry) => Math.max(maxSeq, entry.seq),
            -1,
          ) + 1;
        state.runDocument.timeline.push(
          createToolResultTimelineEntry({
            runId: state.runDocument.run.runId,
            seq: nextSeq,
            createdAt: interruptedAt,
            status: 'cancelled',
            outputText: buildStructuredToolResultOutput(state.runDocument),
            exitCode: null,
          }),
        );
      }
      state.runDocument.run.status = 'interrupted';
      state.runDocument.run.updatedAt = interruptedAt;
      state.runDocument.run.completedAt =
        state.runDocument.run.completedAt ?? interruptedAt;
      state.thread.updatedAt = interruptedAt;
      state.thread.lastRunStatus = 'interrupted';
      state.thread.lastRunId = state.runDocument.run.runId;

      await persistRunState({
        ...state,
      });
      resolveSettlement(state.runDocument.run.runId, state.runDocument);
      interruptedRunIds.push(state.runDocument.run.runId);
    }

    return {
      interruptedRunIds,
    };
  }

  async function reconcileRequestedRunArtifacts(): Promise<ReconcileRequestedAgentRunArtifactsResult> {
    const threadIndex = await loadThreadIndex(readUserFile);
    const reconciledRunIds: string[] = [];
    const seenRunIds = new Set<string>();

    for (const thread of threadIndex.threads) {
      const rawThreadDocument = await readUserFile(
        buildAgentThreadDocumentPath(thread.threadId),
      );
      const threadDocument = rawThreadDocument
        ? parsePersistedAgentThreadDocument(rawThreadDocument)
        : null;
      const runIds = threadDocument?.runIds ?? (thread.lastRunId ? [thread.lastRunId] : []);

      for (const runId of runIds) {
        if (seenRunIds.has(runId)) {
          continue;
        }

        seenRunIds.add(runId);
        const state = await loadPersistedRunState(runId);
        if (state.runDocument.run.status !== 'completed') {
          continue;
        }
        if (state.runDocument.timeline.some(entry => entry.kind === 'artifact')) {
          continue;
        }
        const toolResultEntry = findStructuredToolResultEntry(state.runDocument);
        if (!toolResultEntry || toolResultEntry.status !== 'success') {
          continue;
        }

        const requestedArtifact = resolveRequestedAgentArtifact(
          state.runDocument.run.request?.env,
        );
        if (!requestedArtifact) {
          continue;
        }

        const createdAt =
          state.runDocument.run.completedAt ?? state.runDocument.run.updatedAt;
        const nextSeq =
          state.runDocument.timeline.reduce(
            (maxSeq, entry) => Math.max(maxSeq, entry.seq),
            -1,
          ) + 1;
        state.runDocument.timeline.push(
          createArtifactTimelineEntry({
            entryId: createId('entry'),
            artifactId: createId('artifact'),
            runId: state.runDocument.run.runId,
            seq: nextSeq,
            createdAt,
            artifact: requestedArtifact,
          }),
        );
        await persistUserFile(
          buildAgentRunDocumentPath(state.runDocument.run.runId),
          serializePersistedAgentRunDocument(state.runDocument),
        );
        reconciledRunIds.push(state.runDocument.run.runId);
      }
    }

    return {
      reconciledRunIds,
    };
  }

  async function markThreadRead(threadId: string) {
    const state = await loadPersistedThreadState(threadId);
    const readAt = now();
    state.thread.attention = 'read';
    state.thread.lastReadAt = readAt;

    await persistUserFile(
      buildAgentThreadDocumentPath(state.thread.threadId),
      serializePersistedAgentThreadDocument(
        buildThreadDocument({
          thread: state.thread,
          runIds: state.runIds,
        }),
      ),
    );

    const index = await loadThreadIndex(readUserFile);
    const threads = index.threads.map(existing =>
      existing.threadId === state.thread.threadId
        ? {...state.thread}
        : existing,
    );

    await persistUserFile(
      agentThreadIndexPath,
      serializePersistedAgentThreadIndex({
        updatedAt: readAt,
        threads,
      }),
    );
  }

  return {
    openRun,
    approveRun,
    rejectRun,
    markThreadRead,
    reconcileInterruptedRuns,
    reconcileRequestedRunArtifacts,
  };
}

const persistedAgentTerminalRuntime = createPersistedAgentTerminalRuntime({});

export const openPersistedAgentTerminalRun = persistedAgentTerminalRuntime.openRun;
export const approvePersistedAgentTerminalRun =
  persistedAgentTerminalRuntime.approveRun;
export const rejectPersistedAgentTerminalRun =
  persistedAgentTerminalRuntime.rejectRun;
export const reconcileInterruptedAgentRuns =
  persistedAgentTerminalRuntime.reconcileInterruptedRuns;
export const reconcileRequestedAgentRunArtifacts =
  persistedAgentTerminalRuntime.reconcileRequestedRunArtifacts;
export const markAgentThreadRead =
  persistedAgentTerminalRuntime.markThreadRead;
