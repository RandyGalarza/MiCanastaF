import { getDatabase } from '../database/database';
import { Usuario, RolUsuario } from '../types/database';

export async function crearUsuario(
  nombre: string,
  apellido: string,
  correo: string,
  contrasena: string,
  telefono?: string,
  rol: RolUsuario = 'usuario',
  id_comercio?: number | null
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
      telefono,
      rol,
      id_comercio
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      nombre,
      apellido,
      correo,
      contrasena,
      telefono ?? null,
      rol,
      id_comercio ?? null
    ]
  );

  return result.lastInsertRowId;
}

export async function obtenerUsuarios(): Promise<Usuario[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Usuario>(
    `
    SELECT *
    FROM usuarios
    WHERE usu_estado = 1
    ORDER BY nombre ASC
    `
  );
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
      AND usu_estado = 1
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
    SET usu_estado = 0
    WHERE id_usuario = ?
    `,
    [id_usuario]
  );
}

export async function actualizarContrasenaPorCorreo(
  correo: string,
  nuevaContrasena: string
): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `
    UPDATE usuarios
    SET contrasena = ?
    WHERE correo = ? AND usu_estado = 1
    `,
    [nuevaContrasena, correo]
  );

  return result.changes > 0;
}
