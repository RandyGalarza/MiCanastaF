import { getDatabase } from '../database/database';
import { Comercio } from '../types/database';

export async function crearComercio(
  nombre: string,
  direccion?: string,
  telefono?: string,
  tipo_comercio?: string
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `
    INSERT INTO comercios
    (
      nombre,
      direccion,
      telefono,
      tipo_comercio
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      nombre,
      direccion ?? null,
      telefono ?? null,
      tipo_comercio ?? null
    ]
  );

  return result.lastInsertRowId;
}

export async function obtenerComercios(): Promise<Comercio[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Comercio>(
    `
    SELECT *
    FROM comercios
    WHERE estado = 1
    ORDER BY nombre ASC
    `
  );
}

export async function actualizarComercio(
  id_comercio: number,
  nombre: string,
  direccion?: string,
  telefono?: string,
  tipo_comercio?: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE comercios
    SET
      nombre = ?,
      direccion = ?,
      telefono = ?,
      tipo_comercio = ?
    WHERE id_comercio = ?
    `,
    [
      nombre,
      direccion ?? null,
      telefono ?? null,
      tipo_comercio ?? null,
      id_comercio
    ]
  );
}

export async function eliminarComercio(
  id_comercio: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE comercios
    SET estado = 0
    WHERE id_comercio = ?
    `,
    [id_comercio]
  );
}