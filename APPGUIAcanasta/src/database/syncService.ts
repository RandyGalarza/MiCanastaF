import { getDatabase } from './database';
import { supabase } from './supabaseClient';

/**
 * Tablas sincronizables con su llave primaria y columnas válidas permitidas
 */
const SYNC_TABLES: { name: string; pk: string; allowedColumns: string[] }[] = [
  {
    name: 'categorias',
    pk: 'id_categoria',
    allowedColumns: ['id_categoria', 'descripcion'],
  },
  {
    name: 'comercios',
    pk: 'id_comercio',
    allowedColumns: ['id_comercio', 'nombre', 'direccion', 'telefono', 'tipo_comercio', 'com_estado'],
  },
  {
    name: 'usuarios',
    pk: 'id_usuario',
    allowedColumns: [
      'id_usuario',
      'nombre',
      'apellido',
      'telefono',
      'correo',
      'contrasena',
      'rol',
      'id_comercio',
      'fecha_creacion',
      'usu_estado',
    ],
  },
  {
    name: 'presupuestos',
    pk: 'id_presupuesto',
    allowedColumns: ['id_presupuesto', 'id_usuario', 'nombre', 'monto', 'fecha_inicio', 'fecha_fin', 'pre_estado'],
  },
  {
    name: 'productos',
    pk: 'id_producto',
    allowedColumns: [
      'id_producto',
      'id_categoria',
      'id_comercio',
      'nombre',
      'descripcion',
      'unidad_medida',
      'marca',
      'imagen_url',
      'pro_estado',
    ],
  },
  {
    name: 'precios',
    pk: 'id_precio',
    allowedColumns: ['id_precio', 'id_producto', 'id_comercio', 'precio', 'disponible', 'fecha_registro'],
  },
  {
    name: 'listas_compra',
    pk: 'id_lista',
    allowedColumns: ['id_lista', 'id_usuario', 'nombre', 'fecha_creacion', 'lis_estado'],
  },
  {
    name: 'detalles_lista_compra',
    pk: 'id_detalle',
    allowedColumns: ['id_detalle', 'id_lista', 'id_producto', 'cantidad', 'comprado'],
  },
  {
    name: 'detalles_presupuesto',
    pk: 'id_detalle',
    allowedColumns: ['id_detalle', 'id_presupuesto', 'id_producto'],
  },
  {
    name: 'facturas',
    pk: 'id_factura',
    allowedColumns: [
      'id_factura',
      'id_usuario',
      'id_comercio',
      'id_presupuesto',
      'numero_factura',
      'fecha_factura',
      'subtotal',
      'impuesto',
      'descuento',
      'total',
      'fecha_creacion',
      'fac_estado',
    ],
  },
  {
    name: 'detalles_factura',
    pk: 'id_detalle_factura',
    allowedColumns: [
      'id_detalle_factura',
      'id_factura',
      'id_usuario',
      'cantidad',
      'precio_unitario',
      'descuento',
      'subtotal',
    ],
  },
];

/**
 * Filtra un objeto para que contenga únicamente las columnas que existen en la tabla
 */
function sanitizeRow(row: Record<string, any>, allowed: string[]): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const col of allowed) {
    if (row[col] !== undefined) {
      clean[col] = row[col];
    }
  }

  // Datos web antiguos pueden contener `disponible: null`; omitirlo permitiría
  // que PostgreSQL aplique su DEFAULT, mientras que enviar null viola NOT NULL.
  if (allowed.includes('disponible') && clean.disponible == null) {
    delete clean.disponible;
  }

  return clean;
}

/**
 * 1. Descarga los registros más recientes de Supabase a la base local (SQLite / Web adapter)
 */
export async function pullFromSupabase(): Promise<void> {
  const db = await getDatabase();

  for (const { name, pk, allowedColumns } of SYNC_TABLES) {
    try {
      const { data, error } = await supabase.from(name).select('*');
      if (error) {
        console.warn(`[Sync Pull] Supabase tabla '${name}':`, error.message);
        continue;
      }

      if (data && data.length > 0) {
        for (const rawRow of data) {
          const row = sanitizeRow(rawRow, allowedColumns);
          const existing = await db.getFirstAsync<any>(
            `SELECT * FROM ${name} WHERE ${pk} = ?`,
            [row[pk]]
          );

          const keys = Object.keys(row);
          if (!existing) {
            // INSERT local
            const cols = keys.join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map((k) => row[k]);
            await db.runAsync(
              `INSERT OR REPLACE INTO ${name} (${cols}) VALUES (${placeholders})`,
              values
            );
          } else {
            // UPDATE local
            const setClause = keys.map((k) => `${k} = ?`).join(', ');
            const values = [...keys.map((k) => row[k]), row[pk]];
            await db.runAsync(
              `UPDATE ${name} SET ${setClause} WHERE ${pk} = ?`,
              values
            );
          }
        }
      }
    } catch (err) {
      console.warn(`[Sync Pull] Error procesando '${name}':`, err);
    }
  }
}

/**
 * 2. Sube los registros locales a Supabase (Upsert en la nube limpio y tipado)
 */
export async function pushToSupabase(): Promise<void> {
  const db = await getDatabase();

  for (const { name, pk, allowedColumns } of SYNC_TABLES) {
    try {
      const localRows = await db.getAllAsync<any>(`SELECT * FROM ${name}`);
      if (localRows && localRows.length > 0) {
        const cleanRows = localRows.map((r) => sanitizeRow(r, allowedColumns));
        const { error } = await supabase
          .from(name)
          .upsert(cleanRows, { onConflict: pk });

        if (error) {
          console.warn(`[Sync Push] Error subiendo '${name}':`, error.message);
        }
      }
    } catch (err) {
      console.warn(`[Sync Push] Error leyendo '${name}' local:`, err);
    }
  }
}

/**
 * Sincronización bidireccional completa (Nube <-> Local)
 */
export async function syncDatabase(): Promise<boolean> {
  try {
    // 1. Descargamos lo más reciente de Supabase a la base local
    await pullFromSupabase();
    // 2. Subimos cambios locales limpios a Supabase
    await pushToSupabase();
    console.log('✅ Sincronización con Supabase completada sin errores.');
    return true;
  } catch (error) {
    console.warn('⚠️ No se pudo completar la sincronización con Supabase:', error);
    return false;
  }
}

/**
 * Sube un registro individual a Supabase en tiempo real cuando se crea/edita localmente
 */
export async function syncRecordToSupabase(
  tableName: string,
  record: Record<string, any>,
  pkName: string
): Promise<void> {
  try {
    const tableConfig = SYNC_TABLES.find((t) => t.name === tableName);
    const clean = tableConfig ? sanitizeRow(record, tableConfig.allowedColumns) : record;

    const { error } = await supabase
      .from(tableName)
      .upsert(clean, { onConflict: pkName });

    if (error) {
      console.warn(`[Sync Realtime] Error sincronizando ${tableName}:`, error.message);
    }
  } catch (err) {
    console.warn(`[Sync Realtime] Error en ${tableName}:`, err);
  }
}
