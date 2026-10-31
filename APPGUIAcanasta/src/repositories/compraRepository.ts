import { getDatabase } from '@/database/database';
import { syncRecordToSupabase } from '@/database/syncService';
import { Comercio, Compra, DetalleCompra, VentaComercio } from '@/types/database';
import { getDemoDiscount } from '@/utils/demo-prices';
import { ItemListaCompra } from './listacompraRepository';

type CompraRow = Omit<Compra, 'detalles'>;

function isDetalleCompraArray(value: unknown): value is DetalleCompra[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === 'object' &&
    item !== null &&
    typeof item.nombre_producto === 'string' &&
    typeof item.unidad_medida === 'string' &&
    typeof item.nombre_comercio === 'string' &&
    Number.isFinite(Number(item.cantidad)) &&
    Number.isFinite(Number(item.precio_unitario)) &&
    Number.isFinite(Number(item.subtotal))
  );
}

function deserializeCompra(row: CompraRow): Compra {
  const parsed: unknown = JSON.parse(row.detalles_json);
  if (!isDetalleCompraArray(parsed)) {
    throw new Error(`El detalle de la factura ${row.numero_factura} no tiene un formato válido.`);
  }
  return { ...row, detalles: parsed };
}

export async function registrarCompra(
  id_usuario: number,
  id_lista: number,
  nombre_lista: string,
  items: ItemListaCompra[]
): Promise<number> {
  const purchasedItems = items.filter((item) => item.comprado === 1);
  if (purchasedItems.length === 0) {
    throw new Error('Marca al menos un producto comprado antes de continuar.');
  }

  const withoutPrice = purchasedItems.filter((item) => {
    const price = Number(item.precio);
    return !Number.isFinite(price) || price <= 0;
  });
  if (withoutPrice.length > 0) {
    throw new Error(`Agrega un precio válido a: ${withoutPrice.map((item) => item.nombre).join(', ')}.`);
  }

  const detalles: DetalleCompra[] = purchasedItems.map((item) => {
    const originalPrice = Number(item.precio);
    const promotion = getDemoDiscount(item.nombre, originalPrice);
    const price = promotion?.salePrice ?? originalPrice;
    const quantity = Number(item.cantidad);
    const discountPerUnit = originalPrice - price;
    return {
      id_producto: item.id_producto,
      id_comercio: item.id_comercio ?? null,
      nombre_producto: item.nombre,
      unidad_medida: item.unidad_medida,
      cantidad: quantity,
      nombre_comercio: item.nombre_comercio || 'Comercio no especificado',
      precio_original: originalPrice,
      precio_unitario: price,
      descuento_unitario: discountPerUnit,
      porcentaje_descuento: promotion?.percentage ?? 0,
      subtotal: price * quantity,
    };
  });

  const subtotal = detalles.reduce((sum, item) => sum + item.precio_original * item.cantidad, 0);
  const descuento = detalles.reduce((sum, item) => sum + item.descuento_unitario * item.cantidad, 0);
  const total = detalles.reduce((sum, item) => sum + item.subtotal, 0);
  const idCompra = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const fechaCompra = new Date().toISOString();
  const numeroFactura = `MC-${idCompra}`;
  const detallesJson = JSON.stringify(detalles);
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO compras
      (id_compra, id_usuario, id_lista, nombre_lista, numero_factura, fecha_compra, subtotal, descuento, total, detalles_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [idCompra, id_usuario, id_lista, nombre_lista, numeroFactura, fechaCompra, subtotal, descuento, total, detallesJson]
  );

  await syncRecordToSupabase(
    'compras',
    {
      id_compra: result.lastInsertRowId,
      id_usuario,
      id_lista,
      nombre_lista,
      numero_factura: numeroFactura,
      fecha_compra: fechaCompra,
      subtotal,
      descuento,
      total,
      detalles_json: detallesJson,
    },
    'id_compra'
  );

  return result.lastInsertRowId;
}

export async function obtenerCompras(id_usuario: number): Promise<Compra[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CompraRow>(
    'SELECT * FROM compras WHERE id_usuario = ? ORDER BY fecha_compra DESC',
    [id_usuario]
  );
  return rows
    .sort((left, right) => right.fecha_compra.localeCompare(left.fecha_compra))
    .map(deserializeCompra);
}

export async function obtenerCompra(id_compra: number, id_usuario: number): Promise<Compra | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CompraRow>(
    'SELECT * FROM compras WHERE id_compra = ? AND id_usuario = ?',
    [id_compra, id_usuario]
  );
  return row ? deserializeCompra(row) : null;
}

export async function obtenerVentasComercio(id_comercio: number): Promise<VentaComercio[]> {
  const db = await getDatabase();
  const [rows, comercios] = await Promise.all([
    db.getAllAsync<CompraRow>('SELECT * FROM compras'),
    db.getAllAsync<Comercio>('SELECT * FROM comercios'),
  ]);
  const comercio = comercios.find((item) => Number(item.id_comercio) === id_comercio);
  const normalizedName = comercio?.nombre.trim().toLocaleLowerCase();
  const nameMatches = normalizedName
    ? comercios.filter((item) => item.nombre.trim().toLocaleLowerCase() === normalizedName).length
    : 0;

  return rows
    .map(deserializeCompra)
    .flatMap((purchase) => {
      const productos = purchase.detalles.filter((item) =>
        item.id_comercio != null
          ? Number(item.id_comercio) === id_comercio
          : nameMatches === 1 && item.nombre_comercio.trim().toLocaleLowerCase() === normalizedName
      );
      if (productos.length === 0) return [];
      return [{
        id_compra: purchase.id_compra,
        numero_factura: purchase.numero_factura,
        fecha_compra: purchase.fecha_compra,
        nombre_lista: purchase.nombre_lista,
        total: productos.reduce((sum, item) => sum + item.subtotal, 0),
        productos,
      }];
    })
    .sort((left, right) => right.fecha_compra.localeCompare(left.fecha_compra));
}

export async function obtenerResumenComprasSistema(): Promise<{ cantidad: number; total: number }> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Pick<Compra, 'total'>>('SELECT total FROM compras');
  return {
    cantidad: rows.length,
    total: rows.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0),
  };
}
