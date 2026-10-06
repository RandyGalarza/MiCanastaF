import * as SQLite from 'expo-sqlite';

export async function openNativeDatabase(dbName: string) {
  return await SQLite.openDatabaseAsync(dbName);
}
