import { getDatabase } from '../database/database';
import { MovimientoHogar, TipoMovimientoHogar } from '../types/database';

export async function crearMovimientoHogar(
  id_usuario: number,
  tipo: TipoMovimientoHogar,
  concepto: string,
  categoria: string,
  monto: number,
  fecha: string
): Promise<number> {
  const cleanConcept = concepto.trim();
  const cleanCategory = categoria.trim();
  if (!Number.isSafeInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('Inicia sesión para registrar un movimiento.');
  }
  if (tipo !== 'ingreso' && tipo !== 'gasto') {
    throw new Error('Selecciona si el movimiento es un ingreso o un gasto.');
  }
  if (!cleanConcept || !cleanCategory) {
    throw new Error('Completa el concepto y la categoría.');
  }
  if (!Number.isSafeInteger(monto) || monto <= 0) {
    throw new Error('El monto debe ser un valor entero mayor que cero.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error('La fecha del movimiento no es válida.');
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO movimientos_hogar
      (id_usuario, tipo, concepto, categoria, monto, fecha)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_usuario, tipo, cleanConcept, cleanCategory, monto, fecha]
  );
  return result.lastInsertRowId;
}

export async function obtenerMovimientosHogar(id_usuario: number): Promise<MovimientoHogar[]> {
  const db = await getDatabase();
  const movements = await db.getAllAsync<MovimientoHogar>(
    'SELECT * FROM movimientos_hogar WHERE id_usuario = ?',
    [id_usuario]
  );
  return movements.sort((left, right) =>
    right.fecha.localeCompare(left.fecha) ||
    right.id_movimiento_hogar - left.id_movimiento_hogar
  );
}

export async function eliminarMovimientoHogar(
  id_movimiento_hogar: number,
  id_usuario: number
): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'DELETE FROM movimientos_hogar WHERE id_movimiento_hogar = ? AND id_usuario = ?',
    [id_movimiento_hogar, id_usuario]
  );
  if (result.changes === 0) {
    throw new Error('El movimiento ya no existe o no pertenece a esta cuenta.');
  }
}
