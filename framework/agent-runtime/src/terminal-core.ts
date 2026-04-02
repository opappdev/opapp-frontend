import {
  agentTerminalEventTypes,
  type AgentTerminalEventType,
  type AgentTerminalTimelineEntry,
} from './model';

export const agentTerminalShells = ['powershell', 'cmd'] as const;

export type AgentTerminalShell = (typeof agentTerminalShells)[number];

export type AgentTerminalSessionEvent = Omit<
  AgentTerminalTimelineEntry,
  'kind' | 'entryId' | 'runId' | 'seq'
>;

export type OpenAgentTerminalSessionOptions = {
  command: string;
  cwd?: string | null;
  env?: Record<string, string> | null;
  shell?: AgentTerminalShell | null;
};

export type AgentTerminalSessionListener = {
  onEvent?: (event: AgentTerminalSessionEvent) => void;
  onError?: (error: Error & {code?: string}) => void;
};

export type AgentTerminalSessionHandle = {
  sessionId: string;
  cancel(): Promise<void>;
  sendInput(text: string): Promise<void>;
};

export type NativeAgentTerminalBridge = {
  openSession(requestJson: string): Promise<string>;
  cancelSession(sessionId: string): Promise<void>;
  writeSessionInput?(sessionId: string, text: string): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

export type NativeAgentTerminalEventPayload = {
  sessionId?: string;
  type?: string;
  event?: string;
  text?: string | null;
  cwd?: string | null;
  command?: string | null;
  exitCode?: number | null;
  createdAt?: string | null;
  error?: string;
  code?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readOptionalInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function readEnumValue<TValue extends string>(
  values: readonly TValue[],
  value: unknown,
): TValue | null {
  return typeof value === 'string' && values.includes(value as TValue)
    ? (value as TValue)
    : null;
}

function normalizeUnknownError(
  error: unknown,
  fallbackMessage: string,
): Error & {code?: string} {
  if (error instanceof Error) {
    return error as Error & {code?: string};
  }

  return new Error(
    typeof error === 'string' && error.trim() ? error : fallbackMessage,
  ) as Error & {code?: string};
}

function serializeOpenSessionRequest(options: OpenAgentTerminalSessionOptions) {
  const command = options.command.trim();
  if (!command) {
    throw new Error('Agent terminal command is required.');
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

  return JSON.stringify({
    command,
    cwd: typeof options.cwd === 'string' ? options.cwd : null,
    env,
    shell:
      readEnumValue(agentTerminalShells, options.shell) ?? agentTerminalShells[0],
  });
}

function parseAgentTerminalSessionEvent(
  payload: NativeAgentTerminalEventPayload,
): AgentTerminalSessionEvent | null {
  if (!isRecord(payload)) {
    return null;
  }

  const sessionId = readOptionalString(payload.sessionId)?.trim();
  const event = readEnumValue<AgentTerminalEventType>(
    agentTerminalEventTypes,
    payload.event,
  );
  if (!sessionId || !event) {
    return null;
  }

  return {
    sessionId,
    event,
    text: readOptionalString(payload.text),
    cwd: readOptionalString(payload.cwd)?.trim() ?? null,
    command: readOptionalString(payload.command),
    exitCode: readOptionalInteger(payload.exitCode),
    createdAt:
      readOptionalString(payload.createdAt)?.trim() ?? new Date().toISOString(),
  };
}

export function createAgentTerminalTimelineEntry({
  entryId,
  runId,
  seq,
  event,
}: {
  entryId: string;
  runId: string;
  seq: number;
  event: AgentTerminalSessionEvent;
}): AgentTerminalTimelineEntry {
  return {
    entryId,
    runId,
    seq,
    kind: 'terminal-event',
    sessionId: event.sessionId,
    event: event.event,
    text: event.text,
    cwd: event.cwd,
    command: event.command,
    exitCode: event.exitCode,
    createdAt: event.createdAt,
  };
}

export function createNativeAgentTerminalRuntime({
  platformOs,
  nativeAgentTerminalBridge,
  subscribeToNativeEvents,
}: {
  platformOs: string;
  nativeAgentTerminalBridge: NativeAgentTerminalBridge | null;
  subscribeToNativeEvents: (
    onPayload: (payload: NativeAgentTerminalEventPayload) => void,
  ) => {remove: () => void};
}) {
  let nativeEventSubscription: {remove: () => void} | null = null;
  let nativeOpenRequestCount = 0;
  const nativeListeners = new Map<string, AgentTerminalSessionListener>();
  const pendingNativeEvents = new Map<string, NativeAgentTerminalEventPayload[]>();

  function cleanupNativeEventSubscription() {
    if (
      nativeEventSubscription === null ||
      nativeOpenRequestCount !== 0 ||
      nativeListeners.size !== 0 ||
      pendingNativeEvents.size !== 0
    ) {
      return;
    }

    nativeEventSubscription.remove();
    nativeEventSubscription = null;
  }

  function cleanupSession(sessionId: string) {
    nativeListeners.delete(sessionId);
    pendingNativeEvents.delete(sessionId);
    cleanupNativeEventSubscription();
  }

  function dispatchNativePayload(rawPayload: NativeAgentTerminalEventPayload) {
    const sessionId = rawPayload?.sessionId?.trim();
    const type = rawPayload?.type?.trim();
    if (!sessionId || !type) {
      return;
    }

    const listener = nativeListeners.get(sessionId);
    if (!listener) {
      const pendingPayloads = pendingNativeEvents.get(sessionId) ?? [];
      pendingPayloads.push(rawPayload);
      pendingNativeEvents.set(sessionId, pendingPayloads);
      return;
    }

    if (type === 'error') {
      cleanupSession(sessionId);
      const error = normalizeUnknownError(
        rawPayload.error,
        'Native agent terminal runtime failed.',
      );
      error.code = rawPayload.code?.trim() || 'ERR_AGENT_TERMINAL_NATIVE';
      listener.onError?.(error);
      return;
    }

    if (type !== 'event') {
      return;
    }

    const event = parseAgentTerminalSessionEvent(rawPayload);
    if (!event) {
      return;
    }

    listener.onEvent?.(event);
    if (event.event === 'exit') {
      cleanupSession(sessionId);
    }
  }

  function ensureNativeEventSubscription() {
    if (nativeEventSubscription || !nativeAgentTerminalBridge) {
      return;
    }

    nativeEventSubscription = subscribeToNativeEvents(dispatchNativePayload);
  }

  function isRuntimeAvailable() {
    return (
      platformOs === 'windows' &&
      nativeAgentTerminalBridge !== null &&
      typeof nativeAgentTerminalBridge.openSession === 'function' &&
      typeof nativeAgentTerminalBridge.cancelSession === 'function'
    );
  }

  async function openSession(
    options: OpenAgentTerminalSessionOptions,
    listener: AgentTerminalSessionListener = {},
  ): Promise<AgentTerminalSessionHandle> {
    if (!isRuntimeAvailable() || !nativeAgentTerminalBridge) {
      throw new Error('Native agent terminal runtime is unavailable.');
    }

    ensureNativeEventSubscription();

    let sessionId = '';
    nativeOpenRequestCount += 1;
    try {
      sessionId = await nativeAgentTerminalBridge.openSession(
        serializeOpenSessionRequest(options),
      );
      nativeOpenRequestCount -= 1;
      nativeListeners.set(sessionId, listener);
      const pendingPayloads = pendingNativeEvents.get(sessionId) ?? [];
      pendingNativeEvents.delete(sessionId);
      for (const pendingPayload of pendingPayloads) {
        dispatchNativePayload(pendingPayload);
      }
    } catch (error) {
      nativeOpenRequestCount -= 1;
      cleanupNativeEventSubscription();
      throw normalizeUnknownError(
        error,
        'Failed to open the native agent terminal session.',
      );
    }

    return {
      sessionId,
      async cancel() {
        await nativeAgentTerminalBridge.cancelSession(sessionId);
      },
      async sendInput(text: string) {
        if (typeof nativeAgentTerminalBridge.writeSessionInput !== 'function') {
          throw new Error('Native agent terminal input is unavailable.');
        }

        await nativeAgentTerminalBridge.writeSessionInput(sessionId, text);
      },
    };
  }

  return {
    dispatchNativePayload,
    isRuntimeAvailable,
    openSession,
  };
}
