import assert from 'node:assert/strict';
import {openSseRequestWithTransport} from '../../framework/sse/src/controller';
import {
  createNativeSseTransportRuntime,
  type NativeSseBridge,
} from '../../framework/sse/src/native-core';
import {
  lmStudioRecordedMessagePayloads,
  lmStudioRecordedSseChunks,
} from './fixtures/lm-studio-chat-stream';

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return {promise, resolve, reject};
}

export async function run() {
  const emittedPayloads: string[] = [];
  let opened = false;
  let completed = false;
  let subscriptionRemoved = 0;
  const closedConnectionIds: string[] = [];
  const openDeferred = createDeferredPromise<string>();

  const bridge: NativeSseBridge = {
    open: async () => openDeferred.promise,
    close: async connectionId => {
      closedConnectionIds.push(connectionId);
    },
    addListener() {},
    removeListeners() {},
  };

  const runtime = createNativeSseTransportRuntime({
    platformOs: 'windows',
    nativeSseBridge: bridge,
    subscribeToNativeEvents() {
      return {
        remove() {
          subscriptionRemoved += 1;
        },
      };
    },
  });

  assert.equal(runtime.isTransportAvailable(), true);

  const handle = openSseRequestWithTransport(
    {
      url: 'http://127.0.0.1:1234/v1/chat/completions',
      method: 'POST',
      headers: {
        authorization: 'Bearer fixture-token',
        'content-type': 'application/json',
      },
      body: '{"stream":true}',
      onOpen(response) {
        opened = response.status === 200;
      },
      onEvent(event) {
        emittedPayloads.push(event.data);
      },
      onComplete() {
        completed = true;
      },
    },
    runtime.openTransport,
  );

  runtime.dispatchNativePayload({
    connectionId: 'conn-fixture-1',
    type: 'response',
    status: 200,
    statusText: 'OK',
    headers: {'Content-Type': 'text/event-stream; charset=utf-8'},
  });
  for (const chunk of lmStudioRecordedSseChunks) {
    runtime.dispatchNativePayload({
      connectionId: 'conn-fixture-1',
      type: 'chunk',
      chunk,
    });
  }
  runtime.dispatchNativePayload({
    connectionId: 'conn-fixture-1',
    type: 'complete',
  });

  openDeferred.resolve('conn-fixture-1');
  await handle.done;

  assert.equal(opened, true);
  assert.equal(completed, true);
  assert.deepEqual(emittedPayloads, [...lmStudioRecordedMessagePayloads]);
  assert.deepEqual(closedConnectionIds, []);
  assert.equal(subscriptionRemoved, 1);

  const surfacedErrors: Array<Error & {code?: string}> = [];
  const errorOpenDeferred = createDeferredPromise<string>();
  const errorRuntime = createNativeSseTransportRuntime({
    platformOs: 'windows',
    nativeSseBridge: {
      ...bridge,
      open: async () => errorOpenDeferred.promise,
    },
    subscribeToNativeEvents() {
      return {
        remove() {},
      };
    },
  });

  const failingHandle = openSseRequestWithTransport(
    {
      url: 'http://127.0.0.1:1234/v1/chat/completions',
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: '{"stream":true}',
      onError(error) {
        surfacedErrors.push(error as Error & {code?: string});
      },
    },
    errorRuntime.openTransport,
  );

  errorOpenDeferred.resolve('conn-fixture-2');
  await new Promise(resolve => {
    setTimeout(resolve, 0);
  });
  errorRuntime.dispatchNativePayload({
    connectionId: 'conn-fixture-2',
    type: 'error',
    error: 'fixture native bridge failed',
    code: 'ERR_SSE_TRANSPORT_FIXTURE',
  });

  await assert.rejects(failingHandle.done, /fixture native bridge failed/);
  const surfacedError = surfacedErrors[0];
  assert.ok(surfacedError, 'SSE request did not surface the native bridge error.');
  assert.equal(surfacedError.message, 'fixture native bridge failed');
  assert.equal(surfacedError.code, 'ERR_SSE_TRANSPORT_FIXTURE');
}
