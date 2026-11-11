import { ProductoParaRecomendacion } from '../repositories/productoRepository';

export interface ProductoContextoAsistente extends ProductoParaRecomendacion {
  promedio_calificacion: number;
  cantidad_calificaciones: number;
  unidades_vendidas: number;
  compras_registradas: number;
}

export interface ProductoListaRecomendada {
  producto: ProductoContextoAsistente;
  cantidad: number;
  motivo: string;
}

export interface PlanListaRecomendada {
  presupuesto: number;
  total: number;
  productos: ProductoListaRecomendada[];
}

const PRESUPUESTO_MAXIMO = 100_000_000;

export function parsearMontoPresupuesto(valor: string): number | null {
  const texto = valor.trim().replace(/^(?:cop\s*)?\$\s*/i, '').replace(/\s*(?:cop|pesos?)$/i, '');
  const coincidencia = texto.match(/^([\d.,]+)\s*(mil|mill[oó]n(?:es)?)?$/i);
  if (!coincidencia) return null;

  const sufijo = coincidencia[2]?.toLowerCase();
  const cantidad = sufijo
    ? Number(coincidencia[1].replace(',', '.'))
    : Number(coincidencia[1].replace(/[.,]/g, ''));
  const multiplicador = sufijo?.startsWith('mill') ? 1_000_000 : sufijo ? 1_000 : 1;
  const monto = Math.round(cantidad * multiplicador);
  return Number.isSafeInteger(monto) && monto > 0 && monto <= PRESUPUESTO_MAXIMO ? monto : null;
}

export function extraerPresupuestoDeMensaje(mensaje: string): number | null {
  const moneda = mensaje.match(/(?:cop\s*)?\$\s*([\d.,]+)\s*(mil|mill[oó]n(?:es)?)?/i);
  if (moneda) return parsearMontoPresupuesto(`${moneda[1]} ${moneda[2] ?? ''}`);

  const indicado = mensaje.match(
    /(?:presupuesto|tope|hasta|por|con|de)\s*(?:de\s*)?(?:cop\s*)?([\d.,]+)\s*(mil|mill[oó]n(?:es)?)?/i
  );
  if (indicado) return parsearMontoPresupuesto(`${indicado[1]} ${indicado[2] ?? ''}`);

  const montoConSeparador = mensaje.match(/\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{5,9}\b/);
  return montoConSeparador ? parsearMontoPresupuesto(montoConSeparador[0]) : null;
}

export function validarPlanLista(
  valor: unknown,
  catalogo: ProductoContextoAsistente[],
  presupuesto: number
): PlanListaRecomendada {
  if (!Number.isFinite(presupuesto) || presupuesto <= 0 || presupuesto > PRESUPUESTO_MAXIMO) {
    throw new Error('El presupuesto indicado no es válido.');
  }
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > 30) {
    throw new Error('El asistente no devolvió una lista de productos válida.');
  }

  const catalogoPorId = new Map(catalogo.map((producto) => [producto.id_producto, producto]));
  const idsUsados = new Set<number>();
  const productos: ProductoListaRecomendada[] = valor.map((linea) => {
    if (typeof linea !== 'object' || linea === null) {
      throw new Error('La lista recomendada contiene un producto inválido.');
    }
    const item = linea as Record<string, unknown>;
    const idProducto = item.id_producto;
    const cantidad = item.cantidad;
    const motivo = item.motivo;
    if (
      typeof idProducto !== 'number' ||
      !Number.isInteger(idProducto) ||
      typeof cantidad !== 'number' ||
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      cantidad > 30 ||
      typeof motivo !== 'string' ||
      !motivo.trim() ||
      motivo.length > 200 ||
      idsUsados.has(idProducto)
    ) {
      throw new Error('La lista recomendada contiene cantidades o productos inválidos.');
    }

    const producto = catalogoPorId.get(idProducto);
    if (!producto || !Number.isFinite(producto.precio) || producto.precio <= 0) {
      throw new Error('La lista incluye un producto que no está disponible en el catálogo actual.');
    }
    idsUsados.add(idProducto);
    return { producto, cantidad, motivo: motivo.trim() };
  });

  const total = productos.reduce((suma, item) => suma + item.producto.precio * item.cantidad, 0);
  if (total > presupuesto + 0.01) {
    throw new Error('La lista recomendada supera el presupuesto. Pídele al asistente que la ajuste.');
  }
  return { presupuesto, total, productos };
}
