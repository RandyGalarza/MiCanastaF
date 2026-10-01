import { getDatabase } from '../database/database';
import { Gasto } from '../types/database';

export async function crearGasto(
  id_usuario: number,
  monto: number,
  cantidad: number,
  id_producto?: number,
  descripcion?: string,
  fecha?: string
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `
    INSERT INTO gastos
    (
      id_usuario,
      id_producto,
      monto,
      cantidad,
      fecha,
      descripcion
    )
    VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?)
    `,
    [
      id_usuario,
      id_producto ?? null,
      monto,
      cantidad,
      fecha ?? null,
      descripcion ?? null
    ]
  );

  return result.lastInsertRowId;
}

export async function obtenerGastos(
  id_usuario: number
): Promise<Gasto[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Gasto>(
    `
    SELECT *
    FROM gastos
    WHERE id_usuario = ?
    ORDER BY fecha DESC
    `,
    [id_usuario]
  );
}

export async function actualizarGasto(
  id_gasto: number,
  monto: number,
  cantidad: number,
  id_producto?: number,
  descripcion?: string,
  fecha?: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE gastos
    SET
      id_producto = ?,
      monto = ?,
      cantidad = ?,
      fecha = ?,
      descripcion = ?
    WHERE id_gasto = ?
    `,
    [
      id_producto ?? null,
      monto,
      cantidad,
      fecha,
      descripcion ?? null,
      id_gasto
    ]
  );
}

export async function eliminarGasto(
  id_gasto: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    DELETE FROM gastos
    WHERE id_gasto = ?
    `,
    [id_gasto]
  );
}