import { getDatabase } from './database';
import {
  COMMERCIAL_REFERENCE_DIVISIONS,
  COMMERCIAL_REFERENCE_PRODUCTS,
} from './commercial-reference-products';

const LEGACY_DANE_DESCRIPTION_PREFIX = 'Artículo de seguimiento del IPC DANE 2018; código COICOP: ';
const COMMERCIAL_REFERENCE_DESCRIPTION_PREFIX = 'Producto de referencia comercial orientativo; código COICOP IPC 2018: ';

export async function seedDatabase() {
  const db = await getDatabase();

  // 1. Categorías básicas de la canasta familiar
  const categoriasDemo = [
    'Granos, Cereales y Legumbres',
    'Lácteos y Derivados',
    'Carnes, Aves y Pescados',
    'Frutas y Verduras',
    'Víveres, Despensa y Abarrotes',
    'Panadería y Desayuno',
    'Bebidas y Cafés',
    'Aseo Personal y del Hogar',
    'Congelados y Refrigerados',
    'Cuidado del Bebé',
    'Mascotas',
    'Snacks y Confitería',
    'Condimentos y Especias',
    'Conservas y Enlatados',
    ...COMMERCIAL_REFERENCE_DIVISIONS.map(({ code, name }) => `Catálogo orientativo ${code} - ${name}`),
  ];

  for (const cat of categoriasDemo) {
    const existing = await db.getFirstAsync<any>(
      'SELECT id_categoria FROM categorias WHERE descripcion = ?',
      [cat]
    );
    if (!existing) {
      await db.runAsync('INSERT INTO categorias (descripcion) VALUES (?)', [cat]);
    }
  }

  // 2. Supermercados y grandes cadenas en Riohacha, La Guajira
  const comerciosDemo: [string, string, string | null, string][] = [
    ['Éxito Riohacha (Av. Los Estudiantes)', 'Calle 15 # 18-50, Av. Los Estudiantes', '3009123001', 'Cadena de Hipermercados'],
    ['Supertiendas Olímpica Calle 15 (Centro)', 'Calle 15 con Carrera 11 Esquina', '3009123002', 'Supermercado'],
    ['Supertiendas Olímpica Guajira Plaza', 'Cra 7 # 33-80, Centro Comercial Guajira Plaza', '3009123003', 'Supermercado'],
    ['Jumbo Riohacha (Ex-Carrefour Viva Wajiira)', 'Calle 15 # 28-255, Centro Comercial Viva Wajiira', '3009123010', 'Hipermercado'],
    ['Metro Cencosud Riohacha', 'Carrera 7 # 34-12, Sector Salida a Maicao', '3009123011', 'Supermercado'],
    ['Tiendas D1 Riohacha Calle 13', 'Calle 13 # 8-45, Centro', '3009123004', 'Tienda de Descuento'],
    ['Tiendas D1 Riohacha Av. Circunvalar', 'Calle 1ra con Carrera 12, Costanera', '3009123012', 'Tienda de Descuento'],
    ['Tiendas Ara Riohacha Mercado Nuevo', 'Calle 12 # 7-20, Frente a Mercado Nuevo', '3009123005', 'Tienda de Descuento'],
    ['Tiendas Ara Riohacha Cooperativo', 'Calle 27A # 12-40, Barrio Cooperativo', '3009123013', 'Tienda de Descuento'],
    ['Granero y Abarrotes El Guajiro (Mayorista)', 'Mercado Nuevo, Pabellón de Granos Local 14', '3015557788', 'Mayorista / Granero'],
    ['Tienda y Autoservicio La Bendición', 'Calle 14B # 20-35, Riohacha', '3128901234', 'Tienda de Barrio'],
    ['Supermercado Demo - La Guajira', 'Riohacha, La Guajira', null, 'Supermercado (demo)'],
    ['Minimercado Demo - Centro', 'Riohacha, La Guajira', null, 'Minimercado (demo)'],
    ['Minimercado Demo - Cooperativo', 'Riohacha, La Guajira', null, 'Minimercado (demo)'],
    ['Tienda de barrio Demo - Arriba', 'Riohacha, La Guajira', null, 'Tienda de Barrio (demo)'],
    ['Tienda de barrio Demo - 15 de Mayo', 'Riohacha, La Guajira', null, 'Tienda de Barrio (demo)'],
    ['Tienda de barrio Demo - San Martín', 'Riohacha, La Guajira', null, 'Tienda de Barrio (demo)'],
    ['Autoservicio Demo - La Esperanza', 'Riohacha, La Guajira', null, 'Autoservicio (demo)'],
    ['Granero Demo - Mercado Nuevo', 'Riohacha, La Guajira', null, 'Granero (demo)'],
    ['Frutas y Verduras Demo - La Huerta', 'Riohacha, La Guajira', null, 'Frutería y Verdulería (demo)'],
    ['Carnicería Demo - El Buen Corte', 'Riohacha, La Guajira', null, 'Carnicería (demo)'],
    ['Pescadería Demo - Costa Guajira', 'Riohacha, La Guajira', null, 'Pescadería (demo)'],
    ['Panadería Demo - El Trigal', 'Riohacha, La Guajira', null, 'Panadería (demo)'],
    ['Tienda de descuento Demo - Ahorra Más', 'Riohacha, La Guajira', null, 'Tienda de Descuento (demo)'],
    ['Supermercado Demo - Buen Precio', 'Riohacha, La Guajira', null, 'Supermercado (demo)'],
    ['Droguería Demo - Salud y Hogar', 'Riohacha, La Guajira', null, 'Droguería (demo)'],
    ['Tienda de mascotas Demo - Patitas', 'Riohacha, La Guajira', null, 'Tienda de Mascotas (demo)'],
    ['Lácteos Demo - Frescos del Campo', 'Riohacha, La Guajira', null, 'Lácteos (demo)'],
    ['Distribuidora Demo - La Canasta', 'Riohacha, La Guajira', null, 'Distribuidora (demo)'],
    ['Tienda de conveniencia Demo - 24 Horas', 'Riohacha, La Guajira', null, 'Tienda de Conveniencia (demo)'],
  ];

  for (const [nombre, direccion, telefono, tipo] of comerciosDemo) {
    const existing = await db.getFirstAsync<any>(
      'SELECT id_comercio FROM comercios WHERE nombre = ?',
      [nombre]
    );
    if (!existing) {
      await db.runAsync(
        'INSERT INTO comercios (nombre, direccion, telefono, tipo_comercio) VALUES (?, ?, ?, ?)',
        [nombre, direccion, telefono, tipo]
      );
    }
  }

  const categoriasGuardadas = await db.getAllAsync<{ id_categoria: number; descripcion: string }>(
    'SELECT id_categoria, descripcion FROM categorias'
  );
  const categoriaIdPorNombre = new Map(
    categoriasGuardadas.map((categoria) => [categoria.descripcion, categoria.id_categoria])
  );
  const comerciosGuardados = await db.getAllAsync<{ id_comercio: number; nombre: string }>(
    'SELECT id_comercio, nombre FROM comercios'
  );
  const comercioIdPorNombre = new Map(
    comerciosGuardados.map((comercio) => [comercio.nombre, comercio.id_comercio])
  );

  // 3. Usuarios de prueba
  const usuariosDemo: [string, string, string, string, string, 'admin' | 'comercio' | 'usuario', number | null][] = [
    ['Admin', 'Canasta', 'admin@canasta.com', 'admin123', '3000000000', 'admin', null],
    ['Don', 'Pedro', 'donpedro@canasta.com', 'comercio123', '3015557788', 'comercio', 10],
    ['Gerente', 'Éxito', 'exito@canasta.com', 'comercio123', '3009123001', 'comercio', 1],
    ['Administrador', 'Olímpica', 'olimpica@canasta.com', 'comercio123', '3009123002', 'comercio', 2],
    ['Gerente', 'Jumbo', 'jumbo@canasta.com', 'comercio123', '3009123010', 'comercio', 4],
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

  // 4. Catálogo amplio de productos de la Canasta Familiar en Riohacha
  // [categoria_id, comercio_id, nombre, unidad_medida, marca, descripcion, precio_referencia]
  const productosRiohacha: [number, number, string, string, string, string, number][] = [
    // --- GRANOS, CEREALES Y LEGUMBRES (Cat 1) ---
    [1, 1, 'Arroz Blanco Tradicional 1000g', 'Kilogramo (kg)', 'Diana', 'Arroz blanco seleccionado grano largo', 4600],
    [1, 2, 'Arroz Fortificado con Vitaminas 1000g', 'Kilogramo (kg)', 'Roa', 'Arroz blanco con micronutrientes', 4800],
    [1, 4, 'Arroz Especial Cuisine & Co 1kg', 'Kilogramo (kg)', 'Jumbo / Cuisine & Co', 'Arroz de alta pureza y grano entero', 4500],
    [1, 6, 'Arroz Blanco D1 1kg', 'Kilogramo (kg)', 'Campo Real / D1', 'Arroz de consumo diario económico', 3900],
    [1, 10, 'Frijol Zaragoza Tradicional Guajiro', 'Libra (lb)', 'El Guajiro', 'Frijol zaragoza auténtico para almuerzos costeños', 4500],
    [1, 1, 'Frijol Rojo Calima 500g', 'Libra (lb)', 'Diana', 'Frijol rojo suave y rendidor', 4900],
    [1, 6, 'Lentejas Limpias Seleccionadas 500g', 'Libra (lb)', 'D1 / Campo Real', 'Lentejas ricas en hierro', 2800],
    [1, 8, 'Arveja Verde Seca 500g', 'Libra (lb)', 'Ara', 'Arveja para sopas y guisados', 2600],
    [1, 4, 'Garbanzos Extra 500g', 'Libra (lb)', 'Cuisine & Co', 'Garbanzos importados de grano tierno', 5100],
    [1, 2, 'Harina de Maíz Blanco Precocida 1kg', 'Kilogramo (kg)', 'Harina PAN', 'La tradicional para arepas costeñas', 4500],
    [1, 10, 'Harina de Maíz Promasa 1kg', 'Kilogramo (kg)', 'Promasa', 'Harina precocida para arepas y bollos de maíz', 3900],
    [1, 6, 'Avena en Hojuelas 400g', 'Bolsa', 'Quaker', 'Avena 100% integral para coladas y jugos', 3400],
    [1, 2, 'Espagueti Tradicional 500g', 'Paquete', 'Doria', 'Pasta de sémola de trigo para almuerzos', 3800],
    [1, 8, 'Pasta Fideos Cabello de Ángel 250g', 'Paquete', 'La Muñeca', 'Fideos delgados ideales para sopa de verduras', 2100],

    // --- LÁCTEOS Y DERIVADOS (Cat 2) ---
    [2, 10, 'Queso Costeño Criollo Fresco', 'Libra (lb)', 'Fresco San Juan', 'Queso costeño duro semi-salado ideal para rayar', 12500],
    [2, 2, 'Queso Costeño Pasteurizado 500g', 'Bolsa', 'Colanta', 'Queso costeño higienizado para arepas y cayeye', 14200],
    [2, 4, 'Queso Doble Crema Tajado 400g', 'Paquete', 'Jumbo / Alpina', 'Queso semi-blando para derretir y sándwiches', 11900],
    [2, 1, 'Leche Entera Larga Vida 900ml', 'Litro (L)', 'Alquería', 'Leche entera ultrapasteurizada', 4800],
    [2, 2, 'Leche Entera UHT 1000ml', 'Litro (L)', 'Colanta', 'Leche entera fresca con taparrosca', 4500],
    [2, 6, 'Leche en Polvo Entera 380g', 'Bolsa', 'Klim', 'Rinde varios litros de leche cremosa', 16500],
    [2, 10, 'Suero Costeño Atollabuey 400g', 'Bolsa', 'La Fortuna', 'Suero agrio tradicional cremoso para yuca cocida', 4800],
    [2, 1, 'Margarina para Cocinar y Untar 250g', 'Barra', 'Rama', 'Margarina suave con sal', 4900],
    [2, 2, 'Huevos Rojos Tipo AA x 30 unidades', 'Panal', 'Santa Anita', 'Panal familiar de 30 huevos frescos', 17500],
    [2, 6, 'Huevos Frescos Extra x 12 unidades', 'Caja', 'D1', 'Docena de huevos económicos seleccionados', 7800],

    // --- CARNES, AVES Y PESCADOS (Cat 3) ---
    [3, 1, 'Pechuga de Pollo Fresca', 'Kilogramo (kg)', 'Bucanero', 'Pechuga entera sin piel para filetear', 14800],
    [3, 2, 'Muslos y Contramuslos de Pollo', 'Kilogramo (kg)', 'Pollos Bucanero', 'Presas de pollo listas para guisar o freír', 10500],
    [3, 10, 'Carne de Res de Primera (Cadera)', 'Libra (lb)', 'Carnicería Mercado Nuevo', 'Corte de res tierno y magro para asar o bistec', 16000],
    [3, 10, 'Carne Molida de Res Fresca', 'Libra (lb)', 'Carnicería Mercado Nuevo', 'Carne de res molida pura del día', 13500],
    [3, 11, 'Pescado Sierra Fresco en Postas', 'Libra (lb)', 'Mar de Riohacha', 'Postas de sierra fresca pescada en el litoral guajiro', 14000],
    [3, 11, 'Pescado Lisa Salpresa / Fresca', 'Libra (lb)', 'Mercado de Riohacha', 'Pescado emblemático de La Guajira para arroz con lisa', 9500],
    [3, 4, 'Camarón Tití Limpio y Pelado 400g', 'Bolsa', 'Cuisine & Co', 'Camarones listos para cóctel o arroz con camarón', 21900],
    [3, 1, 'Atún en Aceite de Girasol 170g', 'Lata', 'Van Camp’s', 'Lomitos de atún claros y compactos', 7200],
    [3, 6, 'Atún Lomitos en Agua 170g', 'Lata', 'D1 / Océano', 'Atún saludable bajo en calorías', 4900],
    [3, 2, 'Salchichas Tradicionales x 12', 'Paquete', 'Zenú', 'Salchichas de cerdo y res para el desayuno', 7800],

    // --- FRUTAS Y VERDURAS (Cat 4) ---
    [4, 10, 'Plátano Verde Hartón', 'Unidad', 'La Huerta Guajira', 'Plátano verde grande para patacones y sancochos', 1400],
    [4, 10, 'Plátano Maduro', 'Unidad', 'La Huerta Guajira', 'Plátano maduro dulce para tajadas doradas', 1300],
    [4, 10, 'Guineo Verde (Criollo Costeño)', 'Mano (racimo)', 'Mercado Nuevo', 'Para el típico cayeye costeño con queso', 2500],
    [4, 10, 'Yuca Dulce Costeña', 'Libra (lb)', 'Campesina del Cesar', 'Yuca blanca suave y harinosa', 2000],
    [4, 1, 'Papa Pastusa Seleccionada', 'Kilogramo (kg)', 'Frescampo', 'Papa para cocer, puré o caldos', 3500],
    [4, 10, 'Cebolla Roja Ocañera', 'Libra (lb)', 'El Huerto', 'Cebolla morada para ensaladas y sofritos', 2400],
    [4, 10, 'Tomate Chonto Maduro', 'Libra (lb)', 'El Huerto', 'Tomate fresco jugoso para guisos', 2200],
    [4, 10, 'Ají Dulce / Topito Guajiro', 'Bolsa', 'Mercado Nuevo', 'El aroma imprescindible de la comida costeña y guajira', 1500],
    [4, 10, 'Ajo Criollo en Cabeza', 'Unidad', 'El Huerto', 'Cabezas de ajo con intenso aroma', 1000],
    [4, 10, 'Limón Mandarino Criollo', 'Docena', 'Frutera Riohacha', 'Limón para limonada y adobos de pescado', 4000],
    [4, 4, 'Aguacate Hass Maduro', 'Unidad', 'Jumbo', 'Aguacate cremoso listo para consumir', 3800],

    // --- VÍVERES, DESPENSA Y ABARROTES (Cat 5) ---
    [5, 1, 'Aceite Vegetal para Cocina 900ml', 'Botella', 'Premier', 'Aceite refinado libre de colesterol', 8900],
    [5, 2, 'Aceite de Girasol Puro 1000ml', 'Botella', 'Diana / Gourmet', 'Aceite puro para ensaladas y frituras suaves', 12500],
    [5, 6, 'Aceite Vegetal D1 900ml', 'Botella', 'D1', 'Aceite de cocina económico', 6700],
    [5, 1, 'Azúcar Blanca Refinada 1000g', 'Kilogramo (kg)', 'Incauca / Manuelita', 'Azúcar refinada para repostería y jugos', 4600],
    [5, 10, 'Panela Cuadrada Criolla 500g', 'Unidad', 'Doña Panela', 'Panela pura para aguapanela fría con hielo y limón', 2500],
    [5, 10, 'Sal Marina Refinada de Manaure 1000g', 'Kilogramo (kg)', 'Sal de Manaure (La Guajira)', 'Producida directamente en las salinas marinas de Manaure', 1800],
    [5, 1, 'Salsa de Tomate Tradicional 400g', 'Doypack', 'Fruco', 'Salsa de tomate clásica colombiana', 5200],
    [5, 2, 'Mayonesa Clásica con Limón 380g', 'Doypack', 'Fruco', 'Mayonesa para hamburguesas y ensaladas de papa', 6300],

    // --- PANADERÍA Y DESAYUNO (Cat 6) ---
    [6, 11, 'Pan Blandito Costeño x 6 unidades', 'Bolsa', 'Panadería Central', 'Pan suave y esponjoso tradicional de barrio', 3500],
    [6, 2, 'Pan Tajado Blanco Familiar', 'Bolsa', 'Bimbo', 'Pan de molde para sándwiches', 6800],
    [6, 1, 'Galletas Saltín Tradicional x 3 tacos', 'Paquete', 'Noel', 'Galletas de soda saladas crocantes', 5600],
    [6, 2, 'Galletas Ducales Doradas x 3 tacos', 'Paquete', 'Noel', 'El toque dulce y salado clásico de Noel', 6400],
    [6, 1, 'Chocolate de Mesa en Pastillas 500g', 'Paquete', 'Corona', 'Chocolate caliente para batir en olleta', 7200],
    [6, 6, 'Chocolate con Clavos y Canela 250g', 'Paquete', 'Cruz', 'Pastillas aromáticas de chocolate', 3900],

    // --- BEBIDAS Y CAFÉS (Cat 7) ---
    [7, 1, 'Café Tostado y Molido Tradicional 500g', 'Bolsa', 'Sello Rojo', 'El café tradicional de las mañanas colombianas', 14500],
    [7, 2, 'Café Molido Suave Colombiano 454g', 'Bolsa', 'Águila Roja', 'Aroma y sabor suave de la montaña', 14200],
    [7, 6, 'Café Instantáneo Liofilizado 85g', 'Frasco', 'Colcafé / D1', 'Café soluble rápido', 8200],
    [7, 11, 'Bebida Gaseosa Postobón Manzana 1.5L', 'Botella', 'Postobón', 'La gaseosa favorita de Colombia', 4500],
    [7, 10, 'Agua Pura Manantial de la Sierra 5 Litros', 'Garrafa', 'Cristal', 'Agua pura embotellada para el calor de Riohacha', 6500],

    // --- ASEO PERSONAL Y DEL HOGAR (Cat 8) ---
    [8, 1, 'Detergente en Polvo Multiusos 1000g', 'Kilogramo (kg)', 'Ariel', 'Limpieza profunda para ropa blanca y color', 11500],
    [8, 10, 'Jabón Azul en Barra Tradicional 300g', 'Unidad', 'Rey', 'El legendario jabón multiusos para lavar y desmanchar', 2200],
    [8, 2, 'Jabón de Baño en Barra x 3 unidades', 'Paquete', 'Protex', 'Jabón antibacterial con avena', 8900],
    [8, 1, 'Crema Dental Triple Acción 150ml', 'Tubo', 'Colgate', 'Cuidado y blancura dental', 6200],
    [8, 6, 'Papel Higiénico Doble Hoja x 4 rollos', 'Paquete', 'Familia', 'Textura suave y resistente', 6800],
    [8, 1, 'Lavaclay Límpido Cloro 1000ml', 'Botella', 'Blancox / Clorox', 'Desinfectante blanqueador multiusos para el hogar', 3200],

    // --- PRODUCTOS ADICIONALES DE LA CANASTA FAMILIAR ---
    [1, 12, 'Arroz integral 500g', 'Bolsa', 'Demo', 'Arroz integral para comidas y ensaladas', 3900],
    [1, 14, 'Fríjol cabecita negra 500g', 'Bolsa', 'Demo', 'Legumbre tradicional de la región Caribe', 4200],
    [1, 18, 'Fríjol cargamanto 500g', 'Bolsa', 'Demo', 'Fríjol seleccionado para sopas y guisos', 5900],
    [1, 20, 'Lenteja roja 500g', 'Bolsa', 'Demo', 'Lentejas secas seleccionadas', 3600],
    [1, 21, 'Arveja amarilla partida 500g', 'Bolsa', 'Demo', 'Arveja seca para sopas caseras', 3200],
    [1, 22, 'Maíz para arepas 1kg', 'Bolsa', 'Demo', 'Harina de maíz precocida', 4300],
    [1, 23, 'Harina de trigo 1kg', 'Bolsa', 'Demo', 'Harina de trigo para recetas y repostería', 4800],
    [1, 24, 'Pasta corta tornillo 500g', 'Paquete', 'Demo', 'Pasta de trigo tipo tornillo', 3400],
    [1, 25, 'Pasta lasaña 250g', 'Paquete', 'Demo', 'Láminas de pasta para lasaña', 6200],
    [1, 26, 'Cuscús 250g', 'Paquete', 'Demo', 'Sémola de trigo para acompañamientos', 5900],
    [1, 27, 'Avena instantánea 300g', 'Bolsa', 'Demo', 'Avena para bebidas y desayunos', 3900],

    [2, 12, 'Leche deslactosada 1L', 'Litro (L)', 'Demo', 'Leche UHT deslactosada', 5200],
    [2, 13, 'Leche semidescremada 1L', 'Litro (L)', 'Demo', 'Leche UHT semidescremada', 5000],
    [2, 14, 'Yogur natural 1L', 'Botella', 'Demo', 'Yogur natural para desayunos y meriendas', 8900],
    [2, 15, 'Yogur de fresa 1L', 'Botella', 'Demo', 'Yogur sabor a fresa', 8500],
    [2, 16, 'Queso campesino 500g', 'Paquete', 'Demo', 'Queso fresco para desayunos', 12800],
    [2, 17, 'Queso mozzarella 250g', 'Paquete', 'Demo', 'Queso mozzarella rallado', 9900],
    [2, 18, 'Mantequilla con sal 250g', 'Barra', 'Demo', 'Mantequilla para cocinar y untar', 8700],
    [2, 19, 'Crema de leche 200ml', 'Caja', 'Demo', 'Crema de leche para recetas', 4600],
    [2, 20, 'Kumis natural 1L', 'Botella', 'Demo', 'Kumis tradicional', 7800],
    [2, 21, 'Bebida láctea 200ml', 'Unidad', 'Demo', 'Bebida láctea individual', 1800],
    [2, 22, 'Huevos campesinos x 15', 'Cubeta', 'Demo', 'Quince huevos frescos', 11200],

    [3, 10, 'Carne para sudado', 'Libra (lb)', 'Demo', 'Corte de res para guisos', 14500],
    [3, 14, 'Bistec de res', 'Libra (lb)', 'Demo', 'Corte de res tajado para plancha', 16500],
    [3, 18, 'Costilla de res', 'Libra (lb)', 'Demo', 'Costilla para sopas y sancochos', 12000],
    [3, 19, 'Lomo de cerdo', 'Libra (lb)', 'Demo', 'Corte de cerdo para asar o guisar', 13900],
    [3, 20, 'Chuleta de cerdo', 'Libra (lb)', 'Demo', 'Chuleta fresca de cerdo', 12800],
    [3, 21, 'Carne para hamburguesa x 4', 'Paquete', 'Demo', 'Hamburguesas de res congeladas', 12500],
    [3, 22, 'Alas de pollo', 'Kilogramo (kg)', 'Demo', 'Alas de pollo frescas', 9900],
    [3, 23, 'Pollo entero', 'Kilogramo (kg)', 'Demo', 'Pollo entero fresco', 9900],
    [3, 24, 'Filete de tilapia', 'Libra (lb)', 'Demo', 'Filete de pescado para asar o freír', 11800],
    [3, 25, 'Mojarra roja', 'Libra (lb)', 'Demo', 'Pescado entero fresco', 10500],
    [3, 26, 'Sardinas en salsa de tomate  en lata', 'Lata', 'Demo', 'Sardinas en salsa de tomate', 4300],
    [3, 27, 'Chorizo parrillero x 5', 'Paquete', 'Demo', 'Chorizos para asar', 8900],

    [4, 9, 'Zanahoria', 'Libra (lb)', 'Demo', 'Zanahoria fresca para sopas y ensaladas', 2200],
    [4, 10, 'Pepino cohombro', 'Unidad', 'Demo', 'Pepino fresco para ensaladas', 1800],
    [4, 14, 'Repollo blanco', 'Unidad', 'Demo', 'Repollo fresco para ensaladas y guisos', 3500],
    [4, 18, 'Lechuga crespa', 'Unidad', 'Demo', 'Lechuga fresca para ensaladas', 2800],
    [4, 19, 'Cilantro fresco', 'Manojo', 'Demo', 'Hierba fresca para sazonar', 1200],
    [4, 20, 'Cebolla larga', 'Manojo', 'Demo', 'Cebolla larga para guisos', 1800],
    [4, 21, 'Pimentón rojo', 'Unidad', 'Demo', 'Pimentón fresco para recetas', 2200],
    [4, 22, 'Mazorca tierna', 'Unidad', 'Demo', 'Mazorca fresca para sopas', 1800],
    [4, 23, 'Batata', 'Libra (lb)', 'Demo', 'Tubérculo fresco para cocinar', 2300],
    [4, 24, 'Ñame espino', 'Libra (lb)', 'Demo', 'Tubérculo tradicional para sancochos', 2800],
    [4, 25, 'Papaya', 'Kilogramo (kg)', 'Demo', 'Papaya fresca madura', 3200],
    [4, 26, 'Mango de temporada', 'Kilogramo (kg)', 'Demo', 'Mango fresco de temporada', 3500],
    [4, 27, 'Piña', 'Unidad', 'Demo', 'Piña fresca entera', 5200],
    [4, 28, 'Naranja para jugo', 'Docena', 'Demo', 'Naranjas frescas para jugo', 6500],
    [4, 29, 'Sandía', 'Kilogramo (kg)', 'Demo', 'Sandía fresca de temporada', 2800],

    [5, 12, 'Aceite de oliva 250ml', 'Botella', 'Demo', 'Aceite de oliva para ensaladas y cocina', 15900],
    [5, 13, 'Vinagre blanco 500ml', 'Botella', 'Demo', 'Vinagre blanco para cocina', 3200],
    [5, 14, 'Avena en polvo 500g', 'Bolsa', 'Demo', 'Avena molida para bebidas', 4300],
    [5, 15, 'Cereal de maíz 300g', 'Caja', 'Demo', 'Cereal de maíz para el desayuno', 8900],
    [5, 16, 'Gelatina sin sabor x 4', 'Caja', 'Demo', 'Gelatina sin sabor para postres', 4100],
    [5, 17, 'Leche condensada 395g', 'Lata', 'Demo', 'Leche condensada para postres', 6200],
    [5, 18, 'Miel de abejas 250g', 'Frasco', 'Demo', 'Miel para bebidas y desayunos', 12900],
    [5, 19, 'Mermelada de mora 250g', 'Frasco', 'Demo', 'Mermelada de fruta para untar', 5900],
    [5, 20, 'Salsa BBQ 200g', 'Botella', 'Demo', 'Salsa BBQ para acompañamientos', 5200],
    [5, 21, 'Salsa de soya 150ml', 'Botella', 'Demo', 'Salsa de soya para cocinar', 4900],
    [5, 22, 'Caldo de gallina x 12 cubos', 'Caja', 'Demo', 'Cubos de caldo para sazonar', 3900],
    [5, 23, 'Coco rallado 100g', 'Bolsa', 'Demo', 'Coco rallado para repostería', 3500],

    [6, 11, 'Arepas de maíz blanco x 5', 'Paquete', 'Demo', 'Arepas listas para asar', 4500],
    [6, 12, 'Arepas de maíz amarillo x 5', 'Paquete', 'Demo', 'Arepas amarillas listas para asar', 4600],
    [6, 13, 'Pan integral tajado', 'Bolsa', 'Demo', 'Pan integral para sándwiches', 7900],
    [6, 14, 'Pan para hamburguesa x 4', 'Paquete', 'Demo', 'Pan suave para hamburguesas', 5200],
    [6, 15, 'Tostadas integrales 200g', 'Paquete', 'Demo', 'Tostadas horneadas', 5800],
    [6, 16, 'Galletas de chocolate 12 unidades', 'Paquete', 'Demo', 'Galletas dulces con chocolate', 4900],
    [6, 17, 'Pan de bono x 6', 'Paquete', 'Demo', 'Pan de bono listo para calentar', 7800],
    [6, 18, 'Mezcla para pancakes 500g', 'Caja', 'Demo', 'Mezcla lista para preparar pancakes', 7200],

    [7, 12, 'Café instantáneo 170g', 'Frasco', 'Demo', 'Café soluble para preparar en casa', 13900],
    [7, 13, 'Chocolate instantáneo 200g', 'Bolsa', 'Demo', 'Mezcla de chocolate para bebidas', 5900],
    [7, 14, 'Té de manzanilla x 20 sobres', 'Caja', 'Demo', 'Infusión de manzanilla', 4800],
    [7, 15, 'Agua sin gas 600ml', 'Botella', 'Demo', 'Agua potable en presentación personal', 1600],
    [7, 16, 'Agua con gas 1.5L', 'Botella', 'Demo', 'Agua carbonatada', 3300],
    [7, 17, 'Jugo de naranja 1L', 'Caja', 'Demo', 'Bebida sabor naranja', 5200],
    [7, 18, 'Gaseosa cola 1.5L', 'Botella', 'Demo', 'Bebida gaseosa familiar', 4800],
    [7, 19, 'Bebida de avena 1L', 'Caja', 'Demo', 'Bebida lista a base de avena', 4900],
    [7, 20, 'Refresco en polvo x 12', 'Caja', 'Demo', 'Sobres para preparar bebidas', 3900],
    [7, 21, 'Malta 1L', 'Botella', 'Demo', 'Bebida de malta familiar', 4200],

    [8, 12, 'Detergente líquido 1L', 'Botella', 'Demo', 'Detergente líquido para ropa', 11900],
    [8, 13, 'Suavizante de telas 1L', 'Botella', 'Demo', 'Suavizante para ropa', 8700],
    [8, 14, 'Lavaloza líquido 500ml', 'Botella', 'Demo', 'Lavaloza líquido para utensilios', 4900],
    [8, 15, 'Esponja para cocina x 3', 'Paquete', 'Demo', 'Esponjas multiuso', 3500],
    [8, 16, 'Bolsa para basura x 10', 'Paquete', 'Demo', 'Bolsas resistentes para residuos', 4200],
    [8, 17, 'Limpiador multiusos 1L', 'Botella', 'Demo', 'Limpiador para superficies del hogar', 5900],
    [8, 18, 'Crema dental familiar 100ml', 'Tubo', 'Demo', 'Crema dental de uso familiar', 5400],
    [8, 19, 'Cepillo dental adulto', 'Unidad', 'Demo', 'Cepillo dental para adulto', 3900],
    [8, 20, 'Desodorante roll-on 50ml', 'Unidad', 'Demo', 'Desodorante de uso diario', 7900],
    [8, 21, 'Shampoo familiar 400ml', 'Botella', 'Demo', 'Shampoo para uso diario', 10900],
    [8, 22, 'Acondicionador 400ml', 'Botella', 'Demo', 'Acondicionador para el cabello', 10900],
    [8, 23, 'Toallas de cocina x 2 rollos', 'Paquete', 'Demo', 'Toallas absorbentes para cocina', 5900],

    [9, 12, 'Papa a la francesa congelada 500g', 'Bolsa', 'Demo', 'Papas listas para freír', 7900],
    [9, 13, 'Verduras mixtas congeladas 500g', 'Bolsa', 'Demo', 'Mezcla de verduras congeladas', 6500],
    [9, 14, 'Nuggets de pollo 400g', 'Bolsa', 'Demo', 'Nuggets congelados listos para preparar', 11900],
    [9, 15, 'Pulpa de maracuyá 500g', 'Bolsa', 'Demo', 'Pulpa congelada para jugos', 6200],
    [9, 16, 'Helado de vainilla 1L', 'Tarro', 'Demo', 'Helado sabor vainilla', 13900],
    [9, 17, 'Empanadas congeladas x 10', 'Paquete', 'Demo', 'Empanadas listas para freír u hornear', 12900],
    [9, 18, 'Yuca congelada 500g', 'Bolsa', 'Demo', 'Yuca pelada lista para cocinar', 4900],
    [9, 19, 'Hamburguesa de pollo x 4', 'Paquete', 'Demo', 'Hamburguesas de pollo congeladas', 10900],

    [10, 12, 'Pañales etapa 1 x 30', 'Paquete', 'Demo', 'Pañales desechables para bebé', 28900],
    [10, 13, 'Pañales etapa 3 x 30', 'Paquete', 'Demo', 'Pañales desechables para bebé', 31900],
    [10, 14, 'Toallitas húmedas x 50', 'Paquete', 'Demo', 'Toallitas para cuidado del bebé', 5900],
    [10, 15, 'Crema antipañalitis 60g', 'Tubo', 'Demo', 'Crema protectora para bebé', 10900],
    [10, 16, 'Shampoo para bebé 200ml', 'Botella', 'Demo', 'Shampoo suave para bebé', 8900],
    [10, 17, 'Fórmula infantil etapa 1 400g', 'Lata', 'Demo', 'Fórmula infantil; consultar indicación profesional', 45900],
    [10, 18, 'Cereal infantil 200g', 'Caja', 'Demo', 'Cereal infantil; verificar edad recomendada', 14900],

    [11, 17, 'Alimento para perro adulto 1kg', 'Bolsa', 'Demo', 'Alimento seco para perro adulto', 9900],
    [11, 17, 'Alimento para gato adulto 1kg', 'Bolsa', 'Demo', 'Alimento seco para gato adulto', 11900],
    [11, 17, 'Arena sanitaria para gato 4kg', 'Bolsa', 'Demo', 'Arena absorbente para gato', 15900],
    [11, 18, 'Alimento húmedo para perro 100g', 'Sobre', 'Demo', 'Alimento húmedo individual para perro', 2900],
    [11, 19, 'Alimento húmedo para gato 85g', 'Sobre', 'Demo', 'Alimento húmedo individual para gato', 3200],
    [11, 20, 'Galletas para perro 200g', 'Bolsa', 'Demo', 'Premios horneados para perro', 6900],

    [12, 12, 'Papas fritas 150g', 'Paquete', 'Demo', 'Papas crocantes sabor natural', 4900],
    [12, 13, 'Maní salado 150g', 'Bolsa', 'Demo', 'Maní tostado con sal', 5900],
    [12, 14, 'Barra de chocolate 50g', 'Unidad', 'Demo', 'Chocolate en barra', 3200],
    [12, 15, 'Gomitas surtidas 100g', 'Bolsa', 'Demo', 'Gomitas de sabores surtidos', 3900],
    [12, 16, 'Maíz pira 500g', 'Bolsa', 'Demo', 'Maíz para preparar crispetas', 4200],
    [12, 17, 'Galletas wafer 100g', 'Paquete', 'Demo', 'Galletas wafer rellenas', 2800],
    [12, 18, 'Mezcla de frutos secos 150g', 'Bolsa', 'Demo', 'Frutos secos para merienda', 8900],

    [13, 12, 'Comino molido 50g', 'Frasco', 'Demo', 'Comino molido para sazonar', 3900],
    [13, 13, 'Pimienta negra molida 50g', 'Frasco', 'Demo', 'Pimienta negra molida', 4500],
    [13, 14, 'Orégano seco 20g', 'Frasco', 'Demo', 'Orégano seco para cocina', 3200],
    [13, 15, 'Ajo en polvo 50g', 'Frasco', 'Demo', 'Ajo deshidratado en polvo', 4200],
    [13, 16, 'Color para alimentos 50g', 'Bolsa', 'Demo', 'Condimento para preparaciones', 2500],
    [13, 17, 'Canela en astillas 20g', 'Bolsa', 'Demo', 'Canela para bebidas y postres', 3500],

    [14, 12, 'Maíz dulce en lata 300g', 'Lata', 'Demo', 'Maíz dulce listo para servir', 4900],
    [14, 13, 'Arvejas en lata 300g', 'Lata', 'Demo', 'Arvejas listas para cocinar', 3900],
    [14, 14, 'Fríjoles rojos en lata 300g', 'Lata', 'Demo', 'Fríjoles listos para calentar', 5600],
    [14, 15, 'Atún en agua 160g', 'Lata', 'Demo', 'Atún en agua para ensaladas y comidas', 6500],
    [14, 16, 'Duraznos en almíbar 425g', 'Lata', 'Demo', 'Duraznos en conserva', 8900],
    [14, 17, 'Champiñones en conserva 200g', 'Lata', 'Demo', 'Champiñones listos para cocinar', 6900],
    [14, 18, 'Pasta de tomate 170g', 'Lata', 'Demo', 'Pasta de tomate para salsas', 3200],
  ];

  const preciosLocales = await db.getAllAsync<any>('SELECT * FROM precios');

  for (const [categoriaIndex, comercioIndex, nombre, unidad, marca, desc, precio] of productosRiohacha) {
    const categoriaNombre = categoriasDemo[categoriaIndex - 1];
    const comercioNombre = comerciosDemo[comercioIndex - 1]?.[0];
    const idCat = categoriaNombre ? categoriaIdPorNombre.get(categoriaNombre) : undefined;
    const idCom = comercioNombre ? comercioIdPorNombre.get(comercioNombre) : undefined;
    if (idCat === undefined || idCom === undefined) {
      throw new Error(`No se pudo asociar el producto "${nombre}" a su categoría o comercio de demostración.`);
    }

    const existing = await db.getFirstAsync<any>(
      'SELECT id_producto FROM productos WHERE nombre = ? AND id_comercio = ?',
      [nombre, idCom]
    );

    let prodId: number;
    if (!existing) {
      const res = await db.runAsync(
        `INSERT INTO productos (id_categoria, id_comercio, nombre, unidad_medida, marca, descripcion, pro_estado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [idCat, idCom, nombre, unidad, marca, desc, 1]
      );
      prodId = res.lastInsertRowId;
    } else {
      prodId = existing.id_producto;
    }

    // Registrar precio de referencia
    if (prodId) {
      // Buscar sobre las filas locales evita diferencias del adaptador SQLite web
      // al interpretar filtros compuestos y permite reparar referencias antiguas.
      const existingPrecio = preciosLocales.find(
        (item) => Number(item.id_producto) === Number(prodId) && Number(item.id_comercio) === Number(idCom)
      );
      if (!existingPrecio) {
        const result = await db.runAsync(
          `INSERT INTO precios (id_producto, id_comercio, precio, disponible)
           VALUES (?, ?, ?, ?)`,
          [prodId, idCom, precio, 1]
        );
        preciosLocales.push({ id_precio: result.lastInsertRowId, id_producto: prodId, id_comercio: idCom, precio, disponible: 1 });
      } else {
        await db.runAsync(
          `UPDATE precios SET precio = ?, disponible = 1
           WHERE id_precio = ?`,
          [precio, existingPrecio.id_precio]
        );
        existingPrecio.precio = precio;
        existingPrecio.disponible = 1;
      }
    }
  }

  const productosExistentes = await db.getAllAsync<{
    id_producto: number;
    descripcion: string | null;
    pro_estado: number;
  }>(
    'SELECT * FROM productos'
  );
  const productosReferenciaPorCodigo = new Map<string, number>();
  const codigosReferenciaActivos = new Set<string>(
    COMMERCIAL_REFERENCE_PRODUCTS.map((articulo) => articulo.code)
  );

  for (const producto of productosExistentes) {
    const descripcion = producto.descripcion ?? '';
    const esReferenciaDaneAnterior = descripcion.startsWith(LEGACY_DANE_DESCRIPTION_PREFIX);
    const esReferenciaComercial = descripcion.startsWith(COMMERCIAL_REFERENCE_DESCRIPTION_PREFIX);
    if (!esReferenciaDaneAnterior && !esReferenciaComercial) continue;

    const prefix = esReferenciaDaneAnterior
      ? LEGACY_DANE_DESCRIPTION_PREFIX
      : COMMERCIAL_REFERENCE_DESCRIPTION_PREFIX;
    const code = descripcion.slice(prefix.length).replace(/\.$/, '');
    productosReferenciaPorCodigo.set(code, producto.id_producto);

    if (!codigosReferenciaActivos.has(code) && producto.pro_estado !== 0) {
      await db.runAsync(
        'UPDATE productos SET pro_estado = ? WHERE id_producto = ?',
        [0, producto.id_producto]
      );
    }
  }

  for (const articulo of COMMERCIAL_REFERENCE_PRODUCTS) {
    const division = COMMERCIAL_REFERENCE_DIVISIONS.find(({ code }) => code === articulo.division);
    const idCategoria = division
      ? categoriaIdPorNombre.get(`Catálogo orientativo ${division.code} - ${division.name}`)
      : undefined;
    if (idCategoria === undefined) {
      throw new Error(`No se pudo asociar el producto de referencia ${articulo.code} a su división.`);
    }

    const idProducto = productosReferenciaPorCodigo.get(articulo.code);
    const descripcion = `${COMMERCIAL_REFERENCE_DESCRIPTION_PREFIX}${articulo.code}.`;
    if (idProducto !== undefined) {
      await db.runAsync(
        `UPDATE productos
         SET id_categoria = ?, id_comercio = ?, nombre = ?, descripcion = ?, unidad_medida = ?, pro_estado = ?
         WHERE id_producto = ?`,
        [idCategoria, null, articulo.name, descripcion, 'Unidad', 1, idProducto]
      );
    } else {
      await db.runAsync(
        `INSERT INTO productos (id_categoria, id_comercio, nombre, descripcion, unidad_medida, pro_estado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idCategoria, null, articulo.name, descripcion, 'Unidad', 1]
      );
    }
  }

  console.log('✅ Base local poblada con comercios demo y 419 productos de referencia comercial.');
}
