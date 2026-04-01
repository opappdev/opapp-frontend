import assert from 'node:assert/strict';
import {
  buildOpenAiCompatibleChatRequest,
  consumeOpenAiCompatibleStreamEvent,
  createDefaultLlmChatConfig,
  normalizeLlmChatBaseUrl,
  parsePersistedLlmChatConfig,
  validateLlmChatConfig,
} from '../../capabilities/llm-chat/src/model';

export function run() {
  assert.deepEqual(createDefaultLlmChatConfig(), {
    baseUrl: '',
    model: '',
    systemPrompt: '',
  });

  assert.equal(
    normalizeLlmChatBaseUrl('https://api.example.com///'),
    'https://api.example.com',
  );
  assert.deepEqual(
    parsePersistedLlmChatConfig(
      JSON.stringify({
        baseUrl: 'https://api.example.com',
        model: 'gpt-4.1-mini',
        systemPrompt: 'You are helpful.',
      }),
    ),
    {
      baseUrl: 'https://api.example.com',
      model: 'gpt-4.1-mini',
      systemPrompt: 'You are helpful.',
    },
  );

  assert.equal(
    validateLlmChatConfig(
      {
        baseUrl: '',
        model: 'gpt-4.1-mini',
        systemPrompt: '',
      },
      'token',
      'hello',
    ),
    '请先填写兼容 OpenAI 的 Base URL。',
  );

  const request = buildOpenAiCompatibleChatRequest({
    config: {
      baseUrl: 'https://api.example.com/',
      model: 'gpt-4.1-mini',
      systemPrompt: 'Answer briefly.',
    },
    token: 'demo-token',
    messages: [
      {
        role: 'user',
        content: 'Hello',
      },
    ],
  });

  assert.equal(request.url, 'https://api.example.com/v1/chat/completions');
  assert.equal(request.headers.authorization, 'Bearer demo-token');
  assert.equal(request.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(request.body), {
    model: 'gpt-4.1-mini',
    stream: true,
    messages: [
      {
        role: 'system',
        content: 'Answer briefly.',
      },
      {
        role: 'user',
        content: 'Hello',
      },
    ],
  });

  assert.deepEqual(
    consumeOpenAiCompatibleStreamEvent(
      JSON.stringify({
        choices: [
          {
            delta: {content: 'Hel'},
          },
          {
            delta: {content: 'lo'},
          },
        ],
      }),
    ),
    {
      kind: 'delta',
      text: 'Hello',
    },
  );

  assert.deepEqual(consumeOpenAiCompatibleStreamEvent('[DONE]'), {
    kind: 'done',
  });

  assert.deepEqual(
    consumeOpenAiCompatibleStreamEvent('{bad json'),
    {
      kind: 'error',
      message: '服务端返回了无法解析的流式 JSON 数据。',
    },
  );

  assert.deepEqual(
    consumeOpenAiCompatibleStreamEvent(
      JSON.stringify({
        error: {message: 'rate limit'},
      }),
    ),
    {
      kind: 'error',
      message: 'rate limit',
    },
  );
}
