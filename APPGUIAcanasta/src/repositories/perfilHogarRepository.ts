import { getDatabase } from '@/database/database';

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export interface PerfilHogar {
  id_perfil_hogar: number;
  id_usuario: number;
  integrantes: number;
  fecha_actualizacion: string;
}

export async function obtenerPerfilHogar(id_usuario: number): Promise<PerfilHogar | null> {
  const db = await getDatabase();
  return db.getFirstAsync<PerfilHogar>(
    'SELECT * FROM perfiles_hogar WHERE id_usuario = ?',
    [id_usuario]
  );
}

export async function guardarIntegrantesHogar(
  id_usuario: number,
  integrantes: number
): Promise<void> {
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('Inicia sesión para guardar el tamaño de tu hogar.');
  }
  if (!Number.isInteger(integrantes) || integrantes < 1 || integrantes > 20) {
    throw new Error('El tamaño del hogar debe estar entre 1 y 20 personas.');
  }

  const db = await getDatabase();
  const perfil = await obtenerPerfilHogar(id_usuario);
  if (perfil) {
    const result = await db.runAsync(
      'UPDATE perfiles_hogar SET integrantes = ?, fecha_actualizacion = ? WHERE id_usuario = ?',
      [integrantes, localDate(), id_usuario]
    );
    if (result.changes === 0) throw new Error('No se pudo actualizar el tamaño del hogar.');
    return;
  }

  const result = await db.runAsync(
    'INSERT INTO perfiles_hogar (id_usuario, integrantes, fecha_actualizacion) VALUES (?, ?, ?)',
    [id_usuario, integrantes, localDate()]
  );
  if (!result.lastInsertRowId) throw new Error('No se pudo guardar el tamaño del hogar.');
}
