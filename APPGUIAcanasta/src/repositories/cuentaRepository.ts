import { getDatabase } from '@/database/database';

interface QueueRow {
  id_queue: number;
  tabla: string;
  datos_json: string;
}

export interface PlanEliminacionDatosLocal {
  id_usuario: number;
  id_listas: number[];
  id_presupuestos: number[];
  id_colas: number[];
}

const TABLAS_DEL_USUARIO = [
  'confirmaciones_reporte',
  'detalles_factura',
  'facturas',
  'pagos_pendientes',
  'movimientos_saldo',
  'deudas_tienda',
  'metas_ahorro',
  'perecederos',
  'perfiles_hogar',
  'movimientos_hogar',
  'calificaciones_productos',
  'prioridades_producto',
  'reportes_precio',
  'direcciones_entrega',
  'compras',
  'billeteras',
  'listas_compra',
  'presupuestos',
  'usuarios',
] as const;

export async function prepararEliminacionDatosLocal(
  id_usuario: number
): Promise<PlanEliminacionDatosLocal> {
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('La cuenta seleccionada no es válida.');
  }

  const db = await getDatabase();
  const [lists, budgets, reports, queue] = await Promise.all([
    db.getAllAsync<{ id_lista: number }>(
      'SELECT id_lista FROM listas_compra WHERE id_usuario = ?',
      [id_usuario]
    ),
    db.getAllAsync<{ id_presupuesto: number }>(
      'SELECT id_presupuesto FROM presupuestos WHERE id_usuario = ?',
      [id_usuario]
    ),
    db.getAllAsync<{ id_reporte: number }>(
      'SELECT id_reporte FROM reportes_precio WHERE id_usuario = ?',
      [id_usuario]
    ),
    db.getAllAsync<QueueRow>('SELECT * FROM sync_queue'),
  ]);
  const id_listas = lists.map((row) => Number(row.id_lista));
  const id_presupuestos = budgets.map((row) => Number(row.id_presupuesto));
  const userReportIds = new Set(reports.map((row) => Number(row.id_reporte)));
  const id_colas: number[] = [];

  for (const item of queue) {
    if (item.tabla !== 'reportes_precio' && item.tabla !== 'confirmaciones_reporte') continue;
    let payload: unknown;
    try {
      payload = JSON.parse(item.datos_json);
    } catch (error) {
      console.error(`No se pudo leer el elemento ${item.id_queue} de la cola de sincronización:`, error);
      throw new Error('No se pudo verificar la cola de sincronización. No se eliminó ninguna cuenta.');
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      throw new Error('La cola de sincronización contiene un registro inválido. No se eliminó ninguna cuenta.');
    }
    const row = payload as Record<string, unknown>;
    if (
      Number(row.id_usuario) === id_usuario ||
      (typeof row.id_reporte === 'number' && userReportIds.has(row.id_reporte))
    ) {
      id_colas.push(Number(item.id_queue));
    }
  }

  return { id_usuario, id_listas, id_presupuestos, id_colas };
}

export async function eliminarDatosLocalesUsuario(
  plan: PlanEliminacionDatosLocal
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const id_lista of plan.id_listas) {
      await db.runAsync('DELETE FROM detalles_lista_compra WHERE id_lista = ?', [id_lista]);
    }
    for (const id_presupuesto of plan.id_presupuestos) {
      await db.runAsync('DELETE FROM detalles_presupuesto WHERE id_presupuesto = ?', [id_presupuesto]);
    }
    for (const table of TABLAS_DEL_USUARIO) {
      await db.runAsync(`DELETE FROM ${table} WHERE id_usuario = ?`, [plan.id_usuario]);
    }
    for (const id_queue of plan.id_colas) {
      await db.runAsync('DELETE FROM sync_queue WHERE id_queue = ?', [id_queue]);
    }
  });
}
