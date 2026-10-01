export const DATABASE_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    contrasena TEXT NOT NULL,
    telefono TEXT,
    fecha_registro TEXT NOT NULL DEFAULT CURRENT_DATE,
    estado INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS productos (
    id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
    id_categoria INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    unidad_medida TEXT NOT NULL,
    marca TEXT,
    descripcion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS comercios (
    id_comercio INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    tipo_comercio TEXT,
    estado INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS precios (
    id_precio INTEGER PRIMARY KEY AUTOINCREMENT,
    id_producto INTEGER NOT NULL,
    id_comercio INTEGER NOT NULL,
    precio REAL NOT NULL CHECK(precio >= 0),
    fecha_registro TEXT NOT NULL DEFAULT CURRENT_DATE,
    disponible INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (id_comercio)
        REFERENCES comercios(id_comercio)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gastos (
    id_gasto INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    id_producto INTEGER,
    monto REAL NOT NULL CHECK(monto > 0),
    cantidad REAL DEFAULT 1,
    fecha TEXT NOT NULL DEFAULT CURRENT_DATE,
    descripcion TEXT,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS presupuestos (
    id_presupuesto INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    monto_total REAL NOT NULL CHECK(monto_total >= 0),
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVO',

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CHECK(fecha_fin >= fecha_inicio)
);

CREATE TABLE IF NOT EXISTS detalles_presupuesto (
    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_presupuesto INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    cantidad_planeada REAL NOT NULL DEFAULT 1,
    monto_planeado REAL NOT NULL DEFAULT 0,
    monto_gastado REAL NOT NULL DEFAULT 0,

    FOREIGN KEY (id_presupuesto)
        REFERENCES presupuestos(id_presupuesto)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS listas_compra (
    id_lista INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_DATE,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE',

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
`;