import { getDatabase } from '../database/database';
import { Usuario } from '../types/database';

export async function crearUsuario(
  nombre: string,
  apellido: string,
  correo: string,
  contrasena: string,
  telefono?: string
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `
    INSERT INTO usuarios
    (
      nombre,
      apellido,
      correo,
      contrasena,
      telefono
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      nombre,
      apellido,
      correo,
      contrasena,
      telefono ?? null
    ]
  );

  return result.lastInsertRowId;
}

export async function obtenerUsuario(
  id_usuario: number
): Promise<Usuario | null> {
  const db = await getDatabase();

  const usuario = await db.getFirstAsync<Usuario>(
    `
    SELECT *
    FROM usuarios
    WHERE id_usuario = ?
    `,
    [id_usuario]
  );

  return usuario ?? null;
}

export async function obtenerUsuarioPorCorreo(
  correo: string
): Promise<Usuario | null> {
  const db = await getDatabase();

  const usuario = await db.getFirstAsync<Usuario>(
    `
    SELECT *
    FROM usuarios
    WHERE correo = ?
      AND estado = 1
    `,
    [correo]
  );

  return usuario ?? null;
}

export async function actualizarUsuario(
  id_usuario: number,
  nombre: string,
  apellido: string,
  telefono?: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE usuarios
    SET
      nombre = ?,
      apellido = ?,
      telefono = ?
    WHERE id_usuario = ?
    `,
    [
      nombre,
      apellido,
      telefono ?? null,
      id_usuario
    ]
  );
}

export async function eliminarUsuario(
  id_usuario: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE usuarios
    SET estado = 0
    WHERE id_usuario = ?
    `,
    [id_usuario]
  );
}