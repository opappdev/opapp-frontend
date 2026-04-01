import {createSseParser} from './parser';
import {
  createUnsupportedTransportError,
  isUnsupportedTransportError,
  normalizeHeaderRecord,
  normalizeUnknownError,
  resolveSseOrigin,
  resolveSseUrlString,
  validateSseResponse,
  DEFAULT_EVENT_SOURCE_RETRY_MS,
} from './shared';
import type {
  EventSourceReadyState,
  SseEvent,
  SseRequestHandle,
  SseRequestOptions,
  SseTransportFactory,
  SseTransportHandle,
  SseTransportRequest,
  SseTransportResponse,
} from './types';

function stopTransportHandle(handle: SseTransportHandle | null) {
  if (!handle) {
    return;
  }

  try {
    void Promise.resolve(handle.close());
  } catch {
    // Best-effort close; transport teardown should not crash the caller.
  }
}

function buildEventSourceRequest({
  url,
  withCredentials,
  lastEventId,
}: {
  url: string;
  withCredentials: boolean;
  lastEventId: string;
}): SseTransportRequest {
  const headers: Record<string, string> = {
    accept: 'text/event-stream',
    'cache-control': 'no-cache',
  };

  if (lastEventId) {
    headers['last-event-id'] = lastEventId;
  }

  return {
    url,
    method: 'GET',
    headers,
    withCredentials,
  };
}

export function createEventSourceController({
  url,
  withCredentials,
  transportFactory,
  onReadyStateChange,
  onOpen,
  onMessage,
  onNamedEvent,
  onError,
}: {
  url: string;
  withCredentials: boolean;
  transportFactory: SseTransportFactory;
  onReadyStateChange: (readyState: EventSourceReadyState) => void;
  onOpen: () => void;
  onMessage: (event: SseEvent) => void;
  onNamedEvent: (event: SseEvent) => void;
  onError: (error: Error) => void;
}) {
  let readyState: EventSourceReadyState = 0;
  let reconnectDelayMs = DEFAULT_EVENT_SOURCE_RETRY_MS;
  let lastEventId = '';
  let activeHandle: SseTransportHandle | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let attemptId = 0;
  const origin = resolveSseOrigin(url);

  function setReadyState(nextReadyState: EventSourceReadyState) {
    readyState = nextReadyState;
    onReadyStateChange(nextReadyState);
  }

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function finalizeClosed() {
    clearReconnectTimer();
    stopTransportHandle(activeHandle);
    activeHandle = null;
    setReadyState(2);
  }

  function scheduleReconnect(error: Error) {
    if (closed) {
      finalizeClosed();
      return;
    }

    stopTransportHandle(activeHandle);
    activeHandle = null;
    onError(error);
    setReadyState(0);
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void openAttempt();
    }, reconnectDelayMs);
  }

  async function openAttempt() {
    if (closed) {
      finalizeClosed();
      return;
    }

    const currentAttempt = ++attemptId;
    let responseAccepted = false;
    let attemptFinished = false;
    let openedHandle: SseTransportHandle | null = null;
    const parser = createSseParser({
      origin,
      initialLastEventId: lastEventId,
      onRetry(retryMs) {
        reconnectDelayMs = retryMs;
      },
      onEvent(event) {
        lastEventId = event.lastEventId;
        if (event.type === 'message') {
          onMessage(event);
          return;
        }

        onNamedEvent(event);
      },
    });

    const finishAttempt = (callback: () => void) => {
      if (attemptFinished || currentAttempt !== attemptId) {
        return;
      }

      attemptFinished = true;
      callback();
    };

    try {
      const handle = await transportFactory(
        buildEventSourceRequest({
          url,
          withCredentials,
          lastEventId,
        }),
        {
          onResponse(response) {
            if (closed || currentAttempt !== attemptId) {
              return;
            }

            const validationError = validateSseResponse(response);
            if (validationError) {
              finishAttempt(() => {
                stopTransportHandle(openedHandle ?? activeHandle);
                openedHandle = null;
                activeHandle = null;
                onError(validationError);
                finalizeClosed();
              });
              return;
            }

            responseAccepted = true;
            setReadyState(1);
            onOpen();
          },
          onChunk(chunk) {
            if (
              closed ||
              currentAttempt !== attemptId ||
              !responseAccepted ||
              attemptFinished
            ) {
              return;
            }

            parser.push(chunk);
          },
          onComplete() {
            if (closed || currentAttempt !== attemptId) {
              return;
            }

            finishAttempt(() => {
              parser.finish();
              activeHandle = null;

              if (!responseAccepted) {
                scheduleReconnect(
                  new Error('EventSource connection closed before the response was accepted.'),
                );
                return;
              }

              scheduleReconnect(
                new Error('EventSource connection closed unexpectedly and will reconnect.'),
              );
            });
          },
          onError(error) {
            if (closed || currentAttempt !== attemptId) {
              return;
            }

            const normalizedError = normalizeUnknownError(
              error,
              'EventSource transport failed.',
            );
            finishAttempt(() => {
              activeHandle = null;

              if (isUnsupportedTransportError(normalizedError)) {
                onError(normalizedError);
                finalizeClosed();
                return;
              }

              scheduleReconnect(normalizedError);
            });
          },
        },
      );

      if (closed || currentAttempt !== attemptId) {
        stopTransportHandle(handle);
        finalizeClosed();
        return;
      }

      openedHandle = handle;
      activeHandle = handle;
    } catch (error) {
      const normalizedError = normalizeUnknownError(
        error,
        'Failed to open the EventSource transport.',
      );
      if (closed || currentAttempt !== attemptId) {
        finalizeClosed();
        return;
      }

      if (isUnsupportedTransportError(normalizedError)) {
        onError(normalizedError);
        finalizeClosed();
        return;
      }

      scheduleReconnect(normalizedError);
    }
  }

  setReadyState(0);
  void openAttempt();

  return {
    getReadyState() {
      return readyState;
    },
    close() {
      if (closed) {
        return;
      }

      closed = true;
      finalizeClosed();
    },
  };
}

export function openSseRequestWithTransport(
  options: SseRequestOptions,
  transportFactory: SseTransportFactory,
): SseRequestHandle {
  const url = resolveSseUrlString(options.url);
  const method = (options.method ?? 'GET').trim().toUpperCase() || 'GET';
  const headers = {
    accept: 'text/event-stream',
    ...normalizeHeaderRecord(options.headers),
  };
  const origin = resolveSseOrigin(url);
  const normalizedOptions: Readonly<SseRequestOptions> = Object.freeze({
    ...options,
    url,
    method,
    headers,
  });

  let activeHandle: SseTransportHandle | null = null;
  let finished = false;
  let closed = false;
  let responseAccepted = false;
  let abortListener: (() => void) | null = null;

  let resolveDone!: () => void;
  let rejectDone!: (error: Error) => void;
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  const parser = createSseParser({
    origin,
    onEvent(event) {
      options.onEvent?.(event);
    },
  });

  function cleanupAbortSubscription() {
    if (abortListener && options.signal) {
      options.signal.removeEventListener('abort', abortListener);
    }
    abortListener = null;
  }

  function finalizeResolve() {
    if (finished) {
      return;
    }

    finished = true;
    cleanupAbortSubscription();
    resolveDone();
  }

  function finalizeReject(error: Error) {
    if (finished) {
      return;
    }

    finished = true;
    cleanupAbortSubscription();
    options.onError?.(error);
    rejectDone(error);
  }

  function close() {
    if (closed) {
      return;
    }

    closed = true;
    stopTransportHandle(activeHandle);
    activeHandle = null;
    finalizeResolve();
  }

  if (options.signal) {
    abortListener = () => {
      close();
    };

    if (options.signal.aborted) {
      close();
    } else {
      options.signal.addEventListener('abort', abortListener, {once: true});
    }
  }

  if (!closed) {
    void transportFactory(
      {
        url,
        method,
        headers,
        body: options.body,
        withCredentials: options.withCredentials,
      },
      {
        onResponse(response: SseTransportResponse) {
          if (closed || finished) {
            return;
          }

          const validationError = validateSseResponse(response);
          if (validationError) {
            stopTransportHandle(activeHandle);
            activeHandle = null;
            finalizeReject(validationError);
            return;
          }

          responseAccepted = true;
          options.onOpen?.(response);
        },
        onChunk(chunk) {
          if (closed || finished || !responseAccepted) {
            return;
          }

          parser.push(chunk);
        },
        onComplete() {
          if (closed) {
            finalizeResolve();
            return;
          }

          if (!responseAccepted) {
            finalizeReject(
              new Error('SSE request completed before the response was accepted.'),
            );
            return;
          }

          parser.finish();
          options.onComplete?.();
          finalizeResolve();
        },
        onError(error) {
          if (closed) {
            finalizeResolve();
            return;
          }

          finalizeReject(
            normalizeUnknownError(error, 'SSE request transport failed.'),
          );
        },
      },
    )
      .then(handle => {
        if (closed || finished) {
          stopTransportHandle(handle);
          return;
        }

        activeHandle = handle;
      })
      .catch(error => {
        if (closed) {
          finalizeResolve();
          return;
        }

        if (isUnsupportedTransportError(error)) {
          finalizeReject(error);
          return;
        }

        finalizeReject(
          normalizeUnknownError(error, 'Failed to open the SSE request transport.'),
        );
      });
  }

  return {
    close,
    done,
    options: normalizedOptions,
  };
}

export function assertNativeTransportAvailable(
  transportAvailable: boolean,
): void {
  if (!transportAvailable) {
    throw createUnsupportedTransportError();
  }
}
