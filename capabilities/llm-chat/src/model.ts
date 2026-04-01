export type PersistedLlmChatConfig = {
  baseUrl: string;
  model: string;
  systemPrompt: string;
};

export type LlmChatMessageRole = 'user' | 'assistant';

export type LlmChatMessage = {
  id: string;
  role: LlmChatMessageRole;
  content: string;
};

export type OpenAiCompatibleChatRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
};

export type OpenAiCompatibleStreamEventResult =
  | {
      kind: 'delta';
      text: string;
    }
  | {
      kind: 'done';
    }
  | {
      kind: 'error';
      message: string;
    }
  | {
      kind: 'noop';
    };

export function createDefaultLlmChatConfig(): PersistedLlmChatConfig {
  return {
    baseUrl: '',
    model: '',
    systemPrompt: '',
  };
}

function readOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value;
}

export function parsePersistedLlmChatConfig(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      baseUrl: readOptionalString(parsed.baseUrl),
      model: readOptionalString(parsed.model),
      systemPrompt: readOptionalString(parsed.systemPrompt),
    };
  } catch {
    return null;
  }
}

export function normalizeLlmChatBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function validateLlmChatConfig(
  config: PersistedLlmChatConfig,
  token: string,
  prompt: string,
) {
  if (!normalizeLlmChatBaseUrl(config.baseUrl)) {
    return '请先填写兼容 OpenAI 的 Base URL。';
  }

  if (!config.model.trim()) {
    return '请先填写模型名称。';
  }

  if (!token.trim()) {
    return '请先填写访问 Token。';
  }

  if (!prompt.trim()) {
    return '请输入要发送的消息。';
  }

  return null;
}

export function buildOpenAiCompatibleChatRequest({
  config,
  token,
  messages,
}: {
  config: PersistedLlmChatConfig;
  token: string;
  messages: ReadonlyArray<Pick<LlmChatMessage, 'role' | 'content'>>;
}): OpenAiCompatibleChatRequest {
  const baseUrl = normalizeLlmChatBaseUrl(config.baseUrl);
  const requestMessages = [
    ...(config.systemPrompt.trim()
      ? [
          {
            role: 'system',
            content: config.systemPrompt.trim(),
          },
        ]
      : []),
    ...messages.map(message => ({
      role: message.role,
      content: message.content,
    })),
  ];

  return {
    url: `${baseUrl}/v1/chat/completions`,
    headers: {
      authorization: `Bearer ${token.trim()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model.trim(),
      stream: true,
      messages: requestMessages,
    }),
  };
}

function readChoiceDeltaContent(choice: unknown) {
  if (!choice || typeof choice !== 'object') {
    return '';
  }

  const delta = (choice as {delta?: unknown}).delta;
  if (!delta || typeof delta !== 'object') {
    return '';
  }

  const content = (delta as {content?: unknown}).content;
  return typeof content === 'string' ? content : '';
}

function hasFinishReason(choice: unknown) {
  if (!choice || typeof choice !== 'object') {
    return false;
  }

  return (
    typeof (choice as {finish_reason?: unknown}).finish_reason === 'string' &&
    (choice as {finish_reason?: string}).finish_reason !== null
  );
}

export function consumeOpenAiCompatibleStreamEvent(
  payload: string,
): OpenAiCompatibleStreamEventResult {
  const trimmed = payload.trim();
  if (!trimmed) {
    return {kind: 'noop'};
  }

  if (trimmed === '[DONE]') {
    return {kind: 'done'};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      kind: 'error',
      message: '服务端返回了无法解析的流式 JSON 数据。',
    };
  }

  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    const errorMessage = (parsed as {error?: {message?: unknown}}).error?.message;
    return {
      kind: 'error',
      message:
        typeof errorMessage === 'string'
          ? errorMessage
          : '服务端返回了错误响应。',
    };
  }

  const choices = Array.isArray((parsed as {choices?: unknown})?.choices)
    ? ((parsed as {choices: unknown[]}).choices ?? [])
    : [];
  const text = choices.map(readChoiceDeltaContent).join('');

  if (text) {
    return {
      kind: 'delta',
      text,
    };
  }

  if (choices.some(hasFinishReason)) {
    return {kind: 'done'};
  }

  return {kind: 'noop'};
}
