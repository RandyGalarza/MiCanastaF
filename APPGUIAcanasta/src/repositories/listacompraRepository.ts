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

export async function crearListaCompraConProducto(
  id_usuario: number,
  nombre: string,
  id_producto: number
): Promise<number> {
  const nombreLista = nombre.trim();
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('Inicia sesión para crear una lista de compra.');
  }
  if (!nombreLista || nombreLista.length > 60) {
    throw new Error('El nombre de la lista debe tener entre 1 y 60 caracteres.');
  }
  if (!Number.isInteger(id_producto) || id_producto <= 0) {
    throw new Error('Selecciona un producto válido.');
  }

  const db = await getDatabase();
  let id_lista = 0;
  await db.withTransactionAsync(async () => {
    const lista = await db.runAsync(
      'INSERT INTO listas_compra (id_usuario, nombre) VALUES (?, ?)',
      [id_usuario, nombreLista]
    );
    if (!lista.lastInsertRowId) throw new Error('No se pudo crear la lista de compra.');
    id_lista = lista.lastInsertRowId;
    await db.runAsync(
      'INSERT INTO detalles_lista_compra (id_lista, id_producto, cantidad, comprado) VALUES (?, ?, 1, 0)',
      [id_lista, id_producto]
    );
  });
  return id_lista;
}

export async function crearListaCompraPresupuestada(
  id_usuario: number,
  nombre: string,
  presupuesto: number,
  items: { id_producto: number; cantidad: number }[]
): Promise<{ id_lista: number; total: number; precios: Record<number, number> }> {
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('Inicia sesión para guardar una lista de compra.');
  }
  if (!nombre.trim() || nombre.trim().length > 60) {
    throw new Error('El nombre de la lista debe tener entre 1 y 60 caracteres.');
  }
  if (!Number.isFinite(presupuesto) || presupuesto <= 0 || presupuesto > 100_000_000) {
    throw new Error('El presupuesto de la lista no es válido.');
  }
  if (items.length === 0 || items.length > 30) {
    throw new Error('La lista debe contener entre 1 y 30 productos.');
  }

  const ids = new Set<number>();
  for (const item of items) {
    if (
      !Number.isInteger(item.id_producto) ||
      item.id_producto <= 0 ||
      !Number.isInteger(item.cantidad) ||
      item.cantidad < 1 ||
      item.cantidad > 30 ||
      ids.has(item.id_producto)
    ) {
      throw new Error('La lista contiene productos o cantidades inválidos.');
    }
    ids.add(item.id_producto);
  }

  const db = await getDatabase();
  const [productos, precios] = await Promise.all([
    db.getAllAsync<Producto>('SELECT * FROM productos WHERE pro_estado = 1'),
    db.getAllAsync<{ id_producto: number; precio: number; disponible: number }>(
      'SELECT id_producto, precio, disponible FROM precios'
    ),
  ]);
  const productosDisponibles = new Set(productos.map((producto) => Number(producto.id_producto)));
  const precioMinimo = new Map<number, number>();
  for (const precio of precios) {
    const idProducto = Number(precio.id_producto);
    const valor = Number(precio.precio);
    if (Number(precio.disponible) !== 1 || !Number.isFinite(valor) || valor <= 0) continue;
    const actual = precioMinimo.get(idProducto);
    if (actual == null || valor < actual) precioMinimo.set(idProducto, valor);
  }

  let total = 0;
  const preciosActuales: Record<number, number> = {};
  for (const item of items) {
    if (!productosDisponibles.has(item.id_producto)) {
      throw new Error('Un producto de la lista ya no está disponible.');
    }
    const precio = precioMinimo.get(item.id_producto);
    if (precio == null) throw new Error('Un producto de la lista ya no tiene un precio vigente.');
    total += precio * item.cantidad;
    preciosActuales[item.id_producto] = precio;
  }
  if (total > presupuesto + 0.01) {
    throw new Error('Los precios cambiaron y la lista supera el presupuesto. Revísala antes de guardarla.');
  }

  let id_lista = 0;
  await db.withTransactionAsync(async () => {
    const lista = await db.runAsync(
      'INSERT INTO listas_compra (id_usuario, nombre) VALUES (?, ?)',
      [id_usuario, nombre.trim()]
    );
    if (!lista.lastInsertRowId) throw new Error('No se pudo crear la lista de compra.');
    id_lista = lista.lastInsertRowId;

    for (const item of items) {
      const detalle = await db.runAsync(
        'INSERT INTO detalles_lista_compra (id_lista, id_producto, cantidad, comprado) VALUES (?, ?, ?, 0)',
        [id_lista, item.id_producto, item.cantidad]
      );
      if (!detalle.lastInsertRowId) throw new Error('No se pudo agregar un producto a la lista.');
    }
  });

  return { id_lista, total, precios: preciosActuales };
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

export async function marcarTodosItemsComprados(id_lista: number, comprado: boolean): Promise<void> {
  if (!Number.isInteger(id_lista) || id_lista <= 0) {
    throw new Error('Selecciona una lista válida.');
  }
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE detalles_lista_compra SET comprado = ? WHERE id_lista = ?',
    [comprado ? 1 : 0, id_lista]
  );
}
