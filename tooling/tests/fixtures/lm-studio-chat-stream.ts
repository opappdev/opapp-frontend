function createSseDataBlock(payload: string) {
  return `data: ${payload}\n\n`;
}

export const lmStudioRecordedMessagePayloads = [
  JSON.stringify({
    id: 'chatcmpl-lmstudio-fixture',
    object: 'chat.completion.chunk',
    created: 1775063653,
    model: 'minimax/minimax-m2.5',
    system_fingerprint: 'minimax/minimax-m2.5',
    choices: [
      {
        index: 0,
        delta: {
          role: 'assistant',
          reasoning_content: 'The',
        },
        logprobs: null,
        finish_reason: null,
      },
    ],
  }),
  JSON.stringify({
    id: 'chatcmpl-lmstudio-fixture',
    object: 'chat.completion.chunk',
    created: 1775063653,
    model: 'minimax/minimax-m2.5',
    system_fingerprint: 'minimax/minimax-m2.5',
    choices: [
      {
        index: 0,
        delta: {
          reasoning_content: ' answer',
        },
        logprobs: null,
        finish_reason: null,
      },
    ],
  }),
  JSON.stringify({
    id: 'chatcmpl-lmstudio-fixture',
    object: 'chat.completion.chunk',
    created: 1775063653,
    model: 'minimax/minimax-m2.5',
    system_fingerprint: 'minimax/minimax-m2.5',
    choices: [
      {
        index: 0,
        delta: {
          content: '\n\n',
        },
        logprobs: null,
        finish_reason: null,
      },
    ],
  }),
  JSON.stringify({
    id: 'chatcmpl-lmstudio-fixture',
    object: 'chat.completion.chunk',
    created: 1775063653,
    model: 'minimax/minimax-m2.5',
    system_fingerprint: 'minimax/minimax-m2.5',
    choices: [
      {
        index: 0,
        delta: {
          content: 'CHAT_TEST_OK',
        },
        logprobs: null,
        finish_reason: null,
      },
    ],
  }),
  JSON.stringify({
    id: 'chatcmpl-lmstudio-fixture',
    object: 'chat.completion.chunk',
    created: 1775063653,
    model: 'minimax/minimax-m2.5',
    system_fingerprint: 'minimax/minimax-m2.5',
    choices: [
      {
        index: 0,
        delta: {},
        logprobs: null,
        finish_reason: 'stop',
      },
    ],
  }),
  '[DONE]',
] as const;

export const lmStudioRecordedSseStream = lmStudioRecordedMessagePayloads
  .map(createSseDataBlock)
  .join('');

export const lmStudioRecordedSseChunks = [
  lmStudioRecordedSseStream.slice(0, 197),
  lmStudioRecordedSseStream.slice(197, 611),
  lmStudioRecordedSseStream.slice(611),
] as const;

export const lmStudioExpectedAssistantText = 'CHAT_TEST_OK';
