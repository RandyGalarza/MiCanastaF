import { getDatabase } from '../database/database';
import { Categoria } from '../types/database';

async function hasLegacyNameColumn(): Promise<boolean> {
  const db = await getDatabase();
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categorias)');
  return columns.some((column) => column.name === 'nombre');
}

export async function crearCategoria(
  descripcion: string
): Promise<number> {
  const db = await getDatabase();

  const hasLegacyName = await hasLegacyNameColumn();
  const result = await db.runAsync(
    hasLegacyName
      ? 'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)'
      : 'INSERT INTO categorias (descripcion) VALUES (?)',
    hasLegacyName ? [descripcion, descripcion] : [descripcion]
  );

  return result.lastInsertRowId;
}

export async function obtenerCategorias(): Promise<Categoria[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Categoria>(
    `
    SELECT *
    FROM categorias
    ORDER BY id_categoria ASC
    `
  );
}

export async function actualizarCategoria(
  id_categoria: number,
  descripcion: string
): Promise<void> {
  const db = await getDatabase();

  const hasLegacyName = await hasLegacyNameColumn();
  await db.runAsync(
    hasLegacyName
      ? 'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id_categoria = ?'
      : 'UPDATE categorias SET descripcion = ? WHERE id_categoria = ?',
    hasLegacyName ? [descripcion, descripcion, id_categoria] : [descripcion, id_categoria]
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