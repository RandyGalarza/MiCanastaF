import { getDatabase } from '../database/database';
import { Comercio } from '../types/database';
import { syncRecordToSupabase } from '../database/syncService';
import {
  geocodificarDireccionComercio,
  GeocodingError,
  type CoordenadasComercio,
} from '../utils/comercio-geocoding';

function validarCoordenadas(latitud?: number | null, longitud?: number | null) {
  if ((latitud == null) !== (longitud == null)) {
    throw new GeocodingError('Ingresa latitud y longitud juntas.');
  }
  if (latitud != null && longitud != null && (
    !Number.isFinite(latitud) || latitud < -90 || latitud > 90 ||
    !Number.isFinite(longitud) || longitud < -180 || longitud > 180 ||
    latitud === 0 || longitud === 0
  )) {
    throw new GeocodingError('Ingresa coordenadas válidas para ubicar el comercio.');
  }
}

async function resolverUbicacion(
  direccion: string | null,
  latitud?: number | null,
  longitud?: number | null
): Promise<CoordenadasComercio> {
  validarCoordenadas(latitud, longitud);
  if (latitud != null && longitud != null) return { latitud, longitud };
  return geocodificarDireccionComercio(direccion ?? '');
}

async function sincronizarComercio(db: Awaited<ReturnType<typeof getDatabase>>, idComercio: number) {
  const comercio = await db.getFirstAsync<Comercio>(
    'SELECT * FROM comercios WHERE id_comercio = ?',
    [idComercio]
  );
  if (!comercio) throw new Error('No se pudo recuperar el comercio guardado.');
  void syncRecordToSupabase('comercios', comercio, 'id_comercio');
}

export async function crearComercio(
  nombre: string,
  direccion?: string,
  telefono?: string,
  tipo_comercio?: string,
  latitud?: number | null,
  longitud?: number | null
): Promise<number> {
  const db = await getDatabase();
  const direccionNormalizada = direccion?.trim() || null;
  const ubicacion = await resolverUbicacion(direccionNormalizada, latitud, longitud);

  const result = await db.runAsync(
    `
    INSERT INTO comercios
    (
      nombre,
      direccion,
      telefono,
      tipo_comercio,
      latitud,
      longitud
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      nombre,
      direccionNormalizada,
      telefono ?? null,
      tipo_comercio ?? null,
      ubicacion.latitud,
      ubicacion.longitud
    ]
  );

  await sincronizarComercio(db, result.lastInsertRowId);
  return result.lastInsertRowId;
}

export async function obtenerComercios(): Promise<Comercio[]> {
  const db = await getDatabase();

  return await db.getAllAsync<Comercio>(
    `
    SELECT *
    FROM comercios
    WHERE com_estado = 1
    ORDER BY nombre ASC
    `
  );
}

export async function actualizarComercio(
  id_comercio: number,
  nombre: string,
  direccion?: string,
  telefono?: string,
  tipo_comercio?: string,
  latitud?: number | null,
  longitud?: number | null
): Promise<void> {
  const db = await getDatabase();
  const comercioActual = await db.getFirstAsync<Comercio>(
    'SELECT * FROM comercios WHERE id_comercio = ?',
    [id_comercio]
  );
  if (!comercioActual) throw new Error('No se encontró el comercio que intentas actualizar.');

  const direccionNormalizada = direccion?.trim() || null;
  const direccionActualNormalizada = comercioActual.direccion?.trim() || null;
  const direccionCambio = direccionNormalizada !== direccionActualNormalizada;
  validarCoordenadas(latitud, longitud);

  const ubicacionActualValida = comercioActual.latitud != null && comercioActual.longitud != null &&
    Number.isFinite(Number(comercioActual.latitud)) && Number.isFinite(Number(comercioActual.longitud)) &&
    Number(comercioActual.latitud) >= -90 && Number(comercioActual.latitud) <= 90 &&
    Number(comercioActual.longitud) >= -180 && Number(comercioActual.longitud) <= 180 &&
    Number(comercioActual.latitud) !== 0 && Number(comercioActual.longitud) !== 0;
  const coordenadasCambiaron = latitud != null && longitud != null && (
    !ubicacionActualValida ||
    Math.abs(latitud - Number(comercioActual.latitud)) > 0.000001 ||
    Math.abs(longitud - Number(comercioActual.longitud)) > 0.000001
  );

  let ubicacion: CoordenadasComercio;
  if (direccionCambio && direccionNormalizada && !coordenadasCambiaron) {
    ubicacion = await geocodificarDireccionComercio(direccionNormalizada);
  } else if (latitud != null && longitud != null) {
    ubicacion = { latitud, longitud };
  } else if (ubicacionActualValida && !direccionCambio) {
    ubicacion = {
      latitud: Number(comercioActual.latitud),
      longitud: Number(comercioActual.longitud),
    };
  } else if (direccionNormalizada) {
    ubicacion = await geocodificarDireccionComercio(direccionNormalizada);
  } else if (ubicacionActualValida) {
    ubicacion = {
      latitud: Number(comercioActual.latitud),
      longitud: Number(comercioActual.longitud),
    };
  } else {
    throw new GeocodingError('Escribe la dirección del comercio o ingresa ambas coordenadas manualmente.');
  }

  const result = await db.runAsync(
    `
    UPDATE comercios
    SET
      nombre = ?,
      direccion = ?,
      telefono = ?,
      tipo_comercio = ?,
      latitud = ?,
      longitud = ?
    WHERE id_comercio = ?
    `,
    [
      nombre,
      direccionNormalizada,
      telefono ?? null,
      tipo_comercio ?? null,
      ubicacion.latitud,
      ubicacion.longitud,
      id_comercio
    ]
  );
  if (result.changes === 0) throw new Error('No se pudo actualizar el comercio.');
  await sincronizarComercio(db, id_comercio);
}

export async function eliminarComercio(
  id_comercio: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE comercios
    SET com_estado = 0
    WHERE id_comercio = ?
    `,
    [id_comercio]
  );
}
