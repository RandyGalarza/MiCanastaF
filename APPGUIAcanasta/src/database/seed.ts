import { getDatabase } from './database';

export async function seedDatabase() {
  const db = await getDatabase();

  // Usuarios de demo (INSERT OR IGNORE para no duplicar)
  const usuariosDemo = [
    ['Randy', 'Galarza', 'randy@canasta.com', 'demo123', '3001111111'],
    ['Loreley', 'Gonzales', 'loreley@canasta.com', 'demo123', '3002222222'],
    ['Pedro', 'Brugues', 'pedro@canasta.com', 'demo123', '3004222222'],
  ];

  for (const [nombre, apellido, correo, contrasena, telefono] of usuariosDemo) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO usuarios
      (nombre, apellido, correo, contrasena, telefono)
      VALUES (?, ?, ?, ?, ?)
      `,
      [nombre, apellido, correo, contrasena, telefono]
    );
  }
}