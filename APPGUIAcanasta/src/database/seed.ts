import { getDatabase } from './database';

export async function seedDatabase() {
  const db = await getDatabase();

  // Comercios de demo iniciales si no existen
  const comerciosDemo = [
    ['Supermercado Éxito', 'Calle 50 # 10-20', '3001002000', 'Supermercado'],
    ['Olímpica', 'Cra 43 # 70-15', '3002003000', 'Supermercado'],
    ['Tienda Don Pedro', 'Calle 15 # 8-30', '3003004000', 'Tienda de Barrio'],
  ];

  for (const [nombre, direccion, telefono, tipo] of comerciosDemo) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO comercios
      (nombre, direccion, telefono, tipo_comercio)
      VALUES (?, ?, ?, ?)
      `,
      [nombre, direccion, telefono, tipo]
    );
  }

  // Usuarios de demo (INSERT OR IGNORE para no duplicar)
  const usuariosDemo: [string, string, string, string, string, 'admin' | 'comercio' | 'usuario', number | null][] = [
    ['Admin', 'Canasta', 'admin@canasta.com', 'admin123', '3000000000', 'admin', null],
    ['Don', 'Pedro', 'donpedro@canasta.com', 'comercio123', '3003004000', 'comercio', 3],
    ['Gerente', 'Éxito', 'exito@canasta.com', 'comercio123', '3001002000', 'comercio', 1],
    ['Randy', 'Galarza', 'randy@canasta.com', 'demo123', '3001111111', 'usuario', null],
    ['Loreley', 'Gonzales', 'loreley@canasta.com', 'demo123', '3002222222', 'usuario', null],
    ['Pedro', 'Brugues', 'pedro@canasta.com', 'demo123', '3004222222', 'usuario', null],
  ];

  for (const [nombre, apellido, correo, contrasena, telefono, rol, id_comercio] of usuariosDemo) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO usuarios
      (nombre, apellido, correo, contrasena, telefono, rol, id_comercio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [nombre, apellido, correo, contrasena, telefono, rol, id_comercio]
    );
  }
}