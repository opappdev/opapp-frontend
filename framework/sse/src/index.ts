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

export class EventSource extends EventTarget {
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
        const event = new Event('open');
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
        const event = new Event('error');
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

  private createMessageEvent(event: SseEvent) {
    return new MessageEvent<string>(event.type, {
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
