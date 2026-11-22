import { ProductoParaRecomendacion } from '@/repositories/productoRepository';

const RECOMENDACIONES_BASE = [
  { nombre: 'Arroz', palabras: ['arroz'], porCuatro: 2 },
  { nombre: 'Legumbres', palabras: ['lenteja', 'frijol', 'fríjol', 'garbanzo'], porCuatro: 1 },
  { nombre: 'Huevos', palabras: ['huevo'], porCuatro: 1 },
  { nombre: 'Proteína', palabras: ['pollo', 'pescado', 'carne'], porCuatro: 1 },
  { nombre: 'Verduras', palabras: ['tomate', 'zanahoria', 'cebolla'], porCuatro: 2 },
  { nombre: 'Fruta', palabras: ['banano', 'platano', 'plátano', 'guayaba', 'papaya'], porCuatro: 2 },
];

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO');
}

export interface ItemCanastaHogar {
  producto: ProductoParaRecomendacion;
  cantidad: number;
  grupo: string;
}

export function generarCanastaHogar(
  productos: ProductoParaRecomendacion[],
  integrantes: number
): ItemCanastaHogar[] {
  if (!Number.isInteger(integrantes) || integrantes < 1 || integrantes > 20) return [];
  const productosUsados = new Set<number>();
  const recomendaciones: ItemCanastaHogar[] = [];
  const productosEconomicos = [...productos].sort((left, right) => left.precio - right.precio);

  for (const recomendacion of RECOMENDACIONES_BASE) {
    const palabras = recomendacion.palabras.map(normalizar);
    const producto = productosEconomicos.find((candidato) =>
      !productosUsados.has(candidato.id_producto) &&
      palabras.some((palabra) => normalizar(candidato.nombre).includes(palabra))
    );
    if (!producto) continue;

    productosUsados.add(producto.id_producto);
    recomendaciones.push({
      producto,
      cantidad: Math.ceil((recomendacion.porCuatro * integrantes) / 4),
      grupo: recomendacion.nombre,
    });
  }

  return recomendaciones;
}
