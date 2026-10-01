import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { DATABASE_SCHEMA } from './schema';

export interface DatabaseConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(sql: string, params?: any): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: any): Promise<T[]>;
}

// Adaptador web en memoria para simular las operaciones SQLite cuando se ejecuta en navegador
class WebDatabaseAdapter implements DatabaseConnection {
  private tables: Record<string, any[]> = {};
  private autoIncrements: Record<string, number> = {};

  async execAsync(sql: string): Promise<void> {
    const createStatements = sql.split(';').filter((s) => s.trim().length > 0);
    for (const statement of createStatements) {
      const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match && match[1]) {
        const tableName = match[1];
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
          this.autoIncrements[tableName] = 1;
        }
      }
    }
  }

  async runAsync(sql: string, params: any = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const trimmed = sql.trim();
    const paramList: any[] = Array.isArray(params) ? params : [params];

    // Simulación de INSERT INTO
    const insertMatch = trimmed.match(/INSERT (?:OR IGNORE )?INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const cols = insertMatch[2].split(',').map((c) => c.trim());
      if (!this.tables[tableName]) {
        this.tables[tableName] = [];
        this.autoIncrements[tableName] = 1;
      }

      const currentAutoId = this.autoIncrements[tableName] || 1;
      this.autoIncrements[tableName] = currentAutoId + 1;
      const newRecord: Record<string, any> = {};

      const idKey = `id_${tableName.replace(/s$/, '')}`;
      newRecord[idKey] = currentAutoId;

      cols.forEach((col, idx) => {
        newRecord[col] = paramList[idx] !== undefined ? paramList[idx] : null;
      });

      this.tables[tableName].push(newRecord);
      return { lastInsertRowId: currentAutoId, changes: 1 };
    }

    // Simulación de UPDATE usuarios
    const updateMatch = trimmed.match(/UPDATE (\w+)\s+SET\s+(.+)\s+WHERE\s+(.+)/i);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];

      const records = this.tables[tableName] || [];
      let changes = 0;

      const setFields = setClause.split(',').map((f) => f.trim().split('=')[0].trim());

      records.forEach((record) => {
        let matchesWhere = false;

        if (whereClause.includes('correo =') && whereClause.includes('estado = 1')) {
          const correoVal = paramList[paramList.length - 1];
          matchesWhere = record.correo === correoVal && record.estado !== 0;
        } else if (whereClause.includes('correo =')) {
          const correoVal = paramList[paramList.length - 1];
          matchesWhere = record.correo === correoVal;
        } else if (whereClause.includes('id_usuario =')) {
          const idVal = paramList[paramList.length - 1];
          matchesWhere = record.id_usuario === idVal;
        }

        if (matchesWhere) {
          setFields.forEach((field, idx) => {
            record[field] = paramList[idx];
          });
          changes++;
        }
      });

      return { lastInsertRowId: 0, changes };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getFirstAsync<T>(sql: string, params: any = []): Promise<T | null> {
    const results = await this.getAllAsync<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async getAllAsync<T>(sql: string, params: any = []): Promise<T[]> {
    const trimmed = sql.trim();
    const paramList: any[] = Array.isArray(params) ? params : [params];

    const selectMatch = trimmed.match(/SELECT \* FROM (\w+)/i);
    if (selectMatch) {
      const tableName = selectMatch[1];
      const records = this.tables[tableName] || [];

      if (trimmed.includes('WHERE correo =')) {
        const correoParam = paramList[0];
        return records.filter(
          (r) => r.correo === correoParam && (trimmed.includes('estado = 1') ? r.estado === 1 : true)
        ) as T[];
      }

      if (trimmed.includes('WHERE id_usuario =')) {
        const idParam = paramList[0];
        return records.filter((r) => r.id_usuario === idParam) as T[];
      }

      return records as T[];
    }

    return [];
  }
}

let database: DatabaseConnection | null = null;

export async function getDatabase(): Promise<DatabaseConnection> {
  if (!database) {
    if (Platform.OS === 'web') {
      database = new WebDatabaseAdapter();
    } else {
      database = (await SQLite.openDatabaseAsync('canasta_familiar.db')) as unknown as DatabaseConnection;
    }
  }

  return database;
}

export async function initializeDatabase(): Promise<DatabaseConnection> {
  const db = await getDatabase();

  await db.execAsync(DATABASE_SCHEMA);

  console.log(`Base de datos (${Platform.OS}) inicializada correctamente`);

  return db;
}