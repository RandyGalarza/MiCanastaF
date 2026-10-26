export const DATABASE_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    telefono TEXT,
    correo TEXT NOT NULL UNIQUE,
    contrasena TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'usuario',
    id_comercio INTEGER,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_DATE,
    usu_estado INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (id_comercio)
        REFERENCES comercios(id_comercio)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS presupuestos (
    id_presupuesto INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    monto REAL NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    pre_estado INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comercios (
    id_comercio INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    tipo_comercio TEXT,
    com_estado INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS productos (
    id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
    id_categoria INTEGER NOT NULL,
    id_comercio INTEGER,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidad_medida TEXT NOT NULL,
    marca TEXT,
    imagen_url TEXT,
    pro_estado INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (id_comercio)
        REFERENCES comercios(id_comercio)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS precios (
    id_precio INTEGER PRIMARY KEY AUTOINCREMENT,
    id_producto INTEGER NOT NULL,
    id_comercio INTEGER NOT NULL,
    precio REAL NOT NULL,
    disponible INTEGER NOT NULL DEFAULT 1,
    fecha_registro TEXT NOT NULL DEFAULT CURRENT_DATE,

    FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_comercio)
        REFERENCES comercios(id_comercio)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listas_compra (
    id_lista INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_DATE,
    lis_estado INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS detalles_lista_compra (
    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_lista INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    cantidad REAL NOT NULL DEFAULT 1,
    comprado INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (id_lista)
        REFERENCES listas_compra(id_lista)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS detalles_presupuesto (
    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_presupuesto INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,

    FOREIGN KEY (id_presupuesto)
        REFERENCES presupuestos(id_presupuesto)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS facturas (
    id_factura INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    id_comercio INTEGER NOT NULL,
    id_presupuesto INTEGER NOT NULL,
    numero_factura TEXT NOT NULL,
    fecha_factura TEXT NOT NULL,
    subtotal REAL NOT NULL,
    impuesto REAL NOT NULL DEFAULT 0,
    descuento REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_DATE,
    fac_estado INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_comercio)
        REFERENCES comercios(id_comercio)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (id_presupuesto)
        REFERENCES presupuestos(id_presupuesto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS detalles_factura (
    id_detalle_factura INTEGER PRIMARY KEY AUTOINCREMENT,
    id_factura INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    descuento REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL,

    FOREIGN KEY (id_factura)
        REFERENCES facturas(id_factura)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
`;
