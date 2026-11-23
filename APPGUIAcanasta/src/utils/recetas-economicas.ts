import type { ProductoParaRecomendacion } from '../repositories/productoRepository';

type RecipeDefinition = {
  id: string;
  nombre: string;
  origen: string;
  porciones: number;
  ingredientes: { buscar: string; cantidad: string }[];
  preparacion: string[];
  orientacionNutricional: string;
};

export type RecetaEconomica = Omit<RecipeDefinition, 'presupuestoPorPorcion' | 'ingredientes'> & {
  ingredientes: {
    producto: ProductoParaRecomendacion;
    cantidad: string;
    costoEstimado: number;
    disponibleEnCasa: boolean;
  }[];
  costoEstimado: number;
};

const RECETAS: RecipeDefinition[] = [
  {
    id: 'lentejas-arroz',
    nombre: 'Lentejas guajiras con arroz',
    origen: 'Inspirada en la cocina cotidiana de La Guajira',
    porciones: 4,
    ingredientes: [
      { buscar: 'lentejas limpias', cantidad: '½ paquete' },
      { buscar: 'arroz blanco tradicional', cantidad: '½ paquete' },
      { buscar: 'tomate chonto maduro', cantidad: '¼ libra' },
      { buscar: 'cebolla roja ocañera', cantidad: '¼ libra' },
      { buscar: 'ajo criollo', cantidad: '½ unidad' },
    ],
    preparacion: [
      'Enjuaga las lentejas y cocínalas en agua hasta que estén blandas.',
      'Sofríe tomate, cebolla y ajo con poca grasa; agrégalos a las lentejas y cocina unos minutos.',
      'Prepara el arroz aparte y sirve junto con las lentejas.',
    ],
    orientacionNutricional: 'Las lentejas aportan proteína vegetal y fibra. Acompaña con una verdura y modera la sal añadida.',
  },
  {
    id: 'arroz-lisa',
    nombre: 'Arroz con lisa y verduras',
    origen: 'Inspirada en los sabores del litoral guajiro',
    porciones: 4,
    ingredientes: [
      { buscar: 'pescado lisa salpresa', cantidad: '½ libra' },
      { buscar: 'arroz blanco tradicional', cantidad: '½ paquete' },
      { buscar: 'tomate chonto maduro', cantidad: '¼ libra' },
      { buscar: 'cebolla roja ocañera', cantidad: '¼ libra' },
      { buscar: 'ají dulce', cantidad: '½ paquete' },
    ],
    preparacion: [
      'Si la lisa es salpresada, enjuágala y prueba un trozo para ajustar la sal.',
      'Cocina el pescado con tomate, cebolla y ají dulce hasta que esté bien hecho.',
      'Agrega el arroz y el agua necesaria; cocina tapado hasta que el arroz esté tierno.',
    ],
    orientacionNutricional: 'El pescado aporta proteína. Incluye las verduras disponibles y evita añadir sal antes de probar el pescado.',
  },
  {
    id: 'arepa-huevo',
    nombre: 'Arepas de huevo al sartén',
    origen: 'Versión casera de un clásico costeño',
    porciones: 4,
    ingredientes: [
      { buscar: 'harina de maíz blanco precocida', cantidad: '½ paquete' },
      { buscar: 'huevos frescos extra', cantidad: '4 huevos' },
      { buscar: 'aceite vegetal d1', cantidad: 'poco aceite' },
    ],
    preparacion: [
      'Mezcla la harina con agua hasta formar una masa suave y arma arepas delgadas.',
      'Cocínalas en sartén con poco aceite hasta que estén firmes por ambos lados.',
      'Abre con cuidado, agrega huevo batido y termina la cocción a fuego bajo.',
    ],
    orientacionNutricional: 'El huevo aporta proteína. Usa poco aceite y acompaña con fruta o verduras cuando estén disponibles.',
  },
  {
    id: 'zaragoza-platano',
    nombre: 'Fríjol zaragoza con plátano verde',
    origen: 'Inspirada en los guisos del Caribe',
    porciones: 4,
    ingredientes: [
      { buscar: 'frijol zaragoza tradicional guajiro', cantidad: '½ libra' },
      { buscar: 'plátano verde hartón', cantidad: '2 unidades' },
      { buscar: 'tomate chonto maduro', cantidad: '¼ libra' },
      { buscar: 'cebolla roja ocañera', cantidad: '¼ libra' },
      { buscar: 'ají dulce', cantidad: '½ paquete' },
    ],
    preparacion: [
      'Remoja el fríjol con anticipación y cocínalo hasta que esté blando.',
      'Agrega tomate, cebolla y ají dulce picados; cocina a fuego bajo.',
      'Cocina el plátano aparte y sirve con el guiso.',
    ],
    orientacionNutricional: 'El fríjol aporta proteína vegetal y fibra. Combínalo con verduras y ajusta la sal al final.',
  },
];

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export function recomendarRecetasEconomicas(
  catalog: ProductoParaRecomendacion[],
  presupuesto: number,
  inventario: string[] = []
): RecetaEconomica[] {
  if (!Number.isSafeInteger(presupuesto) || presupuesto <= 0) return [];

  const inventarioNormalizado = inventario.map(normalize).filter(Boolean);
  const normalizedCatalog = catalog.map((product) => ({
    product,
    name: normalize(`${product.nombre} ${product.marca ?? ''}`),
  }));

  return RECETAS.flatMap((recipe) => {
    const ingredients = recipe.ingredientes.map((ingredient) => {
      const searchTerm = normalize(ingredient.buscar);
      const product = normalizedCatalog.find((item) => item.name.includes(searchTerm))?.product;
      if (!product || !Number.isFinite(product.precio) || product.precio <= 0) return null;
      const productName = normalize(product.nombre);
      const disponibleEnCasa = inventarioNormalizado.some((name) =>
        name === productName || (name.length >= 5 && productName.startsWith(name))
      );
      return {
        producto: product,
        cantidad: ingredient.cantidad,
        costoEstimado: disponibleEnCasa ? 0 : Math.round(product.precio),
        disponibleEnCasa,
      };
    });

    if (ingredients.some((ingredient) => ingredient === null)) return [];
    const costoEstimado = ingredients.reduce((sum, ingredient) => sum + (ingredient?.costoEstimado ?? 0), 0);
    if (costoEstimado > presupuesto) return [];

    return [{
      ...recipe,
      ingredientes: ingredients.filter(
        (ingredient): ingredient is NonNullable<typeof ingredient> => ingredient !== null
      ),
      costoEstimado,
    }];
  });
}
