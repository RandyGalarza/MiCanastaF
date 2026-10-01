import { getDatabase } from './database';

export async function seedDatabase() {
  const db = await getDatabase();

  const categorias = [
    ['Granos', 'Arroz, frijoles y otros granos'],
    ['Carnes', 'Carnes y productos cárnicos'],
    ['Lácteos', 'Leche, queso y derivados'],
    ['Frutas', 'Frutas de consumo familiar'],
    ['Verduras', 'Verduras y hortalizas'],
    ['Bebidas', 'Bebidas de consumo familiar'],
    ['Aseo', 'Productos de limpieza del hogar'],
  ];

  for (const [nombre, descripcion] of categorias) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO categorias
      (nombre, descripcion)
      VALUES (?, ?)
      `,
      [nombre, descripcion]
    );
  }
}