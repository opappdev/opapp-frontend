import type {SseEvent} from './types';

export type SseParser = {
  push: (chunk: string) => void;
  finish: () => void;
  getLastEventId: () => string;
};

export function createSseParser({
  origin,
  initialLastEventId = '',
  onEvent,
  onRetry,
}: {
  origin: string;
  initialLastEventId?: string;
  onEvent: (event: SseEvent) => void;
  onRetry?: (retryMs: number) => void;
}): SseParser {
  let sawFirstChunk = false;
  let pending = '';
  let eventName = '';
  let lastEventId = initialLastEventId;
  let dataLines: string[] = [];

  function dispatchEvent() {
    if (dataLines.length === 0) {
      eventName = '';
      return;
    }

    onEvent({
      type: eventName || 'message',
      data: dataLines.join('\n'),
      lastEventId,
      origin,
    });

    eventName = '';
    dataLines = [];
  }

  function processLine(line: string) {
    if (line === '') {
      dispatchEvent();
      return;
    }

    if (line.startsWith(':')) {
      return;
    }

    const delimiterIndex = line.indexOf(':');
    const field = delimiterIndex === -1 ? line : line.slice(0, delimiterIndex);
    let value = delimiterIndex === -1 ? '' : line.slice(delimiterIndex + 1);

    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    switch (field) {
      case 'data':
        dataLines.push(value);
        break;
      case 'event':
        eventName = value;
        break;
      case 'id':
        if (!value.includes('\u0000')) {
          lastEventId = value;
        }
        break;
      case 'retry':
        if (/^\d+$/.test(value)) {
          onRetry?.(Number(value));
        }
        break;
      default:
        break;
    }
  }

  function drainPending(flushFinalLine: boolean) {
    let startIndex = 0;

    for (let index = 0; index < pending.length; index += 1) {
      const charCode = pending.charCodeAt(index);
      if (charCode !== 10 && charCode !== 13) {
        continue;
      }

      const line = pending.slice(startIndex, index);
      if (charCode === 13 && pending.charCodeAt(index + 1) === 10) {
        index += 1;
      }

      processLine(line);
      startIndex = index + 1;
    }

    pending = pending.slice(startIndex);

    if (flushFinalLine && pending.length > 0) {
      const finalLine = pending;
      pending = '';
      processLine(finalLine);
    }
  }

  return {
    push(chunk: string) {
      let normalizedChunk = chunk;
      if (!sawFirstChunk) {
        sawFirstChunk = true;
        if (normalizedChunk.charCodeAt(0) === 0xfeff) {
          normalizedChunk = normalizedChunk.slice(1);
        }
      }

      if (!normalizedChunk) {
        return;
      }

      pending += normalizedChunk;
      drainPending(false);
    },
    finish() {
      drainPending(true);
      pending = '';
      eventName = '';
      dataLines = [];
    },
    getLastEventId() {
      return lastEventId;
    },
  };
}
