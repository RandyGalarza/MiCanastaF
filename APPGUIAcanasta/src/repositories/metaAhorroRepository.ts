import { getDatabase } from '../database/database';
import { MetaAhorro } from '../types/database';

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export async function crearMetaAhorro(
  id_usuario: number,
  nombre: string,
  monto_objetivo: number,
  fecha_objetivo: string | null
): Promise<number> {
  const cleanName = nombre.trim();
  if (!Number.isSafeInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('Inicia sesión para crear una meta de ahorro.');
  }
  if (!cleanName) {
    throw new Error('Escribe un nombre para tu meta.');
  }
  if (!Number.isSafeInteger(monto_objetivo) || monto_objetivo <= 0) {
    throw new Error('El objetivo debe ser un monto entero mayor que cero.');
  }
  if (fecha_objetivo && !isValidDate(fecha_objetivo)) {
    throw new Error('Usa el formato de fecha AAAA-MM-DD.');
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO metas_ahorro (id_usuario, nombre, monto_objetivo, monto_ahorrado, fecha_objetivo)
     VALUES (?, ?, ?, ?, ?)`,
    [id_usuario, cleanName, monto_objetivo, 0, fecha_objetivo]
  );
  return result.lastInsertRowId;
}

export async function obtenerMetasAhorro(id_usuario: number): Promise<MetaAhorro[]> {
  const db = await getDatabase();
  const goals = await db.getAllAsync<MetaAhorro>(
    'SELECT * FROM metas_ahorro WHERE id_usuario = ?',
    [id_usuario]
  );
  return goals.sort((left, right) =>
    left.fecha_creacion.localeCompare(right.fecha_creacion) ||
    left.id_meta_ahorro - right.id_meta_ahorro
  );
}

export async function aportarAMetaAhorro(
  id_meta_ahorro: number,
  id_usuario: number,
  aporte: number
): Promise<void> {
  if (!Number.isSafeInteger(aporte) || aporte <= 0) {
    throw new Error('El aporte debe ser un monto entero mayor que cero.');
  }

  const db = await getDatabase();
  const goal = await db.getFirstAsync<MetaAhorro>(
    'SELECT * FROM metas_ahorro WHERE id_meta_ahorro = ? AND id_usuario = ?',
    [id_meta_ahorro, id_usuario]
  );
  if (!goal) {
    throw new Error('La meta ya no existe o no pertenece a esta cuenta.');
  }

  const result = await db.runAsync(
    'UPDATE metas_ahorro SET monto_ahorrado = ? WHERE id_meta_ahorro = ? AND id_usuario = ?',
    [Number(goal.monto_ahorrado) + aporte, id_meta_ahorro, id_usuario]
  );
  if (result.changes === 0) {
    throw new Error('No se pudo guardar el aporte a la meta.');
  }
}
