import type {
  SseEvent,
  SseRequestHandle,
  SseRequestOptions,
} from '../../sse/src/types';
import type {
  AgentLlmProviderConfig,
  AgentTerminalRunRequest,
  AgentTerminalShell,
} from './model';

export const openAiCompatibleStreamInterruptedErrorText =
  '服务端在完成流式响应前中断了连接。';

type AgentChatMessage =
  | {
      role: 'system' | 'user';
      content: string;
    }
  | {
      role: 'assistant';
      content: string | null;
      toolCalls?: ReadonlyArray<{
        id: string;
        name: string;
        argumentsText: string;
      }>;
    }
  | {
      role: 'tool';
      toolCallId: string;
      content: string;
    };

type ToolCallAccumulator = {
  id: string | null;
  name: string | null;
  argumentsText: string;
};

export type OpenAiCompatibleAgentTurnResult = {
  assistantText: string;
  toolCalls: Array<{
    callId: string;
    name: string;
    argumentsText: string;
    request: AgentTerminalRunRequest | null;
  }>;
};

export type OpenAiCompatibleAgentSseRequest = (
  options: SseRequestOptions,
) => SseRequestHandle;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

function normalizeEnvRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const env: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const key = rawKey.trim();
    if (!key || typeof rawValue !== 'string') {
      continue;
    }
    env[key] = rawValue;
  }
  return env;
}

function normalizeShellValue(value: unknown): AgentTerminalShell | null {
  return value === 'powershell' || value === 'cmd' ? value : null;
}

function parseToolRequest(argumentsText: string): AgentTerminalRunRequest | null {
  try {
    const parsed = JSON.parse(argumentsText) as Record<string, unknown>;
    const command =
      typeof parsed.command === 'string' ? parsed.command.trim() : '';
    if (!command) {
      return null;
    }

    return {
      command,
      cwd:
        typeof parsed.cwd === 'string' && parsed.cwd.trim()
          ? parsed.cwd.trim()
          : null,
      shell: normalizeShellValue(parsed.shell),
      env: normalizeEnvRecord(parsed.env),
    };
  } catch {
    return null;
  }
}

function buildRequestMessages(messages: ReadonlyArray<AgentChatMessage>) {
  return messages.map(message => {
    if (message.role === 'assistant') {
      return {
        role: 'assistant',
        content: message.content,
        ...(message.toolCalls && message.toolCalls.length > 0
          ? {
              tool_calls: message.toolCalls.map(toolCall => ({
                id: toolCall.id,
                type: 'function',
                function: {
                  name: toolCall.name,
                  arguments: toolCall.argumentsText,
                },
              })),
            }
          : {}),
      };
    }

    if (message.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: message.toolCallId,
        content: message.content,
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

function buildOpenAiCompatibleAgentRequest({
  provider,
  messages,
  allowToolCalls,
}: {
  provider: AgentLlmProviderConfig;
  messages: ReadonlyArray<AgentChatMessage>;
  allowToolCalls: boolean;
}) {
  const baseUrl = normalizeBaseUrl(provider.baseUrl);
  if (!baseUrl) {
    throw new Error('Agent LLM provider is missing baseUrl.');
  }

  return {
    url: `${baseUrl}/v1/chat/completions`,
    method: 'POST' as const,
    headers: {
      authorization: `Bearer ${provider.token.trim()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model.trim(),
      stream: true,
      messages: buildRequestMessages(messages),
      ...(allowToolCalls
        ? {
            tools: [
              {
                type: 'function',
                function: {
                  name: 'shell_command',
                  description:
                    'Run a local shell command with explicit cwd, shell, and env settings.',
                  parameters: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      command: {
                        type: 'string',
                      },
                      cwd: {
                        type: ['string', 'null'],
                      },
                      shell: {
                        type: ['string', 'null'],
                        enum: ['powershell', 'cmd', null],
                      },
                      env: {
                        type: 'object',
                        additionalProperties: {
                          type: 'string',
                        },
                      },
                    },
                    required: ['command'],
                  },
                },
              },
            ],
            tool_choice: 'auto',
          }
        : {
            tool_choice: 'none',
          }),
    }),
  };
}

function getErrorMessageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return null;
  }

  const message = (payload as {error?: {message?: unknown}}).error?.message;
  return typeof message === 'string' && message.trim()
    ? message.trim()
    : '服务端返回了错误响应。';
}

function appendToolCallDelta(
  toolCalls: Map<number, ToolCallAccumulator>,
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return;
  }

  for (const rawToolCall of value) {
    if (!rawToolCall || typeof rawToolCall !== 'object') {
      continue;
    }

    const record = rawToolCall as {
      id?: unknown;
      index?: unknown;
      function?: {
        name?: unknown;
        arguments?: unknown;
      };
    };
    const index =
      typeof record.index === 'number' && Number.isFinite(record.index)
        ? Math.trunc(record.index)
        : 0;
    const current =
      toolCalls.get(index) ??
      ({
        id: null,
        name: null,
        argumentsText: '',
      } satisfies ToolCallAccumulator);

    if (typeof record.id === 'string' && record.id.trim()) {
      current.id = record.id.trim();
    }
    if (typeof record.function?.name === 'string' && record.function.name.trim()) {
      current.name = record.function.name.trim();
    }
    if (typeof record.function?.arguments === 'string') {
      current.argumentsText += record.function.arguments;
    }

    toolCalls.set(index, current);
  }
}

function consumeEventPayload({
  payload,
  assistantTextParts,
  toolCalls,
}: {
  payload: string;
  assistantTextParts: string[];
  toolCalls: Map<number, ToolCallAccumulator>;
}) {
  const trimmed = payload.trim();
  if (!trimmed) {
    return {done: false};
  }

  if (trimmed === '[DONE]') {
    return {done: true};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('服务端返回了无法解析的流式 JSON 数据。');
  }

  const payloadErrorMessage = getErrorMessageFromPayload(parsed);
  if (payloadErrorMessage) {
    throw new Error(payloadErrorMessage);
  }

  const choices = Array.isArray((parsed as {choices?: unknown})?.choices)
    ? ((parsed as {choices: unknown[]}).choices ?? [])
    : [];

  let finished = false;
  for (const choice of choices) {
    if (!choice || typeof choice !== 'object') {
      continue;
    }

    const delta = (choice as {delta?: unknown}).delta;
    if (delta && typeof delta === 'object') {
      const content = (delta as {content?: unknown}).content;
      if (typeof content === 'string' && content.length > 0) {
        assistantTextParts.push(content);
      }

      appendToolCallDelta(
        toolCalls,
        (delta as {tool_calls?: unknown}).tool_calls,
      );
    }

    const finishReason = (choice as {finish_reason?: unknown}).finish_reason;
    if (typeof finishReason === 'string' && finishReason.length > 0) {
      finished = true;
    }
  }

  return {
    done: finished,
  };
}

function consumeSseEvent({
  event,
  assistantTextParts,
  toolCalls,
}: {
  event: SseEvent;
  assistantTextParts: string[];
  toolCalls: Map<number, ToolCallAccumulator>;
}) {
  if (event.type !== 'message') {
    return {done: false};
  }

  return consumeEventPayload({
    payload: event.data,
    assistantTextParts,
    toolCalls,
  });
}

export async function requestOpenAiCompatibleAgentTurn({
  provider,
  messages,
  allowToolCalls,
  signal,
  openSseRequestImpl,
}: {
  provider: AgentLlmProviderConfig;
  messages: ReadonlyArray<AgentChatMessage>;
  allowToolCalls: boolean;
  signal?: AbortSignal | null;
  openSseRequestImpl?: OpenAiCompatibleAgentSseRequest;
}): Promise<OpenAiCompatibleAgentTurnResult> {
  const resolvedOpenSseRequestImpl =
    openSseRequestImpl ??
    (await import('../../sse/src')).openSseRequest;
  const request = buildOpenAiCompatibleAgentRequest({
    provider,
    messages,
    allowToolCalls,
  });
  const assistantTextParts: string[] = [];
  const toolCalls = new Map<number, ToolCallAccumulator>();

  let requestHandle: SseRequestHandle | null = null;
  let finished = false;
  let sawTerminalChunk = false;
  let resolvePromise!: (value: OpenAiCompatibleAgentTurnResult) => void;
  let rejectPromise!: (error: Error) => void;
  const resultPromise = new Promise<OpenAiCompatibleAgentTurnResult>(
    (resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    },
  );

  const finalizeSuccess = () => {
    if (finished) {
      return;
    }

    finished = true;
    resolvePromise({
      assistantText: assistantTextParts.join(''),
      toolCalls: [...toolCalls.entries()]
        .sort((left, right) => left[0] - right[0])
        .map(([index, toolCall]) => ({
          callId: toolCall.id ?? `shell-command-${index + 1}`,
          name: toolCall.name ?? 'shell_command',
          argumentsText: toolCall.argumentsText,
          request: parseToolRequest(toolCall.argumentsText),
        })),
    });
  };

  const finalizeError = (error: Error) => {
    if (finished) {
      return;
    }

    finished = true;
    rejectPromise(error);
  };

  try {
    requestHandle = resolvedOpenSseRequestImpl({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal,
      onEvent(event) {
        try {
          const result = consumeSseEvent({
            event,
            assistantTextParts,
            toolCalls,
          });
          if (!result.done) {
            return;
          }

          sawTerminalChunk = true;
          requestHandle?.close();
          finalizeSuccess();
        } catch (error) {
          requestHandle?.close();
          if (error instanceof Error) {
            finalizeError(error);
            return;
          }

          finalizeError(new Error('Agent chat request failed.'));
        }
      },
      onError(error) {
        finalizeError(error);
      },
      onComplete() {
        if (!sawTerminalChunk) {
          finalizeError(new Error(openAiCompatibleStreamInterruptedErrorText));
          return;
        }

        finalizeSuccess();
      },
    });
  } catch (error) {
    finalizeError(
      error instanceof Error
        ? error
        : new Error('Failed to open the Agent chat request stream.'),
    );
  }

  requestHandle?.done.catch((error: unknown) => {
    if (error instanceof Error) {
      finalizeError(error);
      return;
    }

    finalizeError(new Error('Agent chat request failed.'));
  });

  return resultPromise;
}
