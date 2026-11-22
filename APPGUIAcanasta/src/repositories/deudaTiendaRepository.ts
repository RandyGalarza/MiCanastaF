import { getDatabase } from '../database/database';
import { DeudaTienda } from '../types/database';

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export async function crearDeudaTienda(
  id_usuario: number,
  tienda: string,
  concepto: string,
  monto: number,
  fecha: string
): Promise<number> {
  const cleanStore = tienda.trim();
  const cleanConcept = concepto.trim();
  if (!Number.isSafeInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('Inicia sesión para registrar una deuda.');
  }
  if (!cleanStore || !cleanConcept) {
    throw new Error('Completa el nombre de la tienda y el motivo de la deuda.');
  }
  if (!Number.isSafeInteger(monto) || monto <= 0) {
    throw new Error('El monto debe ser un valor entero mayor que cero.');
  }
  if (!isValidDate(fecha)) {
    throw new Error('La fecha de la deuda no es válida.');
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO deudas_tienda (id_usuario, tienda, concepto, monto, fecha, pagada)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_usuario, cleanStore, cleanConcept, monto, fecha, 0]
  );
  return result.lastInsertRowId;
}

export async function obtenerDeudasTienda(id_usuario: number): Promise<DeudaTienda[]> {
  const db = await getDatabase();
  const debts = await db.getAllAsync<DeudaTienda>(
    'SELECT * FROM deudas_tienda WHERE id_usuario = ?',
    [id_usuario]
  );
  return debts.sort((left, right) =>
    Number(left.pagada) - Number(right.pagada) ||
    right.fecha.localeCompare(left.fecha) ||
    right.id_deuda - left.id_deuda
  );
}

export async function marcarDeudaTiendaPagada(id_deuda: number, id_usuario: number): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'UPDATE deudas_tienda SET pagada = 1 WHERE id_deuda = ? AND id_usuario = ?',
    [id_deuda, id_usuario]
  );
  if (result.changes === 0) {
    throw new Error('La deuda ya no existe o no pertenece a esta cuenta.');
  }
}
