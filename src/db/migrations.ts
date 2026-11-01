import type { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_V1 } from './schema';

/** Ordered migrations. Index + 1 === user_version after running. */
const MIGRATIONS: string[] = [SCHEMA_V1];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let v = row?.user_version ?? 0;
  while (v < MIGRATIONS.length) {
    await db.execAsync(MIGRATIONS[v]);
    v += 1;
    await db.execAsync(`PRAGMA user_version = ${v}`);
  }
}
