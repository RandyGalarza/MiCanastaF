import { getDatabase } from '../database/database';
import { Producto } from '../types/database';

export async function crearProducto(
  id_categoria: number,
  id_comercio: number,
  nombre: string,
  unidad_medida: string,
  marca?: string,
  descripcion?: string
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `
    INSERT INTO productos
    (
      id_categoria,
      id_comercio,
      nombre,
      unidad_medida,
      marca,
      descripcion
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      id_categoria,
      id_comercio,
      nombre,
      unidad_medida,
      marca ?? null,
      descripcion ?? null
    ]
  );

  return result.lastInsertRowId;
}

export async function obtenerProductos(): Promise<Producto[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Producto>(
    `
    SELECT *
    FROM productos
    WHERE pro_estado = 1
    ORDER BY nombre ASC
    `
  );
}

export async function obtenerProductosPorComercio(
  id_comercio: number
): Promise<Producto[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Producto>(
    `
    SELECT *
    FROM productos
    WHERE id_comercio = ?
      AND pro_estado = 1
    ORDER BY nombre ASC
    `,
    [id_comercio]
  );
}

export async function obtenerProducto(
  id_producto: number
): Promise<Producto | null> {
  const db = await getDatabase();

  const producto = await db.getFirstAsync<Producto>(
    `
    SELECT *
    FROM productos
    WHERE id_producto = ?
    `,
    [id_producto]
  );

  return producto ?? null;
}

export async function actualizarProducto(
  id_producto: number,
  id_categoria: number,
  id_comercio: number,
  nombre: string,
  unidad_medida: string,
  marca?: string,
  descripcion?: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE productos
    SET
      id_categoria = ?,
      id_comercio = ?,
      nombre = ?,
      unidad_medida = ?,
      marca = ?,
      descripcion = ?
    WHERE id_producto = ?
    `,
    [
      id_categoria,
      id_comercio,
      nombre,
      unidad_medida,
      marca ?? null,
      descripcion ?? null,
      id_producto
    ]
  );
}

export async function eliminarProducto(
  id_producto: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE productos
    SET pro_estado = 0
    WHERE id_producto = ?
    `,
    [id_producto]
  );
}