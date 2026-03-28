export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type DiagnosticCategory =
  | 'app'
  | 'bootstrap'
  | 'interaction'
  | 'exception'
  | 'windowing'
  | 'diagnostics';
export type DiagnosticFields = Record<string, unknown>;
export type DiagnosticContext = Record<string, unknown>;

export type DiagnosticPayload = {
  ts: string;
  level: DiagnosticLevel;
  category: DiagnosticCategory;
  event: string;
  platform: string;
  context?: DiagnosticContext;
  error?: ReturnType<typeof normalizeError>;
} & DiagnosticFields;

let runtimeDiagnosticContext: DiagnosticContext = {};

export function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth >= 4) {
    return '[MaxDepth]';
  }

  if (value instanceof Error) {
    return normalizeError(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 24).map(entry => sanitizeValue(entry, depth + 1));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (typeof value === 'string') {
    return value.length > 1200 ? `${value.slice(0, 1200)}...[truncated]` : value;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 32);
    return Object.fromEntries(
      entries.map(([key, entry]) => [key, sanitizeValue(entry, depth + 1)]),
    );
  }

  return value;
}

export function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {message: error};
  }

  return {message: 'Unknown error', detail: sanitizeValue(error)};
}

function hasKeys(record: DiagnosticContext | undefined) {
  return Boolean(record && Object.keys(record).length > 0);
}

export function getDiagnosticContext() {
  return {...runtimeDiagnosticContext};
}

export function setDiagnosticContext(nextContext: DiagnosticContext) {
  const merged = {...runtimeDiagnosticContext};

  for (const [key, value] of Object.entries(nextContext)) {
    if (value === undefined || value === null || value === '') {
      delete merged[key];
      continue;
    }

    merged[key] = sanitizeValue(value);
  }

  runtimeDiagnosticContext = merged;
  return getDiagnosticContext();
}

export function resetDiagnosticContext() {
  runtimeDiagnosticContext = {};
}

export function inferDiagnosticCategory(
  event: string,
  level: DiagnosticLevel,
): DiagnosticCategory {
  if (
    event.includes('.press') ||
    event.includes('.toggle') ||
    event.includes('.select') ||
    event.includes('.focus') ||
    event.includes('.open') ||
    event.includes('.save') ||
    event.includes('.apply') ||
    event.includes('.change') ||
    event.includes('.close')
  ) {
    return 'interaction';
  }

  if (
    level === 'fatal' ||
    event.includes('.failed') ||
    event.includes('js-error') ||
    event.includes('render-fallback')
  ) {
    return 'exception';
  }

  if (event.startsWith('diagnostics.')) {
    return 'diagnostics';
  }

  if (event.startsWith('companion.bootstrap') || event.endsWith('.bootstrap')) {
    return 'bootstrap';
  }

  if (event.includes('window') || event.includes('surface') || event.includes('session')) {
    return 'windowing';
  }

  return 'app';
}

export function createDiagnosticPayload({
  level,
  event,
  platform,
  fields,
  context,
  category,
  error,
}: {
  level: DiagnosticLevel;
  event: string;
  platform: string;
  fields?: DiagnosticFields;
  context?: DiagnosticContext;
  category?: DiagnosticCategory;
  error?: unknown;
}): DiagnosticPayload {
  const mergedContext = {
    ...runtimeDiagnosticContext,
    ...(context ? sanitizeValue(context) as DiagnosticContext : {}),
  };

  const payload: DiagnosticPayload = {
    ts: new Date().toISOString(),
    level,
    category: category ?? inferDiagnosticCategory(event, level),
    event,
    platform,
    ...(fields ? (sanitizeValue(fields) as DiagnosticFields) : {}),
  };

  if (hasKeys(mergedContext)) {
    payload.context = mergedContext;
  }

  if (error !== undefined) {
    payload.error = normalizeError(error);
  }

  return sanitizeValue(payload) as DiagnosticPayload;
}
