import { getDatabase } from '../database/database';
import { Presupuesto } from '../types/database';

export async function crearPresupuesto(
  id_usuario: number,
  nombre: string,
  monto_total: number,
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
      monto_total,
      fecha_inicio,
      fecha_fin
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      id_usuario,
      nombre,
      monto_total,
      fecha_inicio,
      fecha_fin
    ]
  );

  return result.lastInsertRowId;
}

export async function obtenerPresupuestos(
  id_usuario: number
): Promise<Presupuesto[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Presupuesto>(
    `
    SELECT *
    FROM presupuestos
    WHERE id_usuario = ?
    ORDER BY fecha_inicio DESC
    `,
    [id_usuario]
  );
}

export async function actualizarPresupuesto(
  id_presupuesto: number,
  nombre: string,
  monto_total: number,
  fecha_inicio: string,
  fecha_fin: string,
  estado: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE presupuestos
    SET
      nombre = ?,
      monto_total = ?,
      fecha_inicio = ?,
      fecha_fin = ?,
      estado = ?
    WHERE id_presupuesto = ?
    `,
    [
      nombre,
      monto_total,
      fecha_inicio,
      fecha_fin,
      estado,
      id_presupuesto
    ]
  );
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