import { load, save, STORAGE_KEYS } from './storage';

type Migration = {
  version: string;
  run(): void;
};

const migrations: Migration[] = [];

export function registerMigration(version: string, run: Migration['run']): void {
  migrations.push({ version, run });
}

export function migrate(): void {
  const currentVersion = load<string | null>(STORAGE_KEYS.version, null);

  const pending = migrations
    .filter((migration) => !currentVersion || migration.version > currentVersion)
    .sort((a, b) => (a.version > b.version ? 1 : -1));

  pending.forEach((migration) => {
    migration.run();
    save(STORAGE_KEYS.version, migration.version);
  });
}

// Built-in baseline migration to v1.0
registerMigration('v1.0', () => {
  try {
    const sessions = load<any[]>(STORAGE_KEYS.sessions, []);
    const patched = sessions.map((s) => ({
      schemaVersion: 'v1',
      createdAt: s.createdAt ?? s.startAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...s
    }));
    save(STORAGE_KEYS.sessions, patched);
  } catch {}
});
