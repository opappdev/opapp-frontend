import assert from 'node:assert/strict';
import {openSseRequestWithTransport} from '../../framework/sse/src/controller';
import type {
  SseRequestHandle,
  SseRequestOptions,
  SseTransportFactory,
} from '../../framework/sse/src/types';
import {
  llmChatStreamInterruptedErrorText,
  streamOpenAiCompatibleChatWithOpenSseRequest,
} from '../../capabilities/llm-chat/src/stream-core';
import {
  lmStudioExpectedAssistantText,
  lmStudioRecordedSseChunks,
} from './fixtures/lm-studio-chat-stream';

const llmChatMalformedChunkErrorText =
  '服务端返回了无法解析的流式 JSON 数据。';

type CapturedOpenRequest = {
  closed: boolean;
  handle: SseRequestHandle;
  options: SseRequestOptions;
  rejectDone: (error: Error) => void;
};

function createCapturedOpenRequest() {
  const calls: CapturedOpenRequest[] = [];

  const openRequest = (options: SseRequestOptions): SseRequestHandle => {
    let resolveDone!: () => void;
    let rejectDone!: (error: Error) => void;
    const call = {} as CapturedOpenRequest;
    const done = new Promise<void>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });

    call.closed = false;
    call.options = options;
    call.rejectDone = rejectDone;
    call.handle = {
      close() {
        if (call.closed) {
          return;
        }

        call.closed = true;
        resolveDone();
      },
      done,
      options,
    };
    calls.push(call);
    return call.handle;
  };

  return {
    calls,
    openRequest,
  };
}

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
      connectionId: `replay-${calls.length}`,
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

export async function run() {
  const successfulReplay = createReplayTransport(lmStudioRecordedSseChunks);
  const observedDeltas: string[] = [];
  const observedErrors: string[] = [];
  let opened = 0;
  let doneCount = 0;

  const successfulHandle = streamOpenAiCompatibleChatWithOpenSseRequest(
    {
      config: {
        baseUrl: 'http://127.0.0.1:1234',
        model: 'minimax/minimax-m2.5',
        systemPrompt: '',
      },
      token: 'lm-studio',
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: 'Reply with exactly TEST_OK and nothing else.',
        },
      ],
      onOpen() {
        opened += 1;
      },
      onDelta(text) {
        observedDeltas.push(text);
      },
      onDone() {
        doneCount += 1;
      },
      onError(error) {
        observedErrors.push(error.message);
      },
    },
    options => openSseRequestWithTransport(options, successfulReplay.transport),
  );

  await successfulHandle.done;

  assert.equal(successfulReplay.calls.length, 1);
  assert.equal(
    successfulReplay.calls[0]?.request.url,
    'http://127.0.0.1:1234/v1/chat/completions',
  );
  assert.equal(successfulReplay.calls[0]?.request.method, 'POST');
  assert.equal(
    successfulReplay.calls[0]?.request.headers.authorization,
    'Bearer lm-studio',
  );
  assert.match(
    successfulReplay.calls[0]?.request.body ?? '',
    /"stream":true/,
  );

  assert.equal(opened, 1);
  assert.deepEqual(observedDeltas, ['\n\n', lmStudioExpectedAssistantText]);
  assert.equal(doneCount, 1);
  assert.deepEqual(observedErrors, []);
  assert.equal(successfulReplay.calls[0]?.closed, true);

  const failingRequest = createCapturedOpenRequest();
  const failureErrors: string[] = [];
  let failureDoneCount = 0;
  const failingHandle = streamOpenAiCompatibleChatWithOpenSseRequest(
    {
      config: {
        baseUrl: 'http://127.0.0.1:1234',
        model: 'minimax/minimax-m2.5',
        systemPrompt: '',
      },
      token: 'lm-studio',
      messages: [
        {
          id: 'user-2',
          role: 'user',
          content: 'Hello',
        },
      ],
      onDone() {
        failureDoneCount += 1;
      },
      onError(error) {
        failureErrors.push(error.message);
      },
    },
    failingRequest.openRequest,
  );

  assert.equal(failingRequest.calls.length, 1);
  failingRequest.calls[0]?.rejectDone(new Error('network down'));
  await assert.rejects(failingHandle.done, /network down/);
  await new Promise(resolve => {
    setTimeout(resolve, 0);
  });

  assert.deepEqual(failureErrors, ['network down']);
  assert.equal(failureDoneCount, 0);

  const abortController = new AbortController();
  let abortDoneCount = 0;
  const abortErrors: string[] = [];
  const abortHandle = streamOpenAiCompatibleChatWithOpenSseRequest(
    {
      config: {
        baseUrl: 'http://127.0.0.1:1234',
        model: 'minimax/minimax-m2.5',
        systemPrompt: '',
      },
      token: 'lm-studio',
      signal: abortController.signal,
      messages: [
        {
          id: 'user-abort',
          role: 'user',
          content: 'Hello abort',
        },
      ],
      onDone() {
        abortDoneCount += 1;
      },
      onError(error) {
        abortErrors.push(error.message);
      },
    },
    options =>
      openSseRequestWithTransport(options, async () => ({
        connectionId: 'abortable',
        close() {},
      })),
  );

  abortController.abort();
  await abortHandle.done;

  assert.equal(abortDoneCount, 0);
  assert.deepEqual(abortErrors, []);

  const malformedReplay = createReplayTransport([
    'data: {"choices":[}\n\n',
  ]);
  const malformedErrors: string[] = [];
  let malformedDoneCount = 0;
  const malformedHandle = streamOpenAiCompatibleChatWithOpenSseRequest(
    {
      config: {
        baseUrl: 'http://127.0.0.1:1234',
        model: 'minimax/minimax-m2.5',
        systemPrompt: '',
      },
      token: 'lm-studio',
      messages: [
        {
          id: 'user-malformed',
          role: 'user',
          content: 'Hello malformed',
        },
      ],
      onDone() {
        malformedDoneCount += 1;
      },
      onError(error) {
        malformedErrors.push(error.message);
      },
    },
    options => openSseRequestWithTransport(options, malformedReplay.transport),
  );

  await assert.rejects(
    malformedHandle.done,
    new RegExp(llmChatMalformedChunkErrorText),
  );

  assert.equal(malformedReplay.calls.length, 1);
  assert.equal(malformedDoneCount, 0);
  assert.deepEqual(malformedErrors, [llmChatMalformedChunkErrorText]);

  const truncatedReplay = createReplayTransport([
    'data: {"id":"chatcmpl-truncated","object":"chat.completion.chunk","created":1775063653,"model":"fixture-model","choices":[{"index":0,"delta":{"content":"partial"},"logprobs":null,"finish_reason":null}]}\n\n',
  ]);
  const truncatedErrors: string[] = [];
  const truncatedDeltas: string[] = [];
  let truncatedOpened = 0;
  let truncatedDoneCount = 0;
  const truncatedHandle = streamOpenAiCompatibleChatWithOpenSseRequest(
    {
      config: {
        baseUrl: 'http://127.0.0.1:1234',
        model: 'minimax/minimax-m2.5',
        systemPrompt: '',
      },
      token: 'lm-studio',
      messages: [
        {
          id: 'user-3',
          role: 'user',
          content: 'Hello again',
        },
      ],
      onOpen() {
        truncatedOpened += 1;
      },
      onDelta(text) {
        truncatedDeltas.push(text);
      },
      onDone() {
        truncatedDoneCount += 1;
      },
      onError(error) {
        truncatedErrors.push(error.message);
      },
    },
    options => openSseRequestWithTransport(options, truncatedReplay.transport),
  );

  await assert.rejects(
    truncatedHandle.done,
    new RegExp(llmChatStreamInterruptedErrorText),
  );

  assert.equal(truncatedReplay.calls.length, 1);
  assert.equal(truncatedOpened, 1);
  assert.deepEqual(truncatedDeltas, ['partial']);
  assert.equal(truncatedDoneCount, 0);
  assert.deepEqual(truncatedErrors, [llmChatStreamInterruptedErrorText]);
}
