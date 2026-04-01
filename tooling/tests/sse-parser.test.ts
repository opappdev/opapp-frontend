import assert from 'node:assert/strict';
import {createSseParser} from '../../framework/sse/src/parser';

export function run() {
  const events: Array<{
    type: string;
    data: string;
    lastEventId: string;
    origin: string;
  }> = [];
  const retries: number[] = [];

  const parser = createSseParser({
    origin: 'https://api.example.com',
    onEvent(event) {
      events.push(event);
    },
    onRetry(retryMs) {
      retries.push(retryMs);
    },
  });

  parser.push('\ufeff:comment\r\nevent: delta\r\ndata: Hel');
  parser.push('lo\r\ndata: world\r\nid: 42\r\nretry: 1500\r\n\r\n');

  assert.deepEqual(events, [
    {
      type: 'delta',
      data: 'Hello\nworld',
      lastEventId: '42',
      origin: 'https://api.example.com',
    },
  ]);
  assert.deepEqual(retries, [1500]);

  const followupEvents: typeof events = [];
  const followupParser = createSseParser({
    origin: 'https://api.example.com',
    initialLastEventId: 'previous-id',
    onEvent(event) {
      followupEvents.push(event);
    },
    onRetry(retryMs) {
      retries.push(retryMs);
    },
  });

  followupParser.push('id:\nretry: nope\ndata: carry-over\n\n');
  followupParser.push('data: unfinished');
  followupParser.finish();

  assert.deepEqual(followupEvents, [
    {
      type: 'message',
      data: 'carry-over',
      lastEventId: '',
      origin: 'https://api.example.com',
    },
  ]);
  assert.deepEqual(retries, [1500]);
}
