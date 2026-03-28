import {NativeModules, Platform} from 'react-native';

export type WindowCaptureSelector = {
  foreground?: boolean;
  handle?: number | string;
  processName?: string;
  titleContains?: string;
  titleExact?: string;
  className?: string;
};

export type WindowCaptureRegion = 'client' | 'window' | 'monitor';
export type WindowCaptureBackend = 'auto' | 'copy-screen' | 'wgc';
export type WindowCaptureFormat = 'png' | 'jpg';

export type WindowCaptureOptions = {
  activate?: boolean;
  activationDelayMs?: number;
  backend?: WindowCaptureBackend;
  region?: WindowCaptureRegion;
  format?: WindowCaptureFormat;
  timeoutMs?: number;
  includeCursor?: boolean;
  outputPath?: string;
};

export type WindowCaptureRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type WindowCaptureWindowInfo = {
  handle: number;
  handleHex: string;
  processId: number;
  processName: string;
  title: string;
  className: string;
  isForeground: boolean;
  isMinimized: boolean;
  windowRect: WindowCaptureRect;
  clientRect?: WindowCaptureRect | null;
  monitorRect?: WindowCaptureRect | null;
};

export type WindowCaptureResult = {
  outputPath: string;
  format: WindowCaptureFormat;
  region: WindowCaptureRegion;
  backend: Exclude<WindowCaptureBackend, 'auto'>;
  requestedBackend: WindowCaptureBackend;
  activate: boolean;
  activationDelayMs: number;
  matchedCount: number;
  selectedWindow: WindowCaptureWindowInfo;
  captureRect: WindowCaptureRect;
  captureSize: {
    width: number;
    height: number;
  };
  sourceItemSize?: {
    width: number;
    height: number;
  };
  cropBounds?: WindowCaptureRect | null;
  visibilityWarning?: string | null;
};

type NativeWindowCaptureBridge = {
  listVisibleWindows(selectorJson: string): Promise<string>;
  captureWindow(selectorJson: string, optionsJson: string): Promise<string>;
};

const nativeWindowCaptureBridge =
  (NativeModules.OpappWindowCapture as NativeWindowCaptureBridge | undefined) ?? null;

function isWindowsHostAvailable() {
  return Platform.OS === 'windows' && nativeWindowCaptureBridge !== null;
}

function createUnavailableError(method: string) {
  return new Error(`${method} is only available when the OPApp Windows host bridge is loaded.`);
}

function parseJson<T>(method: string, payload: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    throw new Error(
      `${method} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function isWindowCaptureBridgeAvailable(): boolean {
  return isWindowsHostAvailable();
}

export async function listVisibleWindows(
  selector: WindowCaptureSelector,
): Promise<WindowCaptureWindowInfo[]> {
  if (!isWindowsHostAvailable() || !nativeWindowCaptureBridge?.listVisibleWindows) {
    throw createUnavailableError('listVisibleWindows');
  }

  return parseJson<WindowCaptureWindowInfo[]>(
    'listVisibleWindows',
    await nativeWindowCaptureBridge.listVisibleWindows(JSON.stringify(selector ?? {})),
  );
}

export async function captureWindow(
  selector: WindowCaptureSelector,
  options: WindowCaptureOptions = {},
): Promise<WindowCaptureResult> {
  if (!isWindowsHostAvailable() || !nativeWindowCaptureBridge?.captureWindow) {
    throw createUnavailableError('captureWindow');
  }

  return parseJson<WindowCaptureResult>(
    'captureWindow',
    await nativeWindowCaptureBridge.captureWindow(
      JSON.stringify(selector ?? {}),
      JSON.stringify(options ?? {}),
    ),
  );
}
