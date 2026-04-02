import {NativeModules, Platform} from 'react-native';

export type TrustedWorkspaceTarget = {
  rootPath: string;
  displayName: string | null;
  trusted: boolean;
};

export type WorkspaceEntryKind = 'file' | 'directory';

export type WorkspaceEntry = {
  name: string;
  relativePath: string;
  kind: WorkspaceEntryKind;
  sizeBytes: number | null;
};

export type SearchWorkspacePathsOptions = {
  relativePath?: string;
  limit?: number;
};

type NativeFilesystemBridge = {
  getUserDataPath(): Promise<string>;
  readFile(relativePath: string): Promise<string | null>;
  writeFile(relativePath: string, content: string): Promise<void>;
  deleteFile(relativePath: string): Promise<boolean>;
  fileExists(relativePath: string): Promise<boolean>;
  getTrustedWorkspaceTarget?(): Promise<string | null>;
  setTrustedWorkspaceRoot?(rootPath: string): Promise<string>;
  clearTrustedWorkspaceRoot?(): Promise<void>;
  readWorkspaceFile?(relativePath: string): Promise<string | null>;
  listWorkspaceDirectory?(relativePath: string): Promise<string>;
  statWorkspacePath?(relativePath: string): Promise<string | null>;
  searchWorkspacePaths?(
    query: string,
    relativePath: string,
    limit: number,
  ): Promise<string>;
};

const nativeFilesystemBridge =
  (NativeModules.OpappFilesystem as NativeFilesystemBridge | undefined) ?? null;

function isDesktopPlatform() {
  return Platform.OS === 'windows' || Platform.OS === 'macos';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseJsonValue(raw: string | null | undefined): unknown {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function parseTrustedWorkspaceTargetPayload(
  raw: string | null | undefined,
): TrustedWorkspaceTarget | null {
  const value = parseJsonValue(raw);
  if (!isRecord(value) || typeof value.rootPath !== 'string') {
    return null;
  }

  return {
    rootPath: value.rootPath,
    displayName: readOptionalString(value.displayName),
    trusted: value.trusted === true,
  };
}

function parseWorkspaceEntry(value: unknown): WorkspaceEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const kind =
    value.kind === 'file' || value.kind === 'directory' ? value.kind : null;
  if (
    typeof value.name !== 'string' ||
    typeof value.relativePath !== 'string' ||
    kind === null
  ) {
    return null;
  }

  return {
    name: value.name,
    relativePath: value.relativePath,
    kind,
    sizeBytes:
      typeof value.sizeBytes === 'number' && Number.isFinite(value.sizeBytes)
        ? value.sizeBytes
        : null,
  };
}

function parseWorkspaceEntriesPayload(
  raw: string | null | undefined,
): WorkspaceEntry[] {
  const value = parseJsonValue(raw);
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(parseWorkspaceEntry)
    .filter((entry): entry is WorkspaceEntry => entry !== null);
}

function parseWorkspaceEntryPayload(
  raw: string | null | undefined,
): WorkspaceEntry | null {
  return parseWorkspaceEntry(parseJsonValue(raw));
}

export async function getUserDataPath(): Promise<string | null> {
  if (!nativeFilesystemBridge?.getUserDataPath) {
    return null;
  }

  try {
    return await nativeFilesystemBridge.getUserDataPath();
  } catch {
    return null;
  }
}

export async function readUserFile(relativePath: string): Promise<string | null> {
  if (!nativeFilesystemBridge?.readFile) {
    return null;
  }

  try {
    return await nativeFilesystemBridge.readFile(relativePath);
  } catch {
    return null;
  }
}

export async function writeUserFile(
  relativePath: string,
  content: string,
): Promise<boolean> {
  if (!nativeFilesystemBridge?.writeFile) {
    return false;
  }

  try {
    await nativeFilesystemBridge.writeFile(relativePath, content);
    return true;
  } catch {
    return false;
  }
}

export async function deleteUserFile(relativePath: string): Promise<boolean> {
  if (!nativeFilesystemBridge?.deleteFile) {
    return false;
  }

  try {
    return await nativeFilesystemBridge.deleteFile(relativePath);
  } catch {
    return false;
  }
}

export async function userFileExists(relativePath: string): Promise<boolean> {
  if (!nativeFilesystemBridge?.fileExists) {
    return false;
  }

  try {
    return await nativeFilesystemBridge.fileExists(relativePath);
  } catch {
    return false;
  }
}

export function isFilesystemBridgeAvailable(): boolean {
  return isDesktopPlatform() && nativeFilesystemBridge !== null;
}

export async function getTrustedWorkspaceTarget(): Promise<TrustedWorkspaceTarget | null> {
  if (!nativeFilesystemBridge?.getTrustedWorkspaceTarget) {
    return null;
  }

  try {
    return parseTrustedWorkspaceTargetPayload(
      await nativeFilesystemBridge.getTrustedWorkspaceTarget(),
    );
  } catch {
    return null;
  }
}

export async function setTrustedWorkspaceRoot(
  rootPath: string,
): Promise<TrustedWorkspaceTarget | null> {
  if (!nativeFilesystemBridge?.setTrustedWorkspaceRoot) {
    return null;
  }

  try {
    return parseTrustedWorkspaceTargetPayload(
      await nativeFilesystemBridge.setTrustedWorkspaceRoot(rootPath),
    );
  } catch {
    return null;
  }
}

export async function clearTrustedWorkspaceRoot(): Promise<boolean> {
  if (!nativeFilesystemBridge?.clearTrustedWorkspaceRoot) {
    return false;
  }

  try {
    await nativeFilesystemBridge.clearTrustedWorkspaceRoot();
    return true;
  } catch {
    return false;
  }
}

export async function readWorkspaceFile(
  relativePath: string,
): Promise<string | null> {
  if (!nativeFilesystemBridge?.readWorkspaceFile) {
    return null;
  }

  try {
    return await nativeFilesystemBridge.readWorkspaceFile(relativePath);
  } catch {
    return null;
  }
}

export async function listWorkspaceDirectory(
  relativePath = '',
): Promise<WorkspaceEntry[]> {
  if (!nativeFilesystemBridge?.listWorkspaceDirectory) {
    return [];
  }

  try {
    return parseWorkspaceEntriesPayload(
      await nativeFilesystemBridge.listWorkspaceDirectory(relativePath),
    );
  } catch {
    return [];
  }
}

export async function statWorkspacePath(
  relativePath = '',
): Promise<WorkspaceEntry | null> {
  if (!nativeFilesystemBridge?.statWorkspacePath) {
    return null;
  }

  try {
    return parseWorkspaceEntryPayload(
      await nativeFilesystemBridge.statWorkspacePath(relativePath),
    );
  } catch {
    return null;
  }
}

export async function searchWorkspacePaths(
  query: string,
  {relativePath = '', limit = 100}: SearchWorkspacePathsOptions = {},
): Promise<WorkspaceEntry[]> {
  if (!nativeFilesystemBridge?.searchWorkspacePaths) {
    return [];
  }

  try {
    return parseWorkspaceEntriesPayload(
      await nativeFilesystemBridge.searchWorkspacePaths(
        query,
        relativePath,
        limit,
      ),
    );
  } catch {
    return [];
  }
}
