import { getDatabase } from '../database/database';
import { ReportePrecio } from '../types/database';
import { guardarOActualizarPrecio } from './precioRepository';
import { encolarSincronizacion } from '../database/syncQueue';

export async function crearReportePrecio(
  id_producto: number,
  id_comercio: number,
  id_usuario: number,
  precio_reportado: number,
  comentario?: string
): Promise<number> {
  const db = await getDatabase();

  let idReporte: number | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    if (!Number.isSafeInteger(candidate)) continue;
    const existingReport = await db.getFirstAsync<{ id_reporte: number }>(
      'SELECT id_reporte FROM reportes_precio WHERE id_reporte = ?',
      [candidate]
    );
    if (!existingReport) {
      idReporte = candidate;
      break;
    }
  }
  if (idReporte === null) {
    throw new Error('No se pudo asignar un identificador único al reporte. Intenta de nuevo.');
  }

  const res = await db.runAsync(
    `INSERT INTO reportes_precio
      (id_reporte, id_producto, id_comercio, id_usuario, precio_reportado, comentario, fecha_reporte, confirmaciones, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [idReporte, id_producto, id_comercio, id_usuario, precio_reportado, comentario?.trim() || null, new Date().toISOString(), 1, 'aprobado']
  );

  const reportId = res.lastInsertRowId;

  // Registrar confirmación del propio autor
  let createdConfirmation = false;
  try {
    await db.runAsync(
      `INSERT INTO confirmaciones_reporte (id_reporte, id_usuario) VALUES (?, ?)`,
      [reportId, id_usuario]
    );
    createdConfirmation = true;
  } catch {
    // El reporte puede conservarse aunque la confirmación local ya exista.
  }

  // Actualizar también el precio del producto localmente para que beneficie de inmediato
  await guardarOActualizarPrecio(id_producto, id_comercio, precio_reportado);

  // Encolar para sync colaborativo cuando haya internet
  await encolarSincronizacion('reportes_precio', 'INSERT', {
    id_reporte: reportId,
    id_producto,
    id_comercio,
    id_usuario,
    precio_reportado,
    comentario,
  });
  if (createdConfirmation) {
    await encolarSincronizacion('confirmaciones_reporte', 'INSERT', {
      id_reporte: reportId,
      id_usuario,
    });
  }

  return reportId;
}

export async function confirmarReportePrecio(
  id_reporte: number,
  id_usuario: number
): Promise<boolean> {
  const db = await getDatabase();

  try {
    const existing = await db.getFirstAsync<{ id_confirmacion: number }>(
      `SELECT id_confirmacion FROM confirmaciones_reporte WHERE id_reporte = ? AND id_usuario = ?`,
      [id_reporte, id_usuario]
    );

    if (existing) {
      return false; // Ya confirmó
    }

    const report = await db.getFirstAsync<{ confirmaciones: number }>(
      'SELECT confirmaciones FROM reportes_precio WHERE id_reporte = ?',
      [id_reporte]
    );
    if (!report) return false;

    await db.runAsync(
      `INSERT INTO confirmaciones_reporte (id_reporte, id_usuario) VALUES (?, ?)`,
      [id_reporte, id_usuario]
    );

    await db.runAsync(
      `UPDATE reportes_precio SET confirmaciones = ? WHERE id_reporte = ?`,
      [Number(report.confirmaciones) + 1, id_reporte]
    );

    await encolarSincronizacion('confirmaciones_reporte', 'INSERT', {
      id_reporte,
      id_usuario,
    });

    return true;
  } catch (error) {
    console.error('Error al confirmar reporte:', error);
    return false;
  }
}

export async function obtenerReportesPorProducto(
  id_producto: number,
  id_usuario_actual?: number
): Promise<ReportePrecio[]> {
  const db = await getDatabase();
  const reportes = await db.getAllAsync<ReportePrecio>(
    'SELECT * FROM reportes_precio WHERE id_producto = ?',
    [id_producto]
  );
  return enriquecerReportes(reportes, id_usuario_actual);
}

export async function obtenerReportesRecientes(limite = 20): Promise<ReportePrecio[]> {
  const db = await getDatabase();
  const reportes = await db.getAllAsync<ReportePrecio>('SELECT * FROM reportes_precio');
  const sorted = reportes
    .sort((left, right) => right.fecha_reporte.localeCompare(left.fecha_reporte))
    .slice(0, Math.max(0, Math.floor(limite)));
  return (await enriquecerReportes(sorted))
    .sort((left, right) => right.fecha_reporte.localeCompare(left.fecha_reporte));
}

async function enriquecerReportes(
  reportes: ReportePrecio[],
  id_usuario_actual?: number
): Promise<ReportePrecio[]> {
  const db = await getDatabase();
  const [productos, comercios, usuarios, confirmaciones] = await Promise.all([
    db.getAllAsync<{ id_producto: number; nombre: string }>('SELECT id_producto, nombre FROM productos'),
    db.getAllAsync<{ id_comercio: number; nombre: string }>('SELECT id_comercio, nombre FROM comercios'),
    db.getAllAsync<{ id_usuario: number; nombre: string; apellido: string }>('SELECT id_usuario, nombre, apellido FROM usuarios'),
    id_usuario_actual
      ? db.getAllAsync<{ id_reporte: number }>(
          'SELECT id_reporte FROM confirmaciones_reporte WHERE id_usuario = ?',
          [id_usuario_actual]
        )
      : Promise.resolve([]),
  ]);
  const productNames = new Map(productos.map((item) => [Number(item.id_producto), item.nombre]));
  const commerceNames = new Map(comercios.map((item) => [Number(item.id_comercio), item.nombre]));
  const userNames = new Map(usuarios.map((item) => [Number(item.id_usuario), `${item.nombre} ${item.apellido}`.trim()]));
  const confirmedReports = new Set(confirmaciones.map((item) => Number(item.id_reporte)));

  return reportes
    .map((report) => ({
      ...report,
      nombre_producto: productNames.get(Number(report.id_producto)),
      nombre_comercio: commerceNames.get(Number(report.id_comercio)),
      nombre_usuario: userNames.get(Number(report.id_usuario)),
      usuario_confirmo: id_usuario_actual ? confirmedReports.has(Number(report.id_reporte)) : undefined,
    }))
    .sort((left, right) =>
      Number(right.confirmaciones) - Number(left.confirmaciones) ||
      right.fecha_reporte.localeCompare(left.fecha_reporte)
    );
}
