import { getDatabase } from '@/database/database';
import { syncRecordToSupabase } from '@/database/syncService';
import { Comercio, Compra, DetalleCompra, VentaComercio } from '@/types/database';
import { getDemoDiscount } from '@/utils/demo-prices';
import { ItemListaCompra } from './listacompraRepository';

type CompraRow = Omit<Compra, 'detalles'>;

export interface MovimientoSaldo {
  id_movimiento: number;
  id_usuario: number;
  tipo: 'recarga' | 'compra';
  monto: number;
  descripcion: string;
  fecha: string;
  id_compra: number | null;
}

export interface PagoPendiente {
  id_pago: number;
  id_usuario: number;
  id_lista: number | null;
  nombre_lista: string;
  total: number;
  referencia: string;
  detalles_json: string;
  estado: 'pendiente' | 'pagado';
  id_compra: number | null;
  fecha_creacion: string;
}

export interface InformacionPagoCompra {
  metodo: string;
  referencia: string | null;
}

interface PreparedPurchase {
  detalles: DetalleCompra[];
  subtotal: number;
  descuento: number;
  total: number;
}

type InsertedPurchase = Awaited<ReturnType<typeof insertarCompra>>;

function readInsertedPurchase(value: InsertedPurchase | null): InsertedPurchase | null {
  return value;
}

function readPreparedPurchase(value: PreparedPurchase | null): PreparedPurchase | null {
  return value;
}

function readPayment(value: PagoPendiente | null): PagoPendiente | null {
  return value;
}

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

function prepararCompra(items: ItemListaCompra[]): PreparedPurchase {
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

  const withoutQuantity = purchasedItems.filter((item) => {
    const quantity = Number(item.cantidad);
    return !Number.isFinite(quantity) || quantity <= 0;
  });
  if (withoutQuantity.length > 0) {
    throw new Error(`Revisa la cantidad de: ${withoutQuantity.map((item) => item.nombre).join(', ')}.`);
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
  return { detalles, subtotal, descuento, total };
}

async function insertarCompra(
  id_usuario: number,
  id_lista: number | null,
  nombre_lista: string,
  prepared: PreparedPurchase
): Promise<{ id: number; fecha: string; factura: string; detallesJson: string }> {
  const { detalles, subtotal, descuento, total } = prepared;
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

  return { id: result.lastInsertRowId, fecha: fechaCompra, factura: numeroFactura, detallesJson };
}

async function sincronizarCompra(
  id: number,
  id_usuario: number,
  id_lista: number | null,
  nombre_lista: string,
  prepared: PreparedPurchase,
  purchase: { fecha: string; factura: string; detallesJson: string }
): Promise<void> {
  await syncRecordToSupabase(
    'compras',
    {
      id_compra: id,
      id_usuario,
      id_lista,
      nombre_lista,
      numero_factura: purchase.factura,
      fecha_compra: purchase.fecha,
      subtotal: prepared.subtotal,
      descuento: prepared.descuento,
      total: prepared.total,
      detalles_json: purchase.detallesJson,
    },
    'id_compra'
  );
}

export async function registrarCompra(
  id_usuario: number,
  id_lista: number,
  nombre_lista: string,
  items: ItemListaCompra[]
): Promise<number> {
  const prepared = prepararCompra(items);
  const purchase = await insertarCompra(id_usuario, id_lista, nombre_lista, prepared);
  await sincronizarCompra(purchase.id, id_usuario, id_lista, nombre_lista, prepared, purchase);

  return purchase.id;
}

async function obtenerOCrearBilletera(id_usuario: number): Promise<{ id_billetera: number; saldo: number }> {
  const db = await getDatabase();
  let wallet = await db.getFirstAsync<{ id_billetera: number; saldo: number }>(
    'SELECT * FROM billeteras WHERE id_usuario = ?',
    [id_usuario]
  );
  if (!wallet) {
    await db.runAsync(
      'INSERT OR IGNORE INTO billeteras (id_usuario, saldo) VALUES (?, ?)',
      [id_usuario, 0]
    );
    wallet = await db.getFirstAsync<{ id_billetera: number; saldo: number }>(
      'SELECT * FROM billeteras WHERE id_usuario = ?',
      [id_usuario]
    );
  }
  if (!wallet) throw new Error('No se pudo preparar la billetera de prueba.');
  return wallet;
}

export async function obtenerSaldoUsuario(id_usuario: number): Promise<number> {
  const wallet = await obtenerOCrearBilletera(id_usuario);
  return Number(wallet.saldo);
}

export async function obtenerMovimientosSaldo(id_usuario: number): Promise<MovimientoSaldo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MovimientoSaldo>(
    'SELECT * FROM movimientos_saldo WHERE id_usuario = ?',
    [id_usuario]
  );
  return rows.sort((left, right) => right.fecha.localeCompare(left.fecha));
}

export async function obtenerPagosPendientes(id_usuario: number): Promise<PagoPendiente[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PagoPendiente>(
    'SELECT * FROM pagos_pendientes WHERE id_usuario = ?',
    [id_usuario]
  );
  return rows
    .filter((payment) => payment.estado === 'pendiente')
    .sort((left, right) => right.fecha_creacion.localeCompare(left.fecha_creacion));
}

export async function recargarSaldoDemostracion(id_usuario: number, monto: number): Promise<void> {
  if (!Number.isSafeInteger(monto) || monto <= 0) {
    throw new Error('Ingresa un monto entero mayor que cero para la recarga de prueba.');
  }

  const db = await getDatabase();
  await obtenerOCrearBilletera(id_usuario);
  const fecha = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const current = await db.getFirstAsync<{ id_billetera: number; saldo: number }>(
      'SELECT * FROM billeteras WHERE id_usuario = ?',
      [id_usuario]
    );
    if (!current) throw new Error('No se encontró la billetera de prueba.');
    const result = await db.runAsync(
      'UPDATE billeteras SET saldo = ?, fecha_actualizacion = ? WHERE id_billetera = ?',
      [Number(current.saldo) + monto, fecha, current.id_billetera]
    );
    if (result.changes !== 1) throw new Error('No se pudo actualizar el saldo de prueba.');
    await db.runAsync(
      `INSERT INTO movimientos_saldo (id_usuario, tipo, monto, descripcion, fecha)
       VALUES (?, ?, ?, ?, ?)`,
      [id_usuario, 'recarga', monto, 'Recarga de saldo de demostración', fecha]
    );
  });
}

export async function pagarCompraConSaldo(
  id_usuario: number,
  id_lista: number,
  nombre_lista: string,
  items: ItemListaCompra[]
): Promise<number> {
  const prepared = prepararCompra(items);
  const db = await getDatabase();
  await obtenerOCrearBilletera(id_usuario);
  const fecha = new Date().toISOString();
  let purchase: InsertedPurchase | null = null;

  await db.withTransactionAsync(async () => {
    const wallet = await db.getFirstAsync<{ id_billetera: number; saldo: number }>(
      'SELECT * FROM billeteras WHERE id_usuario = ?',
      [id_usuario]
    );
    if (!wallet) throw new Error('No se encontró la billetera de prueba.');
    const balance = Number(wallet.saldo);
    if (balance < prepared.total) {
      throw new Error(`Saldo insuficiente. Te faltan ${Math.ceil(prepared.total - balance).toLocaleString('es-CO')} COP.`);
    }

    const result = await db.runAsync(
      'UPDATE billeteras SET saldo = ?, fecha_actualizacion = ? WHERE id_billetera = ?',
      [balance - prepared.total, fecha, wallet.id_billetera]
    );
    if (result.changes !== 1) throw new Error('No se pudo descontar el saldo de prueba.');

    const inserted = await insertarCompra(id_usuario, id_lista, nombre_lista, prepared);
    purchase = inserted;
    await db.runAsync(
      `INSERT INTO movimientos_saldo (id_usuario, tipo, monto, descripcion, fecha, id_compra)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_usuario, 'compra', -prepared.total, `Compra: ${nombre_lista}`, fecha, inserted.id]
    );
  });

  const completedPurchase = readInsertedPurchase(purchase);
  if (!completedPurchase) throw new Error('No se pudo finalizar el pago con saldo.');
  await sincronizarCompra(completedPurchase.id, id_usuario, id_lista, nombre_lista, prepared, completedPurchase);
  return completedPurchase.id;
}

export async function crearReferenciaPagoDemostracion(
  id_usuario: number,
  id_lista: number,
  nombre_lista: string,
  items: ItemListaCompra[]
): Promise<PagoPendiente> {
  const prepared = prepararCompra(items);
  const reference = `MC-PRUEBA-${Date.now()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
  const fecha = new Date().toISOString();
  const detailsJson = JSON.stringify(prepared.detalles);
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO pagos_pendientes
      (id_usuario, id_lista, nombre_lista, total, referencia, detalles_json, estado, fecha_creacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id_usuario, id_lista, nombre_lista, prepared.total, reference, detailsJson, 'pendiente', fecha]
  );
  return {
    id_pago: result.lastInsertRowId,
    id_usuario,
    id_lista,
    nombre_lista,
    total: prepared.total,
    referencia: reference,
    detalles_json: detailsJson,
    estado: 'pendiente',
    id_compra: null,
    fecha_creacion: fecha,
  };
}

export async function simularPagoReferencia(
  id_pago: number,
  id_usuario: number
): Promise<number> {
  const db = await getDatabase();
  let purchaseId = 0;
  let purchase: InsertedPurchase | null = null;
  let prepared: PreparedPurchase | null = null;
  let payment: PagoPendiente | null = null;

  await db.withTransactionAsync(async () => {
    payment = await db.getFirstAsync<PagoPendiente>(
      'SELECT * FROM pagos_pendientes WHERE id_pago = ? AND id_usuario = ?',
      [id_pago, id_usuario]
    );
    if (!payment) throw new Error('No encontramos esta referencia para tu cuenta.');
    if (payment.estado === 'pagado' && payment.id_compra) {
      purchaseId = payment.id_compra;
      return;
    }
    if (payment.estado !== 'pendiente') throw new Error('Esta referencia ya no está disponible.');

    const parsed: unknown = JSON.parse(payment.detalles_json);
    if (!isDetalleCompraArray(parsed)) {
      throw new Error('El detalle de esta referencia de prueba no es válido.');
    }
    prepared = {
      detalles: parsed,
      subtotal: parsed.reduce((sum, item) => sum + item.precio_original * item.cantidad, 0),
      descuento: parsed.reduce((sum, item) => sum + item.descuento_unitario * item.cantidad, 0),
      total: parsed.reduce((sum, item) => sum + item.subtotal, 0),
    };
    if (Math.abs(prepared.total - Number(payment.total)) > 0.01) {
      throw new Error('El total de la referencia no coincide con sus productos.');
    }

    const inserted = await insertarCompra(
      id_usuario,
      payment.id_lista,
      payment.nombre_lista,
      prepared
    );
    purchase = inserted;
    const update = await db.runAsync(
      "UPDATE pagos_pendientes SET estado = 'pagado', id_compra = ? WHERE id_pago = ? AND id_usuario = ?",
      [inserted.id, id_pago, id_usuario]
    );
    if (update.changes !== 1) throw new Error('No se pudo confirmar el pago de demostración.');
    purchaseId = inserted.id;
  });

  const completedPurchase = readInsertedPurchase(purchase);
  const completedPrepared = readPreparedPurchase(prepared);
  const completedPayment = readPayment(payment);
  if (completedPurchase && completedPrepared && completedPayment) {
    await sincronizarCompra(
      purchaseId,
      id_usuario,
      completedPayment.id_lista,
      completedPayment.nombre_lista,
      completedPrepared,
      completedPurchase
    );
  }
  if (!purchaseId) throw new Error('No se pudo completar la simulación de pago.');
  return purchaseId;
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

export async function obtenerInformacionPagoCompra(
  id_compra: number,
  id_usuario: number
): Promise<InformacionPagoCompra> {
  if (!Number.isInteger(id_compra) || id_compra <= 0 || !Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('No se pudo consultar la información del pago.');
  }

  const db = await getDatabase();
  const [walletMovement, demoPayment] = await Promise.all([
    db.getFirstAsync<Pick<MovimientoSaldo, 'id_movimiento'>>(
      "SELECT id_movimiento FROM movimientos_saldo WHERE id_compra = ? AND id_usuario = ? AND tipo = 'compra'",
      [id_compra, id_usuario]
    ),
    db.getFirstAsync<Pick<PagoPendiente, 'referencia'>>(
      "SELECT referencia FROM pagos_pendientes WHERE id_compra = ? AND id_usuario = ? AND estado = 'pagado'",
      [id_compra, id_usuario]
    ),
  ]);

  if (walletMovement) {
    return { metodo: 'Saldo de la app (demostración)', referencia: null };
  }
  if (demoPayment) {
    return { metodo: 'Referencia de pago simulada', referencia: demoPayment.referencia };
  }
  return { metodo: 'No disponible en el registro', referencia: null };
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

export async function obtenerPopularidadProductos(): Promise<
  Record<number, { unidadesVendidas: number; comprasRegistradas: number }>
> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Pick<Compra, 'detalles_json'>>(
    'SELECT detalles_json FROM compras'
  );
  const popularidad: Record<number, { unidadesVendidas: number; comprasRegistradas: number }> = {};

  for (const row of rows) {
    let detalles: unknown;
    try {
      detalles = JSON.parse(row.detalles_json);
    } catch (error) {
      console.warn('Se omitió una compra con detalle JSON inválido al calcular popularidad:', error);
      continue;
    }
    if (!Array.isArray(detalles)) {
      console.warn('Se omitió una compra con detalle inválido al calcular popularidad.');
      continue;
    }

    const productosEnCompra = new Set<number>();
    for (const detalle of detalles) {
      if (typeof detalle !== 'object' || detalle === null) continue;
      const item = detalle as Record<string, unknown>;
      const idProducto = Number(item.id_producto);
      const cantidad = Number(item.cantidad);
      if (!Number.isInteger(idProducto) || idProducto <= 0 || !Number.isFinite(cantidad) || cantidad <= 0) {
        continue;
      }

      const resumen = popularidad[idProducto] ?? { unidadesVendidas: 0, comprasRegistradas: 0 };
      resumen.unidadesVendidas += cantidad;
      popularidad[idProducto] = resumen;
      productosEnCompra.add(idProducto);
    }

    for (const idProducto of productosEnCompra) {
      popularidad[idProducto].comprasRegistradas += 1;
    }
  }

  return popularidad;
}
