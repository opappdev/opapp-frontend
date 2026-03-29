export const HERMES_BYTECODE_MAGIC: bigint;

export function resolveHermesCliPath(repoRoot: string): string;

export function isHermesBytecodeBuffer(buffer: Buffer): boolean;

export function compileHermesBundleInPlace(options: {
  repoRoot: string;
  bundlePath: string;
  optimization?: string;
}): Promise<void>;
