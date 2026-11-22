import { supabase } from '@/database/supabaseClient';

export interface HogarCompartido {
  id_hogar: string;
  nombre: string;
  rol: 'admin' | 'miembro';
  creado_por: string;
}

export interface InvitacionHogar {
  id_invitacion: string;
  id_hogar: string;
  nombre_hogar: string;
  correo_invitado: string;
  expira_en: string;
  fecha_creacion: string;
}

export interface MiembroHogar {
  auth_user_id: string;
  correo: string;
  rol: 'admin' | 'miembro';
  fecha_union: string;
}

export interface MovimientoHogarCompartido {
  id_movimiento: string;
  id_hogar: string;
  creado_por: string;
  nombre_creador: string;
  tipo: 'ingreso' | 'gasto';
  concepto: string;
  categoria: string;
  monto: number;
  fecha: string;
  fecha_creacion: string;
}

async function obtenerUsuarioAutenticado(): Promise<{ id: string; email: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`No se pudo validar la sesión: ${error.message}`);
  if (!data.user?.id || !data.user.email || !data.user.email_confirmed_at) {
    throw new Error('Inicia sesión con un correo confirmado para usar el hogar compartido.');
  }
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}

export async function obtenerHogarCompartido(): Promise<HogarCompartido | null> {
  await obtenerUsuarioAutenticado();
  const { data, error } = await supabase.rpc('obtener_hogar_actual');
  if (error) throw new Error(`No se pudo consultar el hogar compartido: ${error.message}`);
  const result = Array.isArray(data) ? data[0] : data;
  return result ?? null;
}

export async function crearHogarCompartido(nombre: string): Promise<string> {
  const cleanName = nombre.trim();
  if (cleanName.length < 1 || cleanName.length > 60) {
    throw new Error('El nombre del hogar debe tener entre 1 y 60 caracteres.');
  }
  await obtenerUsuarioAutenticado();
  const { data, error } = await supabase.rpc('crear_hogar', { p_nombre: cleanName });
  if (error) throw new Error(`No se pudo crear el hogar: ${error.message}`);
  if (typeof data !== 'string') throw new Error('El servidor no devolvió el hogar creado.');
  return data;
}

export async function obtenerInvitacionesHogar(): Promise<InvitacionHogar[]> {
  const usuario = await obtenerUsuarioAutenticado();
  const { data, error } = await supabase
    .from('invitaciones_hogar')
    .select('id_invitacion,id_hogar,nombre_hogar,correo_invitado,expira_en,fecha_creacion')
    .eq('correo_invitado', usuario.email)
    .eq('estado', 'pendiente')
    .gt('expira_en', new Date().toISOString())
    .order('fecha_creacion', { ascending: false })
    .limit(10);
  if (error) throw new Error(`No se pudieron consultar las invitaciones: ${error.message}`);
  return (data ?? []) as InvitacionHogar[];
}

export async function obtenerMiembrosHogar(id_hogar: string): Promise<MiembroHogar[]> {
  if (!id_hogar) throw new Error('Selecciona un hogar válido.');
  await obtenerUsuarioAutenticado();
  const { data, error } = await supabase
    .from('hogar_miembros')
    .select('auth_user_id,correo,rol,fecha_union')
    .eq('id_hogar', id_hogar)
    .order('fecha_union', { ascending: true });
  if (error) throw new Error(`No se pudieron consultar los miembros: ${error.message}`);
  return (data ?? []) as MiembroHogar[];
}

export async function invitarAlHogar(id_hogar: string, correo: string): Promise<string> {
  const cleanEmail = correo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Escribe un correo válido.');
  }
  await obtenerUsuarioAutenticado();
  const { data, error } = await supabase.rpc('invitar_miembro_hogar', {
    p_id_hogar: id_hogar,
    p_correo: cleanEmail,
  });
  if (error) throw new Error(`No se pudo crear la invitación: ${error.message}`);
  if (typeof data !== 'string') throw new Error('El servidor no devolvió la invitación creada.');
  return data;
}

export async function aceptarInvitacionHogar(id_invitacion: string): Promise<void> {
  await obtenerUsuarioAutenticado();
  const { error } = await supabase.rpc('aceptar_invitacion_hogar', {
    p_id_invitacion: id_invitacion,
  });
  if (error) throw new Error(`No se pudo aceptar la invitación: ${error.message}`);
}

export async function obtenerMovimientosHogarCompartido(
  id_hogar: string
): Promise<MovimientoHogarCompartido[]> {
  if (!id_hogar) throw new Error('Selecciona un hogar válido.');
  await obtenerUsuarioAutenticado();
  const { data, error } = await supabase
    .from('movimientos_hogar_compartidos')
    .select('*')
    .eq('id_hogar', id_hogar)
    .order('fecha', { ascending: false })
    .order('fecha_creacion', { ascending: false })
    .limit(100);
  if (error) throw new Error(`No se pudieron cargar los movimientos compartidos: ${error.message}`);
  return (data ?? []) as MovimientoHogarCompartido[];
}

export async function crearMovimientoHogarCompartido(
  id_hogar: string,
  nombre_creador: string,
  tipo: 'ingreso' | 'gasto',
  concepto: string,
  categoria: string,
  monto: number,
  fecha: string
): Promise<void> {
  const cleanConcept = concepto.trim();
  const cleanCategory = categoria.trim();
  if (!id_hogar) throw new Error('No se encontró un hogar compartido.');
  if (tipo !== 'ingreso' && tipo !== 'gasto') throw new Error('Selecciona un tipo de movimiento válido.');
  if (!cleanConcept || cleanConcept.length > 80 || !cleanCategory || cleanCategory.length > 40) {
    throw new Error('Completa el concepto y la categoría con textos válidos.');
  }
  if (!Number.isSafeInteger(monto) || monto <= 0) {
    throw new Error('El monto debe ser un valor entero mayor que cero.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('La fecha del movimiento no es válida.');

  const usuario = await obtenerUsuarioAutenticado();
  const { error } = await supabase.from('movimientos_hogar_compartidos').insert({
    id_hogar,
    creado_por: usuario.id,
    nombre_creador: nombre_creador.trim().slice(0, 100) || usuario.email,
    tipo,
    concepto: cleanConcept,
    categoria: cleanCategory,
    monto,
    fecha,
  });
  if (error) throw new Error(`No se pudo guardar el movimiento compartido: ${error.message}`);
}
