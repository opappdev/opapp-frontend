export type EventSourceReadyState = 0 | 1 | 2;

export type EventSourceInit = {
  withCredentials?: boolean;
};

export type SseEvent = {
  type: string;
  data: string;
  lastEventId: string;
  origin: string;
};

export type SseTransportResponse = {
  status: number;
  statusText: string | null;
  headers: Record<string, string>;
};

export type SseTransportRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  withCredentials?: boolean;
};

export type SseTransportListener = {
  onResponse?: (response: SseTransportResponse) => void;
  onChunk?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
};

export type SseTransportHandle = {
  connectionId: string;
  close: () => Promise<void> | void;
};

export type SseTransportFactory = (
  request: SseTransportRequest,
  listener: SseTransportListener,
) => Promise<SseTransportHandle>;

export type SseRequestOptions = {
  url: string | URL;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal | null;
  withCredentials?: boolean;
  onOpen?: (response: SseTransportResponse) => void;
  onEvent?: (event: SseEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
};

export type SseRequestHandle = {
  close: () => void;
  done: Promise<void>;
  options: Readonly<SseRequestOptions>;
};
