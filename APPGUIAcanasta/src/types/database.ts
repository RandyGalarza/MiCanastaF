export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  telefono?: string;
  fecha_registro: string;
  estado: number;
}

export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
}

export interface Producto {
  id_producto: number;
  id_categoria: number;
  nombre: string;
  unidad_medida: string;
  marca?: string;
  descripcion?: string;
  activo: number;
}

export interface Comercio {
  id_comercio: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  tipo_comercio?: string;
  estado: number;
}

export interface Precio {
  id_precio: number;
  id_producto: number;
  id_comercio: number;
  precio: number;
  fecha_registro: string;
  disponible: number;
}

export interface Gasto {
  id_gasto: number;
  id_usuario: number;
  id_producto?: number;
  monto: number;
  cantidad: number;
  fecha: string;
  descripcion?: string;
}

export interface Presupuesto {
  id_presupuesto: number;
  id_usuario: number;
  nombre: string;
  monto_total: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}