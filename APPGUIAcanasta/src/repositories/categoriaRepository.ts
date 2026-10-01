import { getDatabase } from '../database/database';
import { Categoria } from '../types/database';

export async function crearCategoria(
  nombre: string,
  descripcion?: string
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `
    INSERT INTO categorias (nombre, descripcion)
    VALUES (?, ?)
    `,
    [nombre, descripcion ?? null]
  );

  return result.lastInsertRowId;
}

export async function obtenerCategorias(): Promise<Categoria[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Categoria>(
    `
    SELECT *
    FROM categorias
    ORDER BY nombre ASC
    `
  );
}

export async function actualizarCategoria(
  id_categoria: number,
  nombre: string,
  descripcion?: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE categorias
    SET nombre = ?, descripcion = ?
    WHERE id_categoria = ?
    `,
    [nombre, descripcion ?? null, id_categoria]
  );
}

export async function eliminarCategoria(
  id_categoria: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    DELETE FROM categorias
    WHERE id_categoria = ?
    `,
    [id_categoria]
  );
}