import assert from 'node:assert/strict';
import {
  createEventSourceController,
  openSseRequestWithTransport,
} from '../../framework/sse/src/controller';
import type {
  SseTransportFactory,
  SseTransportHandle,
  SseTransportListener,
  SseTransportRequest,
} from '../../framework/sse/src/types';

type CapturedRequest = {
  request: SseTransportRequest;
  listener: SseTransportListener;
  handle: SseTransportHandle & {closed: boolean};
};

function createCapturedTransport() {
  const calls: CapturedRequest[] = [];
  const transport: SseTransportFactory = async (request, listener) => {
    const handle = {
      connectionId: `conn-${calls.length + 1}`,
      closed: false,
      close() {
        handle.closed = true;
      },
    };
    calls.push({request, listener, handle});
    return handle;
  };

  return {
    calls,
    transport,
  };
}

function wait(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export async function run() {
  const eventSourceTransport = createCapturedTransport();
  const readyStates: number[] = [];
  const messages: string[] = [];
  const errors: string[] = [];

  const controller = createEventSourceController({
    url: 'https://api.example.com/stream',
    withCredentials: true,
    transportFactory: eventSourceTransport.transport,
    onReadyStateChange(readyState) {
      readyStates.push(readyState);
    },
    onOpen() {},
    onMessage(event) {
      messages.push(event.data);
    },
    onNamedEvent() {},
    onError(error) {
      errors.push(error.message);
    },
  });

  await wait(0);
  assert.equal(eventSourceTransport.calls.length, 1);
  assert.equal(
    eventSourceTransport.calls[0]?.request.headers.accept,
    'text/event-stream',
  );
  assert.equal(
    eventSourceTransport.calls[0]?.request.headers['cache-control'],
    'no-cache',
  );

  eventSourceTransport.calls[0]?.listener.onResponse?.({
    status: 200,
    statusText: 'OK',
    headers: {'content-type': 'text/event-stream; charset=utf-8'},
  });
  eventSourceTransport.calls[0]?.listener.onChunk?.(
    'retry: 1\nid: last-event\ndata: hello\n\n',
  );
  eventSourceTransport.calls[0]?.listener.onComplete?.();

  await wait(10);

  assert.deepEqual(messages, ['hello']);
  assert.ok(errors.some(message => message.includes('will reconnect')));
  assert.equal(eventSourceTransport.calls.length, 2);
  assert.equal(
    eventSourceTransport.calls[1]?.request.headers['last-event-id'],
    'last-event',
  );
  assert.ok(readyStates.includes(1));
  assert.ok(readyStates.includes(0));

  controller.close();
  assert.equal(controller.getReadyState(), 2);

  const requestTransport = createCapturedTransport();
  const requestEvents: string[] = [];
  let requestOpened = false;
  let requestCompleted = false;

  const requestHandle = openSseRequestWithTransport(
    {
      url: 'https://api.example.com/v1/chat/completions',
      method: 'POST',
      headers: {
        authorization: 'Bearer demo-token',
        'content-type': 'application/json',
      },
      body: '{"stream":true}',
      onOpen() {
        requestOpened = true;
      },
      onEvent(event) {
        requestEvents.push(event.data);
      },
      onComplete() {
        requestCompleted = true;
      },
    },
    requestTransport.transport,
  );

  await wait(0);

  assert.equal(requestTransport.calls.length, 1);
  assert.equal(requestTransport.calls[0]?.request.method, 'POST');
  assert.equal(
    requestTransport.calls[0]?.request.headers.authorization,
    'Bearer demo-token',
  );
  assert.equal(
    requestTransport.calls[0]?.request.headers.accept,
    'text/event-stream',
  );
  assert.equal(requestTransport.calls[0]?.request.body, '{"stream":true}');

  requestTransport.calls[0]?.listener.onResponse?.({
    status: 200,
    statusText: 'OK',
    headers: {'content-type': 'text/event-stream'},
  });
  requestTransport.calls[0]?.listener.onChunk?.('data: {"delta":"a"}\n\n');
  requestTransport.calls[0]?.listener.onChunk?.('data: {"delta":"b"}\n\n');
  requestTransport.calls[0]?.listener.onComplete?.();

  await requestHandle.done;

  assert.equal(requestOpened, true);
  assert.equal(requestCompleted, true);
  assert.deepEqual(requestEvents, ['{"delta":"a"}', '{"delta":"b"}']);
}
