import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import {
  createUnsupportedTransportError,
  normalizeHeaderRecord,
  normalizeUnknownError,
} from './shared';
import type {
  SseTransportFactory,
  SseTransportHandle,
  SseTransportListener,
  SseTransportRequest,
  SseTransportResponse,
} from './types';

type NativeSseBridge = {
  open(requestJson: string): Promise<string>;
  close(connectionId: string): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

type NativeSseEventPayload = {
  connectionId?: string;
  type?: string;
  status?: number;
  statusText?: string | null;
  headers?: Record<string, unknown> | null;
  chunk?: string;
  error?: string;
  code?: string;
};

const NATIVE_EVENT_NAME = 'opapp.sse';

const nativeSseBridge =
  (NativeModules.OpappSse as NativeSseBridge | undefined) ?? null;
let nativeEventSubscription: {remove: () => void} | null = null;
const nativeListeners = new Map<string, SseTransportListener>();
const pendingNativeEvents = new Map<string, NativeSseEventPayload[]>();
let nativeOpenRequestCount = 0;

function dispatchNativePayload(rawPayload: NativeSseEventPayload) {
  const connectionId = rawPayload?.connectionId?.trim();
  const type = rawPayload?.type?.trim();
  if (!connectionId || !type) {
    return;
  }

  const listener = nativeListeners.get(connectionId);
  if (!listener) {
    const pendingPayloads = pendingNativeEvents.get(connectionId) ?? [];
    pendingPayloads.push(rawPayload);
    pendingNativeEvents.set(connectionId, pendingPayloads);
    return;
  }

  switch (type) {
    case 'response': {
      const response: SseTransportResponse = {
        status: Number(rawPayload.status ?? 0),
        statusText:
          typeof rawPayload.statusText === 'string'
            ? rawPayload.statusText
            : null,
        headers: normalizeHeaderRecord(
          (rawPayload.headers as Record<string, string> | null | undefined) ??
            undefined,
        ),
      };
      listener.onResponse?.(response);
      break;
    }
    case 'chunk':
      if (typeof rawPayload.chunk === 'string') {
        listener.onChunk?.(rawPayload.chunk);
      }
      break;
    case 'complete':
      nativeListeners.delete(connectionId);
      pendingNativeEvents.delete(connectionId);
      listener.onComplete?.();
      break;
    case 'error': {
      nativeListeners.delete(connectionId);
      pendingNativeEvents.delete(connectionId);
      const error = new Error(
        rawPayload.error?.trim() || 'Native SSE transport failed.',
      );
      (error as Error & {code?: string}).code =
        rawPayload.code?.trim() || 'ERR_SSE_TRANSPORT_NATIVE';
      listener.onError?.(error);
      break;
    }
    default:
      break;
  }

  cleanupNativeEventSubscription();
}

function ensureNativeEventSubscription() {
  if (nativeEventSubscription || !nativeSseBridge) {
    return;
  }

  const emitter = new NativeEventEmitter(nativeSseBridge);
  nativeEventSubscription = emitter.addListener(
    NATIVE_EVENT_NAME,
    dispatchNativePayload,
  );
}

function cleanupNativeEventSubscription() {
  if (
    nativeOpenRequestCount !== 0 ||
    nativeListeners.size !== 0 ||
    pendingNativeEvents.size !== 0 ||
    !nativeEventSubscription
  ) {
    return;
  }

  nativeEventSubscription.remove();
  nativeEventSubscription = null;
}

export function isNativeSseTransportAvailable() {
  return (
    Platform.OS === 'windows' &&
    nativeSseBridge !== null &&
    typeof nativeSseBridge.open === 'function' &&
    typeof nativeSseBridge.close === 'function'
  );
}

export const openNativeSseTransport: SseTransportFactory = async (
  request: SseTransportRequest,
  listener: SseTransportListener,
): Promise<SseTransportHandle> => {
  if (!isNativeSseTransportAvailable() || !nativeSseBridge) {
    throw createUnsupportedTransportError();
  }

  ensureNativeEventSubscription();

  let connectionId = '';
  nativeOpenRequestCount += 1;
  try {
    connectionId = await nativeSseBridge.open(JSON.stringify(request));
    nativeOpenRequestCount -= 1;
    nativeListeners.set(connectionId, listener);
    const pendingPayloads = pendingNativeEvents.get(connectionId) ?? [];
    pendingNativeEvents.delete(connectionId);
    for (const pendingPayload of pendingPayloads) {
      dispatchNativePayload(pendingPayload);
    }
  } catch (error) {
    nativeOpenRequestCount -= 1;
    cleanupNativeEventSubscription();
    throw normalizeUnknownError(error, 'Failed to open the native SSE transport.');
  }

  return {
    connectionId,
    async close() {
      nativeListeners.delete(connectionId);
      pendingNativeEvents.delete(connectionId);
      cleanupNativeEventSubscription();
      await nativeSseBridge.close(connectionId);
    },
  };
};
