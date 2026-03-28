import React, {
  PropsWithChildren,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  NativeModules,
  Platform,
  UIManager,
  View,
  findNodeHandle,
  type ViewProps,
} from 'react-native';

export type ViewShotFormat = 'png' | 'jpg';
export type ViewShotResult = 'tmpfile' | 'base64' | 'data-uri';

export type CaptureOptions = {
  format?: ViewShotFormat;
  result?: ViewShotResult;
  quality?: number;
  width?: number;
  height?: number;
  fileName?: string;
};

export type ViewShotHandle = {
  capture: (options?: CaptureOptions) => Promise<string>;
};

export type ViewShotProps = PropsWithChildren<
  ViewProps & {
    options?: CaptureOptions;
  }
>;

type CaptureTarget =
  | number
  | null
  | undefined
  | object
  | React.RefObject<unknown>;

type NativeViewShotBridge = {
  captureRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    optionsJson: string,
  ): Promise<string>;
  captureScreen(optionsJson: string): Promise<string>;
  releaseCapture(uri: string): Promise<boolean>;
};

type MeasurableHandle = {
  measureInWindow?: (
    callback: (
      x: number,
      y: number,
      width: number,
      height: number,
    ) => void,
  ) => void;
};

type MeasuredRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const nativeViewShotBridge =
  (NativeModules.OpappViewShot as NativeViewShotBridge | undefined) ?? null;

function isWindowsHostAvailable() {
  return Platform.OS === 'windows' && nativeViewShotBridge !== null;
}

function createUnavailableError(method: string) {
  return new Error(`${method} is only available when the OPApp Windows host bridge is loaded.`);
}

function serializeCaptureOptions(options: CaptureOptions = {}) {
  const payload: Record<string, string | number> = {};

  if (options.format) {
    payload.format = options.format;
  }

  if (options.result) {
    payload.result = options.result;
  }

  if (typeof options.quality === 'number') {
    payload.quality = options.quality;
  }

  if (typeof options.width === 'number') {
    payload.width = options.width;
  }

  if (typeof options.height === 'number') {
    payload.height = options.height;
  }

  if (options.fileName) {
    payload.fileName = options.fileName;
  }

  return JSON.stringify(payload);
}

function resolveReactTag(target: CaptureTarget) {
  if (typeof target === 'number' && Number.isFinite(target)) {
    return Math.trunc(target);
  }

  if (!target) {
    return null;
  }

  const candidate =
    typeof target === 'object' && 'current' in target
      ? (target as React.RefObject<unknown>).current
      : target;

  const reactTag = findNodeHandle(
    candidate as Parameters<typeof findNodeHandle>[0],
  );
  return typeof reactTag === 'number' ? reactTag : null;
}

function resolveCaptureCandidate(target: CaptureTarget) {
  if (!target) {
    return null;
  }

  if (typeof target === 'object' && 'current' in target) {
    return (target as React.RefObject<unknown>).current ?? null;
  }

  return target;
}

function normalizeMeasuredRect(
  x: unknown,
  y: unknown,
  width: unknown,
  height: unknown,
): MeasuredRect | null {
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return {x, y, width, height};
}

async function measureTargetInWindow(target: CaptureTarget): Promise<MeasuredRect> {
  const candidate = resolveCaptureCandidate(target);

  if (
    candidate &&
    typeof candidate === 'object' &&
    'measureInWindow' in candidate &&
    typeof (candidate as MeasurableHandle).measureInWindow === 'function'
  ) {
    return new Promise((resolve, reject) => {
      try {
        (candidate as MeasurableHandle).measureInWindow?.((x, y, width, height) => {
          const rect = normalizeMeasuredRect(x, y, width, height);
          if (!rect) {
            reject(new Error('captureRef measured an empty or unavailable target.'));
            return;
          }

          resolve(rect);
        });
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error('captureRef failed while measuring the target view.'),
        );
      }
    });
  }

  const reactTag = resolveReactTag(target);
  if (!reactTag) {
    throw new Error('captureRef could not resolve a mounted React tag.');
  }

  return new Promise((resolve, reject) => {
    try {
      UIManager.measureInWindow(reactTag, (x, y, width, height) => {
        const rect = normalizeMeasuredRect(x, y, width, height);
        if (!rect) {
          reject(new Error('captureRef measured an empty or unavailable target.'));
          return;
        }

        resolve(rect);
      });
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error('captureRef failed while measuring the target view.'),
      );
    }
  });
}

export async function captureRef(
  target: CaptureTarget,
  options: CaptureOptions = {},
) {
  if (!isWindowsHostAvailable() || !nativeViewShotBridge?.captureRegion) {
    throw createUnavailableError('captureRef');
  }

  const rect = await measureTargetInWindow(target);
  return nativeViewShotBridge.captureRegion(
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    serializeCaptureOptions(options),
  );
}

export async function captureScreen(options: CaptureOptions = {}) {
  if (!isWindowsHostAvailable() || !nativeViewShotBridge?.captureScreen) {
    throw createUnavailableError('captureScreen');
  }

  return nativeViewShotBridge.captureScreen(serializeCaptureOptions(options));
}

export async function releaseCapture(uri: string) {
  if (!nativeViewShotBridge?.releaseCapture) {
    return false;
  }

  return nativeViewShotBridge.releaseCapture(uri);
}

export const ViewShot = forwardRef<ViewShotHandle, ViewShotProps>(function ViewShot(
  {children, options, collapsable = false, ...viewProps},
  forwardedRef,
) {
  const viewRef = useRef<View>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      capture(overrideOptions = {}) {
        return captureRef(viewRef, {
          ...options,
          ...overrideOptions,
        });
      },
    }),
    [options],
  );

  return (
    <View ref={viewRef} collapsable={collapsable} {...viewProps}>
      {children}
    </View>
  );
});

export default ViewShot;
