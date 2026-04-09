import assert from 'node:assert/strict';
import {openSseRequestWithTransport} from '../../framework/sse/src/controller';
import type {SseTransportFactory} from '../../framework/sse/src/types';
import {
  openAiCompatibleStreamInterruptedErrorText,
  requestOpenAiCompatibleAgentTurn,
} from '../../framework/agent-runtime/src/openai-compatible-chat';

function createReplayTransport(chunks: ReadonlyArray<string>) {
  const calls: Array<{
    closed: boolean;
    request: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
    };
  }> = [];

  const transport: SseTransportFactory = async (request, listener) => {
    const call = {
      closed: false,
      request,
    };
    calls.push(call);

    queueMicrotask(() => {
      if (call.closed) {
        return;
      }

      listener.onResponse?.({
        status: 200,
        statusText: 'OK',
        headers: {'content-type': 'text/event-stream; charset=utf-8'},
      });

      for (const chunk of chunks) {
        if (call.closed) {
          return;
        }

        listener.onChunk?.(chunk);
      }

      if (!call.closed) {
        listener.onComplete?.();
      }
    });

    return {
      connectionId: `agent-openai-compatible-${calls.length}`,
      close() {
        call.closed = true;
      },
    };
  };

  return {
    calls,
    transport,
  };
}

function createOpenRequest(chunks: ReadonlyArray<string>) {
  const replay = createReplayTransport(chunks);
  return {
    calls: replay.calls,
    openRequest: (options: Parameters<typeof openSseRequestWithTransport>[0]) =>
      openSseRequestWithTransport(options, replay.transport),
  };
}

function createChunk(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function run() {
  const toolCallRequest = createOpenRequest([
    createChunk({
      id: 'chatcmpl-tool-call',
      object: 'chat.completion.chunk',
      created: 1775063653,
      model: 'fixture-model',
      choices: [
        {
          index: 0,
          delta: {
            content: '先检查仓库状态。',
            tool_calls: [
              {
                index: 0,
                id: 'call_shell_1',
                function: {
                  name: 'shell_command',
                  arguments: '{"command":"git ',
                },
              },
            ],
          },
          finish_reason: null,
        },
      ],
    }),
    createChunk({
      id: 'chatcmpl-tool-call',
      object: 'chat.completion.chunk',
      created: 1775063654,
      model: 'fixture-model',
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              {
                index: 0,
                function: {
                  arguments:
                    'status --short","cwd":"opapp-frontend","shell":"powershell","env":{"CI":"0"}}',
                },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    }),
    'data: [DONE]\n\n',
  ]);

  const toolCallResult = await requestOpenAiCompatibleAgentTurn({
    provider: {
      providerId: 'custom-openai-compatible',
      label: 'Fixture',
      apiFamily: 'chat-completions',
      baseUrl: 'http://127.0.0.1:1234',
      model: 'fixture-model',
      token: 'fixture-token',
      systemPrompt: 'You are a fixture.',
    },
    messages: [
      {
        role: 'system',
        content: 'Always use shell_command first.',
      },
      {
        role: 'user',
        content: 'Run git status --short in opapp-frontend.',
      },
    ],
    allowToolCalls: true,
    openSseRequestImpl: toolCallRequest.openRequest,
  });

  assert.equal(toolCallRequest.calls.length, 1);
  assert.equal(
    toolCallRequest.calls[0]?.request.url,
    'http://127.0.0.1:1234/v1/chat/completions',
  );
  assert.equal(toolCallRequest.calls[0]?.request.method, 'POST');
  assert.equal(
    toolCallRequest.calls[0]?.request.headers.authorization,
    'Bearer fixture-token',
  );
  assert.match(toolCallRequest.calls[0]?.request.body ?? '', /"stream":true/);
  assert.match(
    toolCallRequest.calls[0]?.request.body ?? '',
    /"tool_choice":"auto"/,
  );
  assert.equal(toolCallResult.assistantText, '先检查仓库状态。');
  assert.equal(toolCallResult.toolCalls.length, 1);
  assert.deepEqual(toolCallResult.toolCalls[0], {
    callId: 'call_shell_1',
    name: 'shell_command',
    argumentsText:
      '{"command":"git status --short","cwd":"opapp-frontend","shell":"powershell","env":{"CI":"0"}}',
    request: {
      command: 'git status --short',
      cwd: 'opapp-frontend',
      shell: 'powershell',
      env: {
        CI: '0',
      },
    },
  });

  const continuationRequest = createOpenRequest([
    createChunk({
      id: 'chatcmpl-continuation',
      object: 'chat.completion.chunk',
      created: 1775063655,
      model: 'fixture-model',
      choices: [
        {
          index: 0,
          delta: {
            content: '命令没有执行。',
          },
          finish_reason: null,
        },
      ],
    }),
    createChunk({
      id: 'chatcmpl-continuation',
      object: 'chat.completion.chunk',
      created: 1775063656,
      model: 'fixture-model',
      choices: [
        {
          index: 0,
          delta: {
            content: '用户拒绝了这次写入请求。',
          },
          finish_reason: 'stop',
        },
      ],
    }),
  ]);

  const continuationResult = await requestOpenAiCompatibleAgentTurn({
    provider: {
      providerId: 'custom-openai-compatible',
      label: 'Fixture',
      apiFamily: 'chat-completions',
      baseUrl: 'http://127.0.0.1:1234',
      model: 'fixture-model',
      token: 'fixture-token',
      systemPrompt: '',
    },
    messages: [
      {
        role: 'user',
        content: 'Explain what happened.',
      },
    ],
    allowToolCalls: false,
    openSseRequestImpl: continuationRequest.openRequest,
  });

  assert.equal(continuationRequest.calls.length, 1);
  assert.match(
    continuationRequest.calls[0]?.request.body ?? '',
    /"tool_choice":"none"/,
  );
  assert.equal(
    continuationResult.assistantText,
    '命令没有执行。用户拒绝了这次写入请求。',
  );
  assert.deepEqual(continuationResult.toolCalls, []);

  const truncatedRequest = createOpenRequest([
    createChunk({
      id: 'chatcmpl-truncated',
      object: 'chat.completion.chunk',
      created: 1775063657,
      model: 'fixture-model',
      choices: [
        {
          index: 0,
          delta: {
            content: 'partial',
          },
          finish_reason: null,
        },
      ],
    }),
  ]);

  await assert.rejects(
    requestOpenAiCompatibleAgentTurn({
      provider: {
        providerId: 'custom-openai-compatible',
        label: 'Fixture',
        apiFamily: 'chat-completions',
        baseUrl: 'http://127.0.0.1:1234',
        model: 'fixture-model',
        token: 'fixture-token',
        systemPrompt: '',
      },
      messages: [
        {
          role: 'user',
          content: 'Hello truncated stream.',
        },
      ],
      allowToolCalls: false,
      openSseRequestImpl: truncatedRequest.openRequest,
    }),
    new RegExp(openAiCompatibleStreamInterruptedErrorText),
  );
}
