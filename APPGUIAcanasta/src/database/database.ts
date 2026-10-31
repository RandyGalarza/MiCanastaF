import { Platform } from 'react-native';
import { openNativeDatabase } from './sqlite-driver';
import { DATABASE_SCHEMA } from './schema';

export interface DatabaseConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(sql: string, params?: any): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: any): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

const WEB_DB_KEY = 'canasta_familiar_db';
const WEB_DB_VERSION = '6'; // Forzar reseteo/migración limpia con los 70 productos de Riohacha y precios

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
      const stored = localStorage.getItem(WEB_DB_KEY);

      if (stored && version === WEB_DB_VERSION) {
        const parsed = JSON.parse(stored);
        this.tables = parsed.tables || {};
        this.autoIncrements = parsed.autoIncrements || {};
        this.migrateVersionData();
        this.saveToStorage();
      } else {
        // Si no existe o la versión es anterior a la 6, limpiar para poblar limpiamente
        this.tables = {};
        this.autoIncrements = {};
        localStorage.setItem(`${WEB_DB_KEY}_version`, WEB_DB_VERSION);
      }
    } catch (error) {
      console.error('No se pudieron cargar o migrar los datos de la base web:', error);
      this.tables = {};
      this.autoIncrements = {};
    }
  }

  private migrateVersionData() {
    const today = new Date().toISOString().split('T')[0];
    this.tables.usuarios?.forEach((usuario) => {
      usuario.fecha_creacion ??= usuario.fecha_registro ?? today;
      usuario.usu_estado ??= usuario.estado ?? 1;
      usuario.rol ??= usuario.correo === 'admin@canasta.com' ? 'admin' : (usuario.id_comercio ? 'comercio' : 'usuario');
      usuario.id_comercio ??= null;
    });
    this.tables.presupuestos?.forEach((presupuesto) => {
      presupuesto.monto ??= presupuesto.monto_total;
      presupuesto.pre_estado ??= presupuesto.estado === 'ACTIVO' ? 1 : 0;
    });
    this.tables.productos?.forEach((producto) => {
      producto.id_comercio ??= null;
      producto.pro_estado ??= producto.activo ?? 1;
    });
    this.tables.comercios?.forEach((comercio) => {
      comercio.com_estado ??= comercio.estado ?? 1;
    });
    this.tables.listas_compra?.forEach((lista) => {
      lista.lis_estado ??= ['PENDIENTE', 'ACTIVO', '1'].includes(String(lista.estado)) ? 1 : 0;
    });
    this.tables.precios?.forEach((precio) => {
      precio.disponible ??= 1;
    });
    this.tables.detalles_lista_compra?.forEach((detalle) => {
      detalle.comprado ??= 0;
    });
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

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    const tablesSnapshot = JSON.parse(JSON.stringify(this.tables));
    const incrementsSnapshot = { ...this.autoIncrements };
    try {
      await task();
    } catch (error) {
      this.tables = tablesSnapshot;
      this.autoIncrements = incrementsSnapshot;
      this.saveToStorage();
      throw error;
    }
  }

  async runAsync(sql: string, params: any = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const trimmed = sql.trim();
    const paramList: any[] = Array.isArray(params) ? params : [params];

    // INSERT
    const insertMatch = trimmed.match(/INSERT (?:OR IGNORE |OR REPLACE )?INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const isIgnore = /INSERT OR IGNORE/i.test(trimmed);
      const isReplace = /INSERT OR REPLACE/i.test(trimmed);
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
      if (isIgnore && tableName === 'billeteras') {
        const userIdx = cols.indexOf('id_usuario');
        if (userIdx >= 0) {
          const userId = paramList[userIdx];
          const exists = this.tables[tableName].some((row) => row.id_usuario === userId);
          if (exists) return { lastInsertRowId: 0, changes: 0 };
        }
      }

      const idColumns: Record<string, string> = {
        usuarios: 'id_usuario',
        presupuestos: 'id_presupuesto',
        categorias: 'id_categoria',
        productos: 'id_producto',
        comercios: 'id_comercio',
        precios: 'id_precio',
        listas_compra: 'id_lista',
        detalles_lista_compra: 'id_detalle',
        compras: 'id_compra',
        billeteras: 'id_billetera',
        movimientos_saldo: 'id_movimiento',
        pagos_pendientes: 'id_pago',
        detalles_presupuesto: 'id_detalle',
        facturas: 'id_factura',
        detalles_factura: 'id_detalle_factura',
      };
      const idKey = idColumns[tableName] ?? `id_${tableName.replace(/s$/, '')}`;

      // Si viene el ID en las columnas (ej: sync pull o replace)
      const pkColIdx = cols.indexOf(idKey);
      let targetId: number;
      if (pkColIdx >= 0 && paramList[pkColIdx] !== undefined && paramList[pkColIdx] !== null) {
        targetId = Number(paramList[pkColIdx]);
        if (targetId >= (this.autoIncrements[tableName] || 1)) {
          this.autoIncrements[tableName] = targetId + 1;
        }
      } else {
        targetId = this.autoIncrements[tableName] || 1;
        this.autoIncrements[tableName] = targetId + 1;
      }

      const existingIndex = this.tables[tableName].findIndex((r) => r[idKey] === targetId);
      if (existingIndex >= 0 && (isReplace || pkColIdx >= 0)) {
        cols.forEach((col, idx) => {
          this.tables[tableName][existingIndex][col] = paramList[idx] !== undefined ? paramList[idx] : null;
        });
        this.saveToStorage();
        return { lastInsertRowId: targetId, changes: 1 };
      }

      const currentAutoId = targetId;
      const newRecord: Record<string, any> = {};

      newRecord[idKey] = currentAutoId;
      const today = new Date().toISOString().split('T')[0];
      newRecord['fecha_registro'] = today;
      newRecord['fecha_creacion'] = today;
      Object.assign(newRecord, {
        rol: 'usuario',
        usu_estado: 1,
        pre_estado: 1,
        pro_estado: 1,
        com_estado: 1,
        lis_estado: 1,
        fac_estado: 1,
        disponible: 1,
        comprado: 0,
      });

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

      const setAssignments = setClause.split(',').map((assignment) => assignment.trim());
      const setFields = setAssignments.map((assignment) => assignment.split('=')[0].trim());
      const setParameterCount = (setClause.match(/\?/g) || []).length;

      records.forEach((record) => {
        let matchesWhere = false;
        const whereConditions = [...whereClause.matchAll(/(id_\w+)\s*=\s*\?/gi)];
        if (whereConditions.length > 0) {
          matchesWhere = whereConditions.every((condition, index) =>
            record[condition[1]] === paramList[setParameterCount + index]
          );
        }

        if (matchesWhere) {
          // Generic primary key matching above handles list/detail updates.
        } else if (whereClause.includes('correo =') && whereClause.includes('usu_estado = 1')) {
          const correoVal = paramList[paramList.length - 1];
          matchesWhere = record.correo === correoVal && record.usu_estado !== 0;
        } else if (whereClause.includes('correo =')) {
          const correoVal = paramList[paramList.length - 1];
          matchesWhere = record.correo === correoVal;
        } else if (whereClause.includes('id_usuario =')) {
          const idVal = paramList[paramList.length - 1];
          matchesWhere = record.id_usuario === idVal;
        } else if (whereClause.includes('id_producto =')) {
          const idVal = paramList[paramList.length - 1];
          matchesWhere = record.id_producto === idVal;
        } else if (whereClause.includes('id_comercio =')) {
          const idVal = paramList[paramList.length - 1];
          matchesWhere = record.id_comercio === idVal;
        } else if (whereClause.includes('id_categoria =')) {
          const idVal = paramList[paramList.length - 1];
          matchesWhere = record.id_categoria === idVal;
        }

        if (matchesWhere) {
          setAssignments.forEach((assignment, idx) => {
            const [field, rawValue] = assignment.split('=').map((part) => part.trim());
            const parameterIndex = setAssignments.slice(0, idx + 1).filter((part) => part.includes('?')).length - 1;
            record[field] = rawValue.includes('?')
              ? paramList[parameterIndex]
              : Number.isNaN(Number(rawValue)) ? rawValue.replace(/^['"]|['"]$/g, '') : Number(rawValue);
          });
          changes++;
        }
      });

      if (changes > 0) this.saveToStorage();
      return { lastInsertRowId: 0, changes };
    }

    // DELETE
    const deleteMatch = trimmed.match(/DELETE FROM (\w+)\s+WHERE\s+([\s\S]+)/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const whereClause = deleteMatch[2];
      const beforeCount = (this.tables[tableName] || []).length;

      if (whereClause.includes('id_categoria =')) {
        const idVal = paramList[0];
        this.tables[tableName] = (this.tables[tableName] || []).filter((r) => r.id_categoria !== idVal);
      } else if (whereClause.includes('id_producto =')) {
        const idVal = paramList[0];
        this.tables[tableName] = (this.tables[tableName] || []).filter((r) => r.id_producto !== idVal);
      } else if (whereClause.includes('id_comercio =')) {
        const idVal = paramList[0];
        this.tables[tableName] = (this.tables[tableName] || []).filter((r) => r.id_comercio !== idVal);
      } else if (whereClause.includes('id_detalle =')) {
        const idVal = paramList[0];
        this.tables[tableName] = (this.tables[tableName] || []).filter((r) => r.id_detalle !== idVal);
      } else if (whereClause.includes('id_lista =')) {
        const idVal = paramList[0];
        this.tables[tableName] = (this.tables[tableName] || []).filter((r) => r.id_lista !== idVal);
      }

      const changes = beforeCount - (this.tables[tableName] || []).length;
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

    if (trimmed.includes('FROM detalles_lista_compra d')) {
      const listId = paramList[0];
      const details = (this.tables.detalles_lista_compra || [])
        .filter((detail) => detail.id_lista === listId)
        .map((detail) => {
          const product = (this.tables.productos || []).find((item) => item.id_producto === detail.id_producto);
          const price = (this.tables.precios || [])
            .filter((item) =>
              Number(item.id_producto) === Number(detail.id_producto) &&
              Number(item.disponible ?? 1) === 1 &&
              Number(item.precio) > 0
            )
            .sort((left, right) => Number(left.precio) - Number(right.precio))[0];
          const commerce = (this.tables.comercios || []).find(
            (item) => Number(item.id_comercio) === Number(price?.id_comercio ?? product?.id_comercio)
          );
          return {
            ...detail,
            nombre: product?.nombre,
            unidad_medida: product?.unidad_medida,
            precio: price?.precio ?? null,
            id_comercio: price?.id_comercio ?? product?.id_comercio ?? null,
            nombre_comercio: commerce?.nombre ?? null,
          };
        });
      return details as T[];
    }

    if (trimmed.includes('FROM productos p') && trimmed.includes('LEFT JOIN precios')) {
      let products = [...(this.tables.productos || [])].filter((product) => product.pro_estado === 1);
      products = products.map((product) => {
          const price = (this.tables.precios || []).find((item) =>
            Number(item.id_producto) === Number(product.id_producto) &&
            Number(item.disponible ?? 1) === 1 && Number(item.precio) > 0
          );
        return { ...product, precio: price?.precio ?? null };
      });
      if (trimmed.includes('WHERE p.id_producto = ?')) products = products.filter((product) => product.id_producto === paramList[0]);
      return products as T[];
    }

    const selectMatch = trimmed.match(/SELECT\s+(?:\*|[\s\S]+?)\s+FROM\s+(\w+)/i);
    if (selectMatch) {
      const tableName = selectMatch[1];
      let records = [...(this.tables[tableName] || [])];

      if (trimmed.includes('WHERE nombre = ? AND id_comercio = ?')) {
        records = records.filter(
          (r) => r.nombre === paramList[0] && r.id_comercio === paramList[1]
        );
      } else if (trimmed.includes('WHERE id_pago = ? AND id_usuario = ?')) {
        records = records.filter(
          (r) => Number(r.id_pago) === Number(paramList[0]) &&
            Number(r.id_usuario) === Number(paramList[1])
        );
      } else if (trimmed.includes('WHERE id_lista = ? AND id_producto = ?')) {
        records = records.filter(
          (r) => r.id_lista === paramList[0] && r.id_producto === paramList[1]
        );
      } else if (trimmed.includes('WHERE id_lista = ?')) {
        records = records.filter((r) => r.id_lista === paramList[0]);
      } else if (trimmed.includes('WHERE id_compra = ? AND id_usuario = ?')) {
        records = records.filter((r) =>
          Number(r.id_compra) === Number(paramList[0]) &&
          Number(r.id_usuario) === Number(paramList[1])
        );
      } else if (trimmed.includes('WHERE id_compra = ?')) {
        records = records.filter((r) => Number(r.id_compra) === Number(paramList[0]));
      } else if (trimmed.includes('WHERE id_presupuesto = ?')) {
        records = records.filter((r) => Number(r.id_presupuesto) === Number(paramList[0]));
      } else if (trimmed.includes('WHERE id_producto = ? AND id_comercio = ?')) {
        records = records.filter(
          (r) => r.id_producto === paramList[0] && r.id_comercio === paramList[1]
        );
      } else if (trimmed.includes('WHERE id_producto = ? AND id_comercio = ?')) {
        records = records.filter(
          (r) => r.id_producto === paramList[0] && r.id_comercio === paramList[1]
        );
      } else if (trimmed.includes('WHERE descripcion = ?')) {
        records = records.filter((r) => r.descripcion === paramList[0]);
      } else if (trimmed.includes('WHERE nombre = ?')) {
        records = records.filter((r) => r.nombre === paramList[0]);
      } else if (trimmed.includes('WHERE correo =')) {
        const correoParam = paramList[0];
        records = records.filter(
          (r) => r.correo === correoParam && (trimmed.includes('usu_estado = 1') ? r.usu_estado === 1 : true)
        );
      } else if (trimmed.includes('WHERE id_usuario =')) {
        const idParam = paramList[0];
        records = records.filter((r) => r.id_usuario === idParam);
      } else if (trimmed.includes('WHERE id_producto = ? AND id_comercio = ?')) {
        records = records.filter(
          (r) => r.id_producto === paramList[0] && r.id_comercio === paramList[1]
        );
      } else if (trimmed.includes('WHERE id_producto =')) {
        const idParam = paramList[0];
        records = records.filter((r) => r.id_producto === idParam);
      } else if (trimmed.includes('WHERE id_categoria =')) {
        const idParam = paramList[0];
        records = records.filter((r) => r.id_categoria === idParam);
      } else if (trimmed.includes('WHERE id_comercio =')) {
        const comParam = paramList[0];
        records = records.filter((r) => r.id_comercio === comParam && (trimmed.includes('pro_estado = 1') ? r.pro_estado === 1 : true));
      } else if (trimmed.includes('WHERE usu_estado = 1')) {
        records = records.filter((r) => r.usu_estado === 1);
      } else if (trimmed.includes('WHERE pro_estado = 1')) {
        records = records.filter((r) => r.pro_estado === 1);
      } else if (trimmed.includes('WHERE com_estado = 1')) {
        records = records.filter((r) => r.com_estado === 1);
      }

      // Si la consulta solicita JOIN o datos de precios, adjuntar el precio del producto
      if (tableName === 'productos' && (trimmed.includes('precio') || trimmed.includes('JOIN precios'))) {
        const precios = this.tables['precios'] || [];
        records = records.map((prod) => {
          const precioObj = precios.find((pr) =>
            Number(pr.id_producto) === Number(prod.id_producto) &&
            Number(pr.disponible ?? 1) === 1 && Number(pr.precio) > 0
          );
          return {
            ...prod,
            precio: precioObj ? precioObj.precio : null,
          };
        });
      }

      return records as T[];
    }

    return [];
  }
}

let database: DatabaseConnection | null = null;

async function migrateNativeDatabase(db: DatabaseConnection) {
  async function getColumns(table: string) {
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    return new Set(columns.map((column) => column.name));
  }

  async function renameLegacyColumn(table: string, previous: string, current: string) {
    const columns = await getColumns(table);
    if (columns.has(previous) && !columns.has(current)) {
      await db.execAsync(`ALTER TABLE ${table} RENAME COLUMN ${previous} TO ${current}`);
      return true;
    }
    return false;
  }

  async function migrateLegacyStatus(
    table: string,
    previous: string,
    current: string,
    isActive: string
  ) {
    const columns = await getColumns(table);
    if (columns.has(previous) && !columns.has(current)) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${current} INTEGER NOT NULL DEFAULT 1`);
      await db.execAsync(
        `UPDATE ${table} SET ${current} = CASE WHEN ${isActive} THEN 1 ELSE 0 END`
      );
    }
  }

  await renameLegacyColumn('usuarios', 'fecha_registro', 'fecha_creacion');
  await renameLegacyColumn('usuarios', 'estado', 'usu_estado');
  await renameLegacyColumn('presupuestos', 'monto_total', 'monto');
  await renameLegacyColumn('productos', 'activo', 'pro_estado');
  await renameLegacyColumn('comercios', 'estado', 'com_estado');
  await migrateLegacyStatus(
    'presupuestos',
    'estado',
    'pre_estado',
    `estado = 'ACTIVO'`
  );
  await migrateLegacyStatus(
    'listas_compra',
    'estado',
    'lis_estado',
    `estado IN ('PENDIENTE', 'ACTIVO', '1')`
  );

  const userColumns = await getColumns('usuarios');
  if (!userColumns.has('rol')) {
    await db.execAsync(
      "ALTER TABLE usuarios ADD COLUMN rol TEXT NOT NULL DEFAULT 'usuario'"
    );
  }
  if (!userColumns.has('id_comercio')) {
    await db.execAsync(
      'ALTER TABLE usuarios ADD COLUMN id_comercio INTEGER REFERENCES comercios(id_comercio)'
    );
  }

  const columns = await getColumns('productos');
  if (!columns.has('id_comercio')) {
    await db.execAsync(
      'ALTER TABLE productos ADD COLUMN id_comercio INTEGER REFERENCES comercios(id_comercio)'
    );
  }
}

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
  if (Platform.OS !== 'web') {
    await migrateNativeDatabase(db);
  }

  console.log(`Base de datos (${Platform.OS}) inicializada correctamente`);

  return db;
}
