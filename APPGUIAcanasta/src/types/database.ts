export type RolUsuario = 'admin' | 'comercio' | 'usuario';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  telefono?: string;
  correo: string;
  contrasena: string;
  rol: RolUsuario;
  id_comercio?: number | null;
  fecha_creacion: string;
  usu_estado: number;
}

export interface Presupuesto {
  id_presupuesto: number;
  id_usuario: number;
  nombre: string;
  monto: number;
  fecha_inicio: string;
  fecha_fin: string;
  pre_estado: number;
}

export interface Categoria {
  id_categoria: number;
  descripcion: string;
}

export interface Producto {
  id_producto: number;
  id_categoria: number;
  id_comercio: number | null;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  marca?: string;
  imagen_url?: string;
  pro_estado: number;
  precio?: number | null;
}

export interface Comercio {
  id_comercio: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  tipo_comercio?: string;
  com_estado: number;
}

export interface Precio {
  id_precio: number;
  id_producto: number;
  id_comercio: number;
  precio: number;
  disponible: number;
  fecha_registro: string;
}

export interface ListaCompra {
  id_lista: number;
  id_usuario: number;
  nombre: string;
  fecha_creacion: string;
  lis_estado: number;
}

export interface DetalleListaCompra {
  id_detalle: number;
  id_lista: number;
  id_producto: number;
  cantidad: number;
  comprado: number;
}

export interface DetallePresupuesto {
  id_detalle: number;
  id_presupuesto: number;
  id_producto: number;
}

export interface Factura {
  id_factura: number;
  id_usuario: number;
  id_comercio: number;
  id_presupuesto: number;
  numero_factura: string;
  fecha_factura: string;
  subtotal: number;
  impuesto: number;
  descuento: number;
  total: number;
  fecha_creacion: string;
  fac_estado: number;
}

export interface DetalleFactura {
  id_detalle_factura: number;
  id_factura: number;
  id_usuario: number;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
}

export interface DetalleCompra {
  id_producto: number;
  id_comercio?: number | null;
  nombre_producto: string;
  unidad_medida: string;
  cantidad: number;
  nombre_comercio: string;
  precio_original: number;
  precio_unitario: number;
  descuento_unitario: number;
  porcentaje_descuento: number;
  subtotal: number;
}

export interface Compra {
  id_compra: number;
  id_usuario: number;
  id_lista: number | null;
  nombre_lista: string;
  numero_factura: string;
  fecha_compra: string;
  subtotal: number;
  descuento: number;
  total: number;
  detalles_json: string;
  detalles: DetalleCompra[];
}

export interface VentaComercio {
  id_compra: number;
  numero_factura: string;
  fecha_compra: string;
  nombre_lista: string;
  total: number;
  productos: DetalleCompra[];
}
