import * as SQLite from 'expo-sqlite';
import { DATABASE_SCHEMA } from './schema';

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!database) {
    database = await SQLite.openDatabaseAsync('canasta_familiar.db');
  }

  return database;
}

export async function initializeDatabase() {
  const db = await getDatabase();

  await db.execAsync(DATABASE_SCHEMA);

  console.log('Base de datos inicializada correctamente');

  return db;
}