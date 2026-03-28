import {useCallback, useEffect, useMemo, useState} from 'react';
import {deleteUserFile, usePersistentJSON} from '@opapp/framework-filesystem';
import {useStartupTargetPreference} from '@opapp/framework-windowing';
import {
  companionStartupTargetFile,
  parseCompanionStartupTarget,
  resolveCompanionStartupTargetMigration,
  type CompanionStartupTarget,
} from './companion-runtime';

type UseCompanionStartupTargetResult = {
  startupTarget: CompanionStartupTarget | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  reload: () => Promise<CompanionStartupTarget | null>;
  save: (
    nextStartupTarget: CompanionStartupTarget,
  ) => Promise<CompanionStartupTarget | null>;
  clear: () => Promise<null>;
};

export function useCompanionStartupTarget(): UseCompanionStartupTargetResult {
  const {
    startupTarget: storedStartupTarget,
    loading: startupTargetLoading,
    saving: startupTargetSaving,
    error,
    reload,
    save: saveStartupTargetPreference,
    clear: clearStartupTargetPreference,
  } = useStartupTargetPreference();
  const {
    data: loadedLegacyStartupTarget,
    loaded: legacyStartupTargetLoaded,
  } = usePersistentJSON({
    filePath: companionStartupTargetFile,
    parse: parseCompanionStartupTarget,
  });
  const [ignoreLegacyStartupTarget, setIgnoreLegacyStartupTarget] = useState(false);
  const [migrationAttempted, setMigrationAttempted] = useState(false);
  const [migrationRunning, setMigrationRunning] = useState(false);

  const legacyStartupTarget = ignoreLegacyStartupTarget
    ? null
    : loadedLegacyStartupTarget;

  useEffect(() => {
    if (
      startupTargetLoading ||
      !legacyStartupTargetLoaded ||
      migrationAttempted ||
      migrationRunning
    ) {
      return;
    }

    const migration = resolveCompanionStartupTargetMigration({
      storedStartupTarget,
      legacyStartupTarget,
    });
    setMigrationAttempted(true);

    if (migration.kind === 'noop') {
      return;
    }

    let cancelled = false;
    setMigrationRunning(true);

    void (async () => {
      try {
        if (migration.kind === 'migrate-legacy') {
          await saveStartupTargetPreference(migration.target);
          console.log(
            `[frontend-companion] startup-target-migration action=migrate bundle=${migration.target.bundleId} surface=${migration.target.surfaceId}`,
          );
        } else {
          console.log(
            '[frontend-companion] startup-target-migration action=cleanup-legacy',
          );
        }

        const deleted = await deleteUserFile(companionStartupTargetFile);
        if (!deleted) {
          console.warn(
            `Legacy startup target file cleanup skipped because ${companionStartupTargetFile} was already absent or could not be deleted immediately.`,
          );
        }
        if (!cancelled) {
          setIgnoreLegacyStartupTarget(true);
        }
      } catch (migrationError) {
        console.warn('Failed to migrate legacy startup target preference', migrationError);
      } finally {
        if (!cancelled) {
          setMigrationRunning(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    legacyStartupTarget,
    legacyStartupTargetLoaded,
    migrationAttempted,
    migrationRunning,
    saveStartupTargetPreference,
    startupTargetLoading,
    storedStartupTarget,
  ]);

  const clearLegacyStartupTargetFile = useCallback(async () => {
    const deleted = await deleteUserFile(companionStartupTargetFile);
    if (!deleted) {
      console.warn(
        `Legacy startup target file cleanup skipped because ${companionStartupTargetFile} was already absent or could not be deleted immediately.`,
      );
    }
    setIgnoreLegacyStartupTarget(true);
  }, []);

  const clear = useCallback(async () => {
    await clearStartupTargetPreference();
    await clearLegacyStartupTargetFile();
    return null;
  }, [clearLegacyStartupTargetFile, clearStartupTargetPreference]);

  const save = useCallback(
    async (nextStartupTarget: CompanionStartupTarget) => {
      const savedStartupTarget = await saveStartupTargetPreference(nextStartupTarget);
      await clearLegacyStartupTargetFile();
      return savedStartupTarget;
    },
    [clearLegacyStartupTargetFile, saveStartupTargetPreference],
  );

  const loading =
    startupTargetLoading || !legacyStartupTargetLoaded || migrationRunning;
  const saving = startupTargetSaving || migrationRunning;
  const startupTarget = storedStartupTarget ?? legacyStartupTarget;

  return useMemo(
    () => ({
      startupTarget,
      loading,
      saving,
      error,
      reload,
      save,
      clear,
    }),
    [clear, error, loading, reload, save, saving, startupTarget],
  );
}
