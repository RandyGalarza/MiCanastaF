import { Compra } from '@/types/database';

export interface PrecioCatalogo {
  id_producto: number;
  id_comercio: number;
  precio: number;
  nombre_comercio: string;
}

export interface ResumenAhorroMensual {
  montoEstimado: number;
  productosComparados: number;
  referencias: { tienda: string; montoEstimado: number }[];
  comprasDelMes: number;
}

export function calcularAhorroMensualEstimado(
  compras: Compra[],
  precios: PrecioCatalogo[],
  mes: string
): ResumenAhorroMensual {
  const comprasDelMes = compras.filter((compra) => compra.fecha_compra.slice(0, 7) === mes);
  const preciosPorProducto = new Map<number, Map<number, PrecioCatalogo>>();

  for (const precio of precios) {
    if (
      !Number.isInteger(precio.id_producto) ||
      !Number.isInteger(precio.id_comercio) ||
      !Number.isFinite(precio.precio) ||
      precio.precio <= 0
    ) continue;

    let comercios = preciosPorProducto.get(precio.id_producto);
    if (!comercios) {
      comercios = new Map<number, PrecioCatalogo>();
      preciosPorProducto.set(precio.id_producto, comercios);
    }
    const anterior = comercios.get(precio.id_comercio);
    if (!anterior || precio.precio < anterior.precio) {
      comercios.set(precio.id_comercio, precio);
    }
  }

  const referencias = new Map<string, number>();
  let montoEstimado = 0;
  const productosComparados = new Set<number>();

  for (const compra of comprasDelMes) {
    for (const detalle of compra.detalles) {
      if (!Number.isInteger(detalle.id_producto) || !detalle.id_comercio) continue;
      const opciones = preciosPorProducto.get(detalle.id_producto);
      if (!opciones || opciones.size < 2) continue;
      const precioRegistrado = Number(detalle.precio_original);
      const cantidad = Number(detalle.cantidad);
      if (!Number.isFinite(precioRegistrado) || precioRegistrado <= 0 ||
        !Number.isFinite(cantidad) || cantidad <= 0) continue;

      const precioMasAlto = Math.max(...[...opciones.values()].map((opcion) => opcion.precio));
      const diferencia = Math.max(0, precioMasAlto - precioRegistrado) * cantidad;
      if (diferencia === 0) continue;

      const tienda = detalle.nombre_comercio || 'Comercio no identificado';
      referencias.set(tienda, (referencias.get(tienda) ?? 0) + diferencia);
      montoEstimado += diferencia;
      productosComparados.add(detalle.id_producto);
    }
  }

  return {
    montoEstimado,
    productosComparados: productosComparados.size,
    comprasDelMes: comprasDelMes.length,
    referencias: [...referencias.entries()]
      .map(([tienda, monto]) => ({ tienda, montoEstimado: monto }))
      .sort((left, right) => right.montoEstimado - left.montoEstimado),
  };
}
