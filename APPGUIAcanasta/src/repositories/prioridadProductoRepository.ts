import { getDatabase } from '@/database/database';

export type PrioridadProducto = 'basico' | 'importante' | 'puede_esperar';

const PRIORIDADES_VALIDAS: PrioridadProducto[] = ['basico', 'importante', 'puede_esperar'];

function esPrioridadProducto(value: string | null): value is PrioridadProducto {
  return value === 'basico' || value === 'importante' || value === 'puede_esperar';
}

export async function obtenerPrioridadesProductos(
  id_usuario: number
): Promise<Record<number, PrioridadProducto>> {
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('El usuario seleccionado no es válido.');
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id_producto: number; nivel: string }>(
    'SELECT id_producto, nivel FROM prioridades_producto WHERE id_usuario = ?',
    [id_usuario]
  );
  const prioridades: Record<number, PrioridadProducto> = {};
  for (const row of rows) {
    if (esPrioridadProducto(row.nivel)) {
      prioridades[Number(row.id_producto)] = row.nivel;
    }
  }
  return prioridades;
}

export async function guardarPrioridadProducto(
  id_usuario: number,
  id_producto: number,
  nivel: PrioridadProducto | null
): Promise<void> {
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('Inicia sesión para guardar prioridades del hogar.');
  }
  if (!Number.isInteger(id_producto) || id_producto <= 0) {
    throw new Error('El producto seleccionado no es válido.');
  }
  if (nivel !== null && !PRIORIDADES_VALIDAS.includes(nivel)) {
    throw new Error('Selecciona una prioridad válida.');
  }

  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id_prioridad: number }>(
      'SELECT id_prioridad FROM prioridades_producto WHERE id_usuario = ? AND id_producto = ?',
      [id_usuario, id_producto]
    );
    if (nivel === null) {
      if (existing) {
        await db.runAsync(
          'DELETE FROM prioridades_producto WHERE id_usuario = ? AND id_producto = ?',
          [id_usuario, id_producto]
        );
      }
      return;
    }
    if (existing) {
      await db.runAsync(
        'UPDATE prioridades_producto SET nivel = ? WHERE id_usuario = ? AND id_producto = ?',
        [nivel, id_usuario, id_producto]
      );
    } else {
      await db.runAsync(
        'INSERT INTO prioridades_producto (id_usuario, id_producto, nivel) VALUES (?, ?, ?)',
        [id_usuario, id_producto, nivel]
      );
    }
  });
}
