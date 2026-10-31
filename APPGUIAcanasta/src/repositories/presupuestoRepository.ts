import { getDatabase } from '../database/database';
import { syncRecordToSupabase } from '../database/syncService';
import { Presupuesto } from '../types/database';

export async function crearPresupuesto(
  id_usuario: number,
  nombre: string,
  monto: number,
  fecha_inicio: string,
  fecha_fin: string
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `
    INSERT INTO presupuestos
    (
      id_usuario,
      nombre,
      monto,
      fecha_inicio,
      fecha_fin,
      pre_estado
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      id_usuario,
      nombre,
      monto,
      fecha_inicio,
      fecha_fin,
      1
    ]
  );

  await syncRecordToSupabase('presupuestos', {
    id_presupuesto: result.lastInsertRowId,
    id_usuario,
    nombre,
    monto,
    fecha_inicio,
    fecha_fin,
    pre_estado: 1,
  }, 'id_presupuesto');

  return result.lastInsertRowId;
}

export async function obtenerPresupuestos(
  id_usuario: number
): Promise<Presupuesto[]> {
  const db = await getDatabase();

  const budgets = await db.getAllAsync<Presupuesto>(
    `
    SELECT *
    FROM presupuestos
    WHERE id_usuario = ?
    `,
    [id_usuario]
  );
  return budgets.sort((left, right) =>
    right.fecha_inicio.localeCompare(left.fecha_inicio) ||
    right.id_presupuesto - left.id_presupuesto
  );
}

export async function actualizarPresupuesto(
  id_presupuesto: number,
  nombre: string,
  monto: number,
  fecha_inicio: string,
  fecha_fin: string,
  pre_estado: number
): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<Presupuesto>(
    'SELECT * FROM presupuestos WHERE id_presupuesto = ?',
    [id_presupuesto]
  );

  await db.runAsync(
    `
    UPDATE presupuestos
    SET
      nombre = ?,
      monto = ?,
      fecha_inicio = ?,
      fecha_fin = ?,
      pre_estado = ?
    WHERE id_presupuesto = ?
    `,
    [
      nombre,
      monto,
      fecha_inicio,
      fecha_fin,
      pre_estado,
      id_presupuesto
    ]
  );

  if (existing) {
    await syncRecordToSupabase('presupuestos', {
      ...existing,
      nombre,
      monto,
      fecha_inicio,
      fecha_fin,
      pre_estado,
    }, 'id_presupuesto');
  }
}

export async function eliminarPresupuesto(
  id_presupuesto: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    DELETE FROM presupuestos
    WHERE id_presupuesto = ?
    `,
    [id_presupuesto]
  );
}