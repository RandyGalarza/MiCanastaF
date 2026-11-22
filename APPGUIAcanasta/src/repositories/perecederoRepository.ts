import { getDatabase } from '@/database/database';

export interface Perecedero {
  id_perecedero: number;
  id_usuario: number;
  nombre: string;
  fecha_vencimiento: string;
  cantidad: string;
  consumido: number;
  notification_id: string | null;
  fecha_creacion: string;
}

export async function obtenerPerecederos(id_usuario: number): Promise<Perecedero[]> {
  const db = await getDatabase();
  const items = await db.getAllAsync<Perecedero>(
    'SELECT * FROM perecederos WHERE id_usuario = ?',
    [id_usuario]
  );
  return items.sort((left, right) =>
    left.fecha_vencimiento.localeCompare(right.fecha_vencimiento) ||
    left.nombre.localeCompare(right.nombre)
  );
}

export async function crearPerecedero(
  id_usuario: number,
  nombre: string,
  fecha_vencimiento: string,
  cantidad: string
): Promise<number> {
  const normalizedName = nombre.trim();
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('Inicia sesión para guardar tus alimentos.');
  }
  if (!normalizedName || normalizedName.length > 80) {
    throw new Error('Escribe un nombre de hasta 80 caracteres.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_vencimiento)) {
    throw new Error('Usa una fecha válida con formato AAAA-MM-DD.');
  }
  const [year, month, day] = fecha_vencimiento.split('-').map(Number);
  if (year < 1900) throw new Error('El año de vencimiento no es válido.');
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error('La fecha de vencimiento no es válida.');
  }
  if (cantidad.trim().length > 40) {
    throw new Error('La cantidad debe tener hasta 40 caracteres.');
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO perecederos (id_usuario, nombre, fecha_vencimiento, cantidad, consumido, notification_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id_usuario, normalizedName, fecha_vencimiento, cantidad.trim(), 0, null]
  );
  if (!result.lastInsertRowId) throw new Error('No se pudo guardar el alimento.');
  return result.lastInsertRowId;
}

export async function actualizarNotificacionPerecedero(
  id_perecedero: number,
  id_usuario: number,
  notification_id: string | null
): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'UPDATE perecederos SET notification_id = ? WHERE id_perecedero = ? AND id_usuario = ?',
    [notification_id, id_perecedero, id_usuario]
  );
  if (result.changes === 0) throw new Error('No se encontró el alimento para guardar su recordatorio.');
}

export async function marcarPerecederoConsumido(
  id_perecedero: number,
  id_usuario: number
): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'UPDATE perecederos SET consumido = 1, notification_id = ? WHERE id_perecedero = ? AND id_usuario = ?',
    [null, id_perecedero, id_usuario]
  );
  if (result.changes === 0) throw new Error('No se encontró el alimento para actualizarlo.');
}

export async function eliminarPerecedero(
  id_perecedero: number,
  id_usuario: number
): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'DELETE FROM perecederos WHERE id_perecedero = ? AND id_usuario = ?',
    [id_perecedero, id_usuario]
  );
  if (result.changes === 0) throw new Error('No se encontró el alimento para eliminarlo.');
}
