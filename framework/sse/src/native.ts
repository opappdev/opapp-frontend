import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import {
  createNativeSseTransportRuntime,
  type NativeSseBridge,
} from './native-core';
const NATIVE_EVENT_NAME = 'opapp.sse';

const nativeSseBridge =
  (NativeModules.OpappSse as NativeSseBridge | undefined) ?? null;
const nativeSseRuntime = createNativeSseTransportRuntime({
  platformOs: Platform.OS,
  nativeSseBridge,
  subscribeToNativeEvents(onPayload) {
    const emitter = new NativeEventEmitter(nativeSseBridge as any);
    return emitter.addListener(NATIVE_EVENT_NAME, onPayload);
  },
});

export function isNativeSseTransportAvailable() {
  return nativeSseRuntime.isTransportAvailable();
}

export const openNativeSseTransport = nativeSseRuntime.openTransport;
