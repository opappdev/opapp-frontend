import type {SseTransportResponse} from './types';

export const DEFAULT_EVENT_SOURCE_RETRY_MS = 3000;

export function resolveSseUrlString(url: string | URL) {
  if (url instanceof URL) {
    return url.toString();
  }

  return new URL(url).toString();
}

export function resolveSseOrigin(url: string) {
  return new URL(url).origin;
}

export function normalizeHeaderRecord(
  value: Record<string, string> | null | undefined,
) {
  const normalized: Record<string, string> = {};
  if (!value) {
    return normalized;
  }

  for (const [rawName, rawValue] of Object.entries(value)) {
    const name = rawName.trim().toLowerCase();
    const headerValue = String(rawValue ?? '').trim();
    if (!name || !headerValue) {
      continue;
    }

    normalized[name] = headerValue;
  }

  return normalized;
}

export function isTextEventStreamContentType(contentType: string | null) {
  if (!contentType) {
    return false;
  }

  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType === 'text/event-stream';
}

export function createUnsupportedTransportError() {
  const error = new Error('Native SSE transport is not available on this host.');
  (error as Error & {code?: string}).code = 'ERR_SSE_TRANSPORT_UNSUPPORTED';
  return error;
}

export function isUnsupportedTransportError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as {code?: string}).code === 'ERR_SSE_TRANSPORT_UNSUPPORTED'
  );
}

export function normalizeUnknownError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}

export function createAbortError() {
  return new DOMException('The operation was aborted.', 'AbortError');
}

export function validateSseResponse(response: SseTransportResponse) {
  if (response.status === 204) {
    return new Error('EventSource received HTTP 204 and will not reconnect.');
  }

  if (response.status !== 200) {
    return new Error(`EventSource requires HTTP 200, received ${response.status}.`);
  }

  const contentType = response.headers['content-type'] ?? null;
  if (!isTextEventStreamContentType(contentType)) {
    return new Error(
      `Expected text/event-stream but received ${contentType ?? 'unknown content type'}.`,
    );
  }

  return null;
}
