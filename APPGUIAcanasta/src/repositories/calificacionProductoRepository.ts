import { getDatabase } from '../database/database';
import { syncRecordToSupabase } from '../database/syncService';
import { CalificacionProducto } from '../types/database';

export interface ResumenCalificacionProducto {
  promedio: number;
  cantidad: number;
  miCalificacion: number | null;
}

export async function obtenerResumenCalificaciones(
  id_usuario?: number
): Promise<Record<number, ResumenCalificacionProducto>> {
  const db = await getDatabase();
  const calificaciones = await db.getAllAsync<CalificacionProducto>(
    'SELECT * FROM calificaciones_productos'
  );
  const acumulados: Record<number, { total: number; cantidad: number; miCalificacion: number | null }> = {};

  for (const calificacion of calificaciones) {
    const idProducto = Number(calificacion.id_producto);
    const puntuacion = Number(calificacion.puntuacion);
    if (!Number.isInteger(idProducto) || !Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      console.warn('Se omitió una calificación de producto con datos inválidos.');
      continue;
    }

    const resumen = acumulados[idProducto] ?? { total: 0, cantidad: 0, miCalificacion: null };
    resumen.total += puntuacion;
    resumen.cantidad += 1;
    if (id_usuario != null && Number(calificacion.id_usuario) === id_usuario) {
      resumen.miCalificacion = puntuacion;
    }
    acumulados[idProducto] = resumen;
  }

  return Object.fromEntries(
    Object.entries(acumulados).map(([idProducto, resumen]) => [
      Number(idProducto),
      {
        promedio: resumen.total / resumen.cantidad,
        cantidad: resumen.cantidad,
        miCalificacion: resumen.miCalificacion,
      },
    ])
  );
}

export async function guardarCalificacionProducto(
  id_usuario: number,
  id_producto: number,
  puntuacion: number
): Promise<void> {
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('Inicia sesión para calificar un producto.');
  }
  if (!Number.isInteger(id_producto) || id_producto <= 0) {
    throw new Error('El producto seleccionado no es válido.');
  }
  if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
    throw new Error('La calificación debe estar entre 1 y 5 estrellas.');
  }

  const db = await getDatabase();
  const fecha_calificacion = new Date().toISOString();
  let savedRating: CalificacionProducto | null = null;

  await db.withTransactionAsync(async () => {
    const existingRows = await db.getAllAsync<CalificacionProducto>(
      'SELECT * FROM calificaciones_productos'
    );
    const existing = existingRows.find(
      (item) => Number(item.id_usuario) === id_usuario && Number(item.id_producto) === id_producto
    );
    const id_calificacion = existing?.id_calificacion ??
      Date.now() * 1000 + Math.floor(Math.random() * 1000);

    await db.runAsync(
      existing
        ? 'UPDATE calificaciones_productos SET puntuacion = ?, fecha_calificacion = ? WHERE id_calificacion = ?'
        : 'INSERT INTO calificaciones_productos (id_calificacion, id_producto, id_usuario, puntuacion, fecha_calificacion) VALUES (?, ?, ?, ?, ?)',
      existing
        ? [puntuacion, fecha_calificacion, id_calificacion]
        : [id_calificacion, id_producto, id_usuario, puntuacion, fecha_calificacion]
    );
    savedRating = { id_calificacion, id_producto, id_usuario, puntuacion, fecha_calificacion };
  });

  if (!savedRating) throw new Error('No se pudo guardar la calificación.');
  await syncRecordToSupabase(
    'calificaciones_productos',
    savedRating,
    'id_calificacion'
  );
}
