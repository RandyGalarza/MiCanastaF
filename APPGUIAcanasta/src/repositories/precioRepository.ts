import { getDatabase } from '../database/database';
import { Precio } from '../types/database';

export async function crearPrecio(
  id_producto: number,
  id_comercio: number,
  precio: number,
  fecha?: string
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `
    INSERT INTO precios
    (
      id_producto,
      id_comercio,
      precio,
      fecha_registro
    )
    VALUES (?, ?, ?, COALESCE(?, CURRENT_DATE))
    `,
    [
      id_producto,
      id_comercio,
      precio,
      fecha ?? null
    ]
  );

  return result.lastInsertRowId;
}

export async function obtenerPreciosProducto(
  id_producto: number
): Promise<Precio[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Precio>(
    `
    SELECT *
    FROM precios
    WHERE id_producto = ?
      AND disponible = 1
    ORDER BY precio ASC
    `,
    [id_producto]
  );
}

export async function actualizarPrecio(
  id_precio: number,
  precio: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE precios
    SET precio = ?
    WHERE id_precio = ?
    `,
    [precio, id_precio]
  );
}

export async function eliminarPrecio(
  id_precio: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE precios
    SET disponible = 0
    WHERE id_precio = ?
    `,
    [id_precio]
  );
}