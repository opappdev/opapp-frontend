import {openSseRequest, type SseRequestHandle} from '@opapp/framework-sse';
import {
  buildOpenAiCompatibleChatRequest,
  consumeOpenAiCompatibleStreamEvent,
  type LlmChatMessage,
  type PersistedLlmChatConfig,
} from './model';

export function streamOpenAiCompatibleChat({
  config,
  token,
  messages,
  signal,
  onOpen,
  onDelta,
  onDone,
  onError,
}: {
  config: PersistedLlmChatConfig;
  token: string;
  messages: ReadonlyArray<LlmChatMessage>;
  signal?: AbortSignal | null;
  onOpen?: () => void;
  onDelta?: (text: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}): SseRequestHandle {
  const request = buildOpenAiCompatibleChatRequest({
    config,
    token,
    messages,
  });

  let finished = false;
  let requestHandle: SseRequestHandle | null = null;

  function finishDone() {
    if (finished) {
      return;
    }

    finished = true;
    onDone?.();
  }

  function finishError(error: Error) {
    if (finished) {
      return;
    }

    finished = true;
    onError?.(error);
  }

  requestHandle = openSseRequest({
    url: request.url,
    method: 'POST',
    headers: request.headers,
    body: request.body,
    signal,
    onOpen() {
      onOpen?.();
    },
    onEvent(event) {
      if (event.type !== 'message') {
        return;
      }

      const result = consumeOpenAiCompatibleStreamEvent(event.data);
      switch (result.kind) {
        case 'delta':
          onDelta?.(result.text);
          return;
        case 'done':
          requestHandle?.close();
          finishDone();
          return;
        case 'error':
          requestHandle?.close();
          finishError(new Error(result.message));
          return;
        default:
          return;
      }
    },
    onError(error) {
      finishError(error);
    },
    onComplete() {
      finishDone();
    },
  });

  requestHandle.done.catch(error => {
    if (error instanceof Error) {
      finishError(error);
      return;
    }

    finishError(new Error('聊天请求意外失败。'));
  });

  return {
    ...requestHandle,
    close() {
      requestHandle?.close();
      finishDone();
    },
  };
}
