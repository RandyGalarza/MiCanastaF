import { getDatabase } from './database';
import { supabase } from './supabaseClient';

export interface SyncQueueItem {
  id_queue: number;
  tabla: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  datos_json: string;
  fecha_creacion: string;
  intentos: number;
}

export async function encolarSincronizacion(
  tabla: string,
  operacion: 'INSERT' | 'UPDATE' | 'DELETE',
  datos: Record<string, any>
): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO sync_queue (tabla, operacion, datos_json, fecha_creacion, intentos)
       VALUES (?, ?, ?, ?, ?)`,
      [tabla, operacion, JSON.stringify(datos), new Date().toISOString(), 0]
    );
  } catch (error) {
    console.warn('No se pudo encolar sync offline:', error);
  }
}

export async function procesarColaSincronizacion(): Promise<{ procesados: number; fallidos: number }> {
  try {
    const db = await getDatabase();
    const pendientes = await db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue ORDER BY id_queue ASC LIMIT 50`
    );

    if (!pendientes || pendientes.length === 0) {
      return { procesados: 0, fallidos: 0 };
    }

    let procesados = 0;
    let fallidos = 0;

    for (const item of pendientes) {
      try {
        const payload = JSON.parse(item.datos_json);
        let error: any = null;

        if (item.operacion === 'INSERT') {
          const res = item.tabla === 'confirmaciones_reporte'
            ? await supabase.from(item.tabla).upsert(payload, { onConflict: 'id_reporte,id_usuario' })
            : await supabase.from(item.tabla).upsert(payload);
          error = res.error;
        } else if (item.operacion === 'UPDATE') {
          const res = item.tabla === 'confirmaciones_reporte'
            ? await supabase.from(item.tabla).upsert(payload, { onConflict: 'id_reporte,id_usuario' })
            : await supabase.from(item.tabla).upsert(payload);
          error = res.error;
        } else if (item.operacion === 'DELETE') {
          // Si viene con pk
          const keys = Object.keys(payload);
          if (keys.length > 0) {
            const pk = keys[0];
            const res = await supabase.from(item.tabla).delete().eq(pk, payload[pk]);
            error = res.error;
          }
        }

        if (error) {
          console.warn(`[Sync Queue] Error procesando item ${item.id_queue}:`, error.message);
          await db.runAsync(
            `UPDATE sync_queue SET intentos = ? WHERE id_queue = ?`,
            [Number(item.intentos || 0) + 1, item.id_queue]
          );
          fallidos++;
        } else {
          await db.runAsync(
            `DELETE FROM sync_queue WHERE id_queue = ?`,
            [item.id_queue]
          );
          procesados++;
        }
      } catch (err) {
        console.warn(`[Sync Queue] Excepción con item ${item.id_queue}:`, err);
        fallidos++;
      }
    }

    return { procesados, fallidos };
  } catch (err) {
    console.warn('Error al procesar cola de sincronización:', err);
    return { procesados: 0, fallidos: 0 };
  }
}
