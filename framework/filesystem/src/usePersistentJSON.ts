import {useCallback, useEffect, useRef, useState} from 'react';
import {isFilesystemBridgeAvailable, readUserFile, writeUserFile} from './bridge';

const DEFAULT_DEBOUNCE_MS = 600;

export type UsePersistentJSONOptions<T> = {
  filePath: string;
  parse: (raw: string) => T | null;
  debounceMs?: number;
  onError?: (phase: 'load' | 'save', error: unknown) => void;
};

export type UsePersistentJSONResult<T> = {
  data: T | null;
  loaded: boolean;
  persist: (value: T) => void;
};

/**
 * Generic hook for reading and debounce-writing a JSON file via the filesystem bridge.
 * On non-desktop platforms (where the bridge is unavailable) all I/O is skipped and
 * `loaded` is set to `true` immediately.
 */
export function usePersistentJSON<T>({
  filePath,
  parse,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onError,
}: UsePersistentJSONOptions<T>): UsePersistentJSONResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loaded, setLoaded] = useState(!isFilesystemBridgeAvailable());
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isFilesystemBridgeAvailable()) {
      return;
    }

    readUserFile(filePath)
      .then(raw => {
        if (raw) {
          const parsed = parse(raw);
          if (parsed !== null) {
            setData(parsed);
          }
        }
      })
      .catch(error => {
        onError?.('load', error);
      })
      .finally(() => {
        setLoaded(true);
      });
    // filePath and parse are treated as stable (mount-time values).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (writeTimerRef.current !== null) {
        clearTimeout(writeTimerRef.current);
      }
    };
  }, []);

  const persist = useCallback(
    (value: T) => {
      if (!isFilesystemBridgeAvailable()) {
        return;
      }

      if (writeTimerRef.current !== null) {
        clearTimeout(writeTimerRef.current);
      }

      writeTimerRef.current = setTimeout(() => {
        writeUserFile(filePath, JSON.stringify(value)).catch(error => {
          onError?.('save', error);
        });
      }, debounceMs);
    },
    // filePath, debounceMs, and onError are treated as stable (mount-time values).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {data, loaded, persist};
}
