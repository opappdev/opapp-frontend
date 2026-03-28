import {NativeModules, Platform} from 'react-native';
import {
  createDiagnosticPayload,
  type DiagnosticCategory,
  type DiagnosticContext,
  type DiagnosticFields,
  type DiagnosticLevel,
  normalizeError,
} from './model';
export {
  getDiagnosticContext,
  inferDiagnosticCategory,
  resetDiagnosticContext,
  sanitizeValue,
  setDiagnosticContext,
  type DiagnosticCategory,
  type DiagnosticContext,
  type DiagnosticFields,
  type DiagnosticLevel,
  type DiagnosticPayload,
} from './model';

type NativeDiagnosticsBridge = {
  getDiagnosticsLogPath?: () => Promise<string>;
  getDiagnosticsLogTail?: (maxLines: number) => Promise<string>;
};

const nativeDiagnosticsBridge =
  (NativeModules.OpappWindowManager as NativeDiagnosticsBridge | undefined) ?? null;

let diagnosticsInstalled = false;

function buildDiagnosticLine(
  level: DiagnosticLevel,
  event: string,
  fields?: DiagnosticFields,
  options?: {
    category?: DiagnosticCategory;
    context?: DiagnosticContext;
    error?: unknown;
  },
) {
  const payload = createDiagnosticPayload({
    level,
    event,
    platform: Platform.OS,
    fields,
    category: options?.category,
    context: options?.context,
    error: options?.error,
  });

  return `[frontend-diagnostics] ${JSON.stringify(payload)}`;
}

function writeConsole(level: DiagnosticLevel, line: string) {
  if (level === 'warn') {
    console.warn(line);
    return;
  }

  if (level === 'error' || level === 'fatal') {
    console.error(line);
    return;
  }

  console.log(line);
}

export function logDiagnostic(
  level: DiagnosticLevel,
  event: string,
  fields?: DiagnosticFields,
  options?: {
    category?: DiagnosticCategory;
    context?: DiagnosticContext;
    error?: unknown;
  },
) {
  writeConsole(level, buildDiagnosticLine(level, event, fields, options));
}

export function logInteraction(
  event: string,
  fields?: DiagnosticFields,
  context?: DiagnosticContext,
) {
  logDiagnostic('info', event, fields, {
    category: 'interaction',
    context,
  });
}

export function logException(
  event: string,
  error: unknown,
  fields?: DiagnosticFields,
  context?: DiagnosticContext,
) {
  logDiagnostic('error', event, fields, {
    category: 'exception',
    context,
    error,
  });
}

export function installGlobalDiagnostics() {
  if (diagnosticsInstalled) {
    return;
  }

  diagnosticsInstalled = true;
  logDiagnostic('info', 'diagnostics.installed', {
    runtime: 'react-native',
  }, {
    category: 'diagnostics',
  });

  const errorUtils = (globalThis as {ErrorUtils?: unknown}).ErrorUtils as
    | {
        getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
        setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
      }
    | undefined;

  if (!errorUtils?.setGlobalHandler) {
    return;
  }

  const previousHandler = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    logDiagnostic(isFatal ? 'fatal' : 'error', 'global.js-error', undefined, {
      category: 'exception',
      error,
      context: {
        fatal: Boolean(isFatal),
      },
    });

    previousHandler?.(error, isFatal);
  });
}

export async function getDiagnosticsLogPath() {
  if (!nativeDiagnosticsBridge?.getDiagnosticsLogPath) {
    return null;
  }

  try {
    return await nativeDiagnosticsBridge.getDiagnosticsLogPath();
  } catch (error) {
    logException('diagnostics.get-log-path.failed', error);
    return null;
  }
}

export async function getDiagnosticsLogTail(maxLines = 120) {
  if (!nativeDiagnosticsBridge?.getDiagnosticsLogTail) {
    return null;
  }

  try {
    return await nativeDiagnosticsBridge.getDiagnosticsLogTail(maxLines);
  } catch (error) {
    logException('diagnostics.get-log-tail.failed', error, {maxLines});
    return null;
  }
}
