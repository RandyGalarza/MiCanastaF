import { getDatabase } from '../database/database';
import { Producto } from '../types/database';

export interface ProductoParaRecomendacion extends Producto {
  precio: number;
  categoria: string;
}

export async function crearProducto(
  id_categoria: number,
  id_comercio: number,
  nombre: string,
  unidad_medida: string,
  marca?: string,
  descripcion?: string,
  imagen_url?: string
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
      descripcion,
      imagen_url
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id_categoria,
      id_comercio,
      nombre,
      unidad_medida,
      marca ?? null,
      descripcion ?? null,
      imagen_url ?? null
    ]
  );

  return result.lastInsertRowId;
}

export async function obtenerProductos(): Promise<Producto[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Producto>(
    `
    SELECT p.*, pr.precio
    FROM productos p
    LEFT JOIN precios pr ON p.id_producto = pr.id_producto AND pr.disponible = 1
    WHERE p.pro_estado = 1
    ORDER BY p.nombre ASC
    `
  );
}

export async function obtenerCatalogoParaRecomendacion(): Promise<ProductoParaRecomendacion[]> {
  const db = await getDatabase();
  const [productos, precios, categorias] = await Promise.all([
    db.getAllAsync<Producto>('SELECT * FROM productos WHERE pro_estado = 1'),
    db.getAllAsync<{ id_producto: number; precio: number; disponible: number }>(
      'SELECT id_producto, precio, disponible FROM precios'
    ),
    db.getAllAsync<{ id_categoria: number; descripcion: string }>('SELECT * FROM categorias'),
  ]);
  const precioMinimo = new Map<number, number>();
  const categoriaPorId = new Map(
    categorias.map((categoria) => [Number(categoria.id_categoria), categoria.descripcion])
  );

  for (const precio of precios) {
    const idProducto = Number(precio.id_producto);
    const valor = Number(precio.precio);
    if (Number(precio.disponible) !== 1 || !Number.isFinite(valor) || valor <= 0) continue;
    const actual = precioMinimo.get(idProducto);
    if (actual == null || valor < actual) precioMinimo.set(idProducto, valor);
  }

  return productos.flatMap((producto) => {
    const precio = precioMinimo.get(Number(producto.id_producto));
    if (precio == null) return [];
    return [{
      ...producto,
      precio,
      categoria: categoriaPorId.get(Number(producto.id_categoria)) ?? 'Sin categoría',
    }];
  });
}

export async function obtenerProductosPorComercio(
  id_comercio: number
): Promise<Producto[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Producto>(
    `
    SELECT p.*, pr.precio
    FROM productos p
    LEFT JOIN precios pr ON p.id_producto = pr.id_producto AND pr.disponible = 1
    WHERE p.id_comercio = ?
      AND p.pro_estado = 1
    ORDER BY p.nombre ASC
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
    SELECT p.*, pr.precio
    FROM productos p
    LEFT JOIN precios pr ON p.id_producto = pr.id_producto AND pr.disponible = 1
    WHERE p.id_producto = ?
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
  descripcion?: string,
  imagen_url?: string
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
      descripcion = ?,
      imagen_url = ?
    WHERE id_producto = ?
    `,
    [
      id_categoria,
      id_comercio,
      nombre,
      unidad_medida,
      marca ?? null,
      descripcion ?? null,
      imagen_url ?? null,
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
