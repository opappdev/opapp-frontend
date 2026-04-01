import {
  assertNativeTransportAvailable,
  createEventSourceController,
  openSseRequestWithTransport,
} from './controller';
import {openNativeSseTransport, isNativeSseTransportAvailable} from './native';
import {resolveSseUrlString} from './shared';
import type {
  EventSourceInit,
  EventSourceReadyState,
  SseEvent,
  SseRequestHandle,
  SseRequestOptions,
} from './types';

type EventSourcePropertyHandler<TEvent extends Event> =
  | ((this: EventSource, event: TEvent) => void)
  | null;

class FallbackEvent {
  readonly type: string;

  constructor(type: string) {
    this.type = type;
  }
}

class FallbackMessageEvent<TData> extends FallbackEvent {
  readonly data: TData;
  readonly origin: string;
  readonly lastEventId: string;

  constructor(
    type: string,
    init?: {
      data?: TData;
      origin?: string;
      lastEventId?: string;
    },
  ) {
    super(type);
    this.data = init?.data as TData;
    this.origin = init?.origin ?? '';
    this.lastEventId = init?.lastEventId ?? '';
  }
}

class FallbackEventTarget {
  private readonly listeners = new Map<string, Set<(event: Event) => void>>();

  addEventListener(type: string, listener: ((event: Event) => void) | null) {
    if (!listener) {
      return;
    }

    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: ((event: Event) => void) | null) {
    if (!listener) {
      return;
    }

    const listeners = this.listeners.get(type);
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) {
      this.listeners.delete(type);
    }
  }

  dispatchEvent(event: Event) {
    const listeners = this.listeners.get(event.type);
    if (!listeners) {
      return true;
    }

    for (const listener of listeners) {
      listener.call(this, event);
    }

    return true;
  }
}

const EventTargetBase =
  typeof EventTarget === 'function' ? EventTarget : FallbackEventTarget;
const EventBase =
  typeof Event === 'function'
    ? Event
    : (FallbackEvent as unknown as typeof Event);
const MessageEventBase =
  typeof MessageEvent === 'function'
    ? MessageEvent
    : (FallbackMessageEvent as unknown as typeof MessageEvent);

export class EventSource extends EventTargetBase {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = EventSource.CONNECTING;
  readonly OPEN = EventSource.OPEN;
  readonly CLOSED = EventSource.CLOSED;
  readonly url: string;
  readonly withCredentials: boolean;

  onopen: EventSourcePropertyHandler<Event> = null;
  onmessage: EventSourcePropertyHandler<MessageEvent> = null;
  onerror: EventSourcePropertyHandler<Event> = null;

  private controller: {close: () => void; getReadyState: () => EventSourceReadyState};
  private internalReadyState: EventSourceReadyState = EventSource.CONNECTING;

  constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
    super();
    assertNativeTransportAvailable(isNativeSseTransportAvailable());
    this.url = resolveSseUrlString(url);
    this.withCredentials = eventSourceInitDict?.withCredentials === true;
    this.controller = createEventSourceController({
      url: this.url,
      withCredentials: this.withCredentials,
      transportFactory: openNativeSseTransport,
      onReadyStateChange: readyState => {
        this.internalReadyState = readyState;
      },
      onOpen: () => {
        const event = new EventBase('open');
        this.dispatchEvent(event);
        this.onopen?.call(this, event);
      },
      onMessage: event => {
        const messageEvent = this.createMessageEvent(event);
        this.dispatchEvent(messageEvent);
        this.onmessage?.call(this, messageEvent);
      },
      onNamedEvent: event => {
        this.dispatchEvent(this.createMessageEvent(event));
      },
      onError: error => {
        const event = new EventBase('error');
        (event as Event & {error?: Error}).error = error;
        this.dispatchEvent(event);
        this.onerror?.call(this, event);
      },
    });
  }

  get readyState(): EventSourceReadyState {
    return this.internalReadyState;
  }

  close() {
    this.controller.close();
  }

  addEventListener(
    type: string,
    listener: ((event: Event) => void) | null,
    options?: boolean | unknown,
  ) {
    return super.addEventListener(type, listener, options);
  }

  removeEventListener(
    type: string,
    listener: ((event: Event) => void) | null,
    options?: boolean | unknown,
  ) {
    return super.removeEventListener(type, listener, options);
  }

  dispatchEvent(event: Event) {
    return super.dispatchEvent(event);
  }

  private createMessageEvent(event: SseEvent) {
    return new MessageEventBase<string>(event.type, {
      data: event.data,
      origin: event.origin,
      lastEventId: event.lastEventId,
    });
  }
}

export function openSseRequest(options: SseRequestOptions): SseRequestHandle {
  assertNativeTransportAvailable(isNativeSseTransportAvailable());
  return openSseRequestWithTransport(options, openNativeSseTransport);
}

export function installEventSourcePolyfill(
  target: {EventSource?: unknown} = globalThis as {EventSource?: unknown},
) {
  target.EventSource = EventSource;
  return EventSource;
}

export type {
  EventSourceInit,
  EventSourceReadyState,
  SseEvent,
  SseRequestHandle,
  SseRequestOptions,
} from './types';
