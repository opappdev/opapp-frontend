import type {
  SseEvent,
  SseRequestHandle,
  SseRequestOptions,
} from '../../../framework/sse/src/types';
import {
  buildOpenAiCompatibleChatRequest,
  consumeOpenAiCompatibleStreamEvent,
  type LlmChatMessage,
  type PersistedLlmChatConfig,
} from './model';

export type OpenLlmChatSseRequest = (
  options: SseRequestOptions,
) => SseRequestHandle;

export const llmChatStreamInterruptedErrorText =
  '服务端在完成流式响应前中断了连接。';

export function streamOpenAiCompatibleChatWithOpenSseRequest(
  {
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
  },
  openSseRequestImpl: OpenLlmChatSseRequest,
): SseRequestHandle {
  const request = buildOpenAiCompatibleChatRequest({
    config,
    token,
    messages,
  });

  let finished = false;
  let doneSettled = false;
  let requestHandle: SseRequestHandle | null = null;
  let sawTerminalChunk = false;
  let resolveDone!: () => void;
  let rejectDone!: (error: Error) => void;
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  // Keep protocol-error rejections from surfacing as unhandled when callers only
  // consume callback-style completion.
  done.catch(() => {});

  function resolveWrapperDone() {
    if (doneSettled) {
      return;
    }

    doneSettled = true;
    resolveDone();
  }

  function rejectWrapperDone(error: Error) {
    if (doneSettled) {
      return;
    }

    doneSettled = true;
    rejectDone(error);
  }

  function finishDone() {
    if (finished) {
      return;
    }

    finished = true;
    resolveWrapperDone();
    onDone?.();
  }

  function finishError(error: Error) {
    if (finished) {
      return;
    }

    finished = true;
    rejectWrapperDone(error);
    onError?.(error);
  }

  requestHandle = openSseRequestImpl({
    url: request.url,
    method: 'POST',
    headers: request.headers,
    body: request.body,
    signal,
    onOpen() {
      onOpen?.();
    },
    onEvent(event: SseEvent) {
      if (event.type !== 'message') {
        return;
      }

      const result = consumeOpenAiCompatibleStreamEvent(event.data);
      switch (result.kind) {
        case 'delta':
          onDelta?.(result.text);
          return;
        case 'done':
          sawTerminalChunk = true;
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
    onError(error: Error) {
      finishError(error);
    },
    onComplete() {
      if (!sawTerminalChunk) {
        finishError(new Error(llmChatStreamInterruptedErrorText));
        return;
      }

      finishDone();
    },
  });

  requestHandle.done
    .then(() => {
      if (finished) {
        return;
      }

      resolveWrapperDone();
    })
    .catch((error: unknown) => {
      if (error instanceof Error) {
        finishError(error);
        return;
      }

      finishError(new Error('聊天请求意外失败。'));
    });

  return {
    ...requestHandle,
    done,
    close() {
      requestHandle?.close();
      finishDone();
    },
  };
}
