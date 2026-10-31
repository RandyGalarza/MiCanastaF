import { getDatabase } from '../database/database';
import { DetalleListaCompra, ListaCompra, Producto } from '../types/database';

export type ItemListaCompra = DetalleListaCompra &
  Pick<Producto, 'nombre' | 'unidad_medida'> & {
    precio?: number | null;
    id_comercio?: number | null;
    nombre_comercio?: string | null;
  };

export async function obtenerListasCompra(id_usuario: number): Promise<ListaCompra[]> {
  const db = await getDatabase();
  return db.getAllAsync<ListaCompra>(
    'SELECT * FROM listas_compra WHERE id_usuario = ? AND lis_estado = 1 ORDER BY fecha_creacion DESC',
    [id_usuario]
  );
}

export async function crearListaCompra(id_usuario: number, nombre: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync('INSERT INTO listas_compra (id_usuario, nombre) VALUES (?, ?)', [id_usuario, nombre]);
  return result.lastInsertRowId;
}

export async function eliminarListaCompra(id_lista: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM detalles_lista_compra WHERE id_lista = ?', [id_lista]);
  await db.runAsync('DELETE FROM listas_compra WHERE id_lista = ?', [id_lista]);
}

export async function obtenerItemsLista(id_lista: number): Promise<ItemListaCompra[]> {
  const db = await getDatabase();
  return db.getAllAsync<ItemListaCompra>(
    `SELECT d.*, p.nombre, p.unidad_medida, pr.precio,
            COALESCE(pr.id_comercio, p.id_comercio) AS id_comercio,
            COALESCE(c.nombre, pc.nombre) AS nombre_comercio
     FROM detalles_lista_compra d
     JOIN productos p ON p.id_producto = d.id_producto
     LEFT JOIN precios pr ON pr.id_precio = (
       SELECT p2.id_precio
       FROM precios p2
       WHERE p2.id_producto = p.id_producto AND p2.disponible = 1 AND p2.precio > 0
       ORDER BY p2.precio ASC
       LIMIT 1
     )
     LEFT JOIN comercios c ON c.id_comercio = pr.id_comercio
     LEFT JOIN comercios pc ON pc.id_comercio = p.id_comercio
     WHERE d.id_lista = ? ORDER BY p.nombre ASC`,
    [id_lista]
  );
}

export async function agregarProductoALista(id_lista: number, id_producto: number): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<DetalleListaCompra>(
    'SELECT * FROM detalles_lista_compra WHERE id_lista = ? AND id_producto = ?',
    [id_lista, id_producto]
  );
  if (existing) {
    await db.runAsync('UPDATE detalles_lista_compra SET cantidad = ?, comprado = 0 WHERE id_detalle = ?', [Number(existing.cantidad) + 1, existing.id_detalle]);
    return;
  }
  await db.runAsync('INSERT INTO detalles_lista_compra (id_lista, id_producto, cantidad, comprado) VALUES (?, ?, 1, 0)', [id_lista, id_producto]);
}

export async function actualizarCantidadItem(id_detalle: number, cantidad: number): Promise<void> {
  const db = await getDatabase();
  if (cantidad <= 0) {
    await db.runAsync('DELETE FROM detalles_lista_compra WHERE id_detalle = ?', [id_detalle]);
    return;
  }
  await db.runAsync('UPDATE detalles_lista_compra SET cantidad = ? WHERE id_detalle = ?', [cantidad, id_detalle]);
}

export async function marcarItemComprado(id_detalle: number, comprado: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE detalles_lista_compra SET comprado = ? WHERE id_detalle = ?', [comprado ? 1 : 0, id_detalle]);
}
