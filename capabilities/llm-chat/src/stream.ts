import {openSseRequest, type SseRequestHandle} from '@opapp/framework-sse';
import type {LlmChatMessage, PersistedLlmChatConfig} from './model';
import {streamOpenAiCompatibleChatWithOpenSseRequest} from './stream-core';

export type {OpenLlmChatSseRequest} from './stream-core';

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
  return streamOpenAiCompatibleChatWithOpenSseRequest(
    {
      config,
      token,
      messages,
      signal,
      onOpen,
      onDelta,
      onDone,
      onError,
    },
    openSseRequest,
  );
}
