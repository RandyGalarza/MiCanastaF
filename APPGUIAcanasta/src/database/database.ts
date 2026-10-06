import { Platform } from 'react-native';
import { openNativeDatabase } from './sqlite-driver';
import { DATABASE_SCHEMA } from './schema';

export interface DatabaseConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(sql: string, params?: any): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: any): Promise<T[]>;
}

const WEB_DB_KEY = 'canasta_familiar_db';
const WEB_DB_VERSION = '2'; // Incrementar cuando cambie el schema o seed

// Adaptador web con persistencia en localStorage versionada
class WebDatabaseAdapter implements DatabaseConnection {
  private tables: Record<string, any[]> = {};
  private autoIncrements: Record<string, number> = {};

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const version = localStorage.getItem(`${WEB_DB_KEY}_version`);
      // Si la versión no coincide, borrar datos y empezar fresco
      if (version !== WEB_DB_VERSION) {
        localStorage.removeItem(WEB_DB_KEY);
        localStorage.setItem(`${WEB_DB_KEY}_version`, WEB_DB_VERSION);
        this.tables = {};
        this.autoIncrements = {};
        console.log('DB Web: nueva versión detectada, datos reiniciados.');
        return;
      }

      const stored = localStorage.getItem(WEB_DB_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.tables = parsed.tables || {};
        this.autoIncrements = parsed.autoIncrements || {};
      }
    } catch (e) {
      this.tables = {};
      this.autoIncrements = {};
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(WEB_DB_KEY, JSON.stringify({
        tables: this.tables,
        autoIncrements: this.autoIncrements,
      }));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
    }
  }

  async execAsync(sql: string): Promise<void> {
    const createStatements = sql.split(';').filter((s) => s.trim().length > 0);
    let changed = false;
    for (const statement of createStatements) {
      const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match && match[1]) {
        const tableName = match[1];
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
          this.autoIncrements[tableName] = 1;
          changed = true;
        }
      }
    }
    if (changed) this.saveToStorage();
  }

  async runAsync(sql: string, params: any = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const trimmed = sql.trim();
    const paramList: any[] = Array.isArray(params) ? params : [params];

    // INSERT
    const insertMatch = trimmed.match(/INSERT (?:OR IGNORE )?INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const isIgnore = /INSERT OR IGNORE/i.test(trimmed);
      const cols = insertMatch[2].split(',').map((c) => c.trim());

      if (!this.tables[tableName]) {
        this.tables[tableName] = [];
        this.autoIncrements[tableName] = 1;
      }

      // Para INSERT OR IGNORE: verificar unicidad por correo
      if (isIgnore && tableName === 'usuarios') {
        const correoIdx = cols.indexOf('correo');
        if (correoIdx >= 0) {
          const correoVal = paramList[correoIdx];
          const exists = this.tables[tableName].some((r) => r.correo === correoVal);
          if (exists) return { lastInsertRowId: 0, changes: 0 };
        }
      }
      // Para INSERT OR IGNORE en categorias: verificar unicidad por nombre
      if (isIgnore && tableName === 'categorias') {
        const nombreIdx = cols.indexOf('nombre');
        if (nombreIdx >= 0) {
          const nombreVal = paramList[nombreIdx];
          const exists = this.tables[tableName].some((r) => r.nombre === nombreVal);
          if (exists) return { lastInsertRowId: 0, changes: 0 };
        }
      }

      const currentAutoId = this.autoIncrements[tableName] || 1;
      this.autoIncrements[tableName] = currentAutoId + 1;
      const newRecord: Record<string, any> = {};

      // Defaults
      const idKey = `id_${tableName.replace(/s$/, '')}`;
      newRecord[idKey] = currentAutoId;
      newRecord['fecha_registro'] = new Date().toISOString().split('T')[0];
      newRecord['estado'] = 1;

      cols.forEach((col, idx) => {
        newRecord[col] = paramList[idx] !== undefined ? paramList[idx] : null;
      });

      this.tables[tableName].push(newRecord);
      this.saveToStorage();
      return { lastInsertRowId: currentAutoId, changes: 1 };
    }

    // UPDATE
    const updateMatch = trimmed.match(/UPDATE (\w+)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+)/i);
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

      if (changes > 0) this.saveToStorage();
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
      const db = await openNativeDatabase('canasta_familiar.db');
      database = db as unknown as DatabaseConnection;
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