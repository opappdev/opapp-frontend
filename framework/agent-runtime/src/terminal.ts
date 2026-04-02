import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import {
  createNativeAgentTerminalRuntime,
  type NativeAgentTerminalBridge,
} from './terminal-core';

const NATIVE_EVENT_NAME = 'opapp.agentTerminal';

const nativeAgentTerminalBridge =
  (NativeModules.OpappAgentTerminal as NativeAgentTerminalBridge | undefined) ??
  null;

const nativeAgentTerminalRuntime = createNativeAgentTerminalRuntime({
  platformOs: Platform.OS,
  nativeAgentTerminalBridge,
  subscribeToNativeEvents(onPayload) {
    const emitter = new NativeEventEmitter(nativeAgentTerminalBridge as never);
    return emitter.addListener(NATIVE_EVENT_NAME, onPayload);
  },
});

export function isNativeAgentTerminalRuntimeAvailable() {
  return nativeAgentTerminalRuntime.isRuntimeAvailable();
}

export const openAgentTerminalSession = nativeAgentTerminalRuntime.openSession;
