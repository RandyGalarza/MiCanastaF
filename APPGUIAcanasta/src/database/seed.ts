import { getDatabase } from './database';

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
  const comerciosDemo: [string, string, string, string][] = [
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
  ];

  const preciosLocales = await db.getAllAsync<any>('SELECT * FROM precios');

  for (const [idCat, idCom, nombre, unidad, marca, desc, precio] of productosRiohacha) {
    const existing = await db.getFirstAsync<any>(
      'SELECT id_producto FROM productos WHERE nombre = ? AND id_comercio = ?',
      [nombre, idCom]
    );

    let prodId: number;
    if (!existing) {
      const res = await db.runAsync(
        `INSERT INTO productos (id_categoria, id_comercio, nombre, unidad_medida, marca, descripcion, pro_estado)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [idCat, idCom, nombre, unidad, marca, desc]
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
           VALUES (?, ?, ?, 1)`,
          [prodId, idCom, precio]
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

  console.log('✅ Base de datos poblada con Éxito, Olímpica, Jumbo (ex-Carrefour), D1, Ara y productos locales de Riohacha.');
}
