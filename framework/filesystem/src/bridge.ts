import {NativeModules, Platform} from 'react-native';

type NativeFilesystemBridge = {
  getUserDataPath(): Promise<string>;
  readFile(relativePath: string): Promise<string | null>;
  writeFile(relativePath: string, content: string): Promise<void>;
  deleteFile(relativePath: string): Promise<boolean>;
  fileExists(relativePath: string): Promise<boolean>;
};

const nativeFilesystemBridge =
  (NativeModules.OpappFilesystem as NativeFilesystemBridge | undefined) ?? null;

function isDesktopPlatform() {
  return Platform.OS === 'windows' || Platform.OS === 'macos';
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
