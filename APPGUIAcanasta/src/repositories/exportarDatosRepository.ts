import { getDatabase } from '@/database/database';

type ExportRow = Record<string, unknown>;

async function obtenerPorUsuario(
  table: string,
  id_usuario: number
): Promise<ExportRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<ExportRow>(
    `SELECT * FROM ${table} WHERE id_usuario = ?`,
    [id_usuario]
  );
}

export async function obtenerDatosExportables(id_usuario: number): Promise<ExportRow> {
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new Error('La cuenta seleccionada no es válida.');
  }

  const db = await getDatabase();
  const [
    profiles,
    budgets,
    lists,
    purchases,
    deliveryAddresses,
    householdMovements,
    wallets,
    walletMovements,
    pendingPayments,
    invoices,
    invoiceDetails,
    ratings,
    priceReports,
    priceConfirmations,
    debts,
    savingsGoals,
    perishables,
    householdProfiles,
    productPriorities,
  ] = await Promise.all([
    db.getAllAsync<ExportRow>('SELECT * FROM usuarios WHERE id_usuario = ?', [id_usuario]),
    obtenerPorUsuario('presupuestos', id_usuario),
    obtenerPorUsuario('listas_compra', id_usuario),
    obtenerPorUsuario('compras', id_usuario),
    obtenerPorUsuario('direcciones_entrega', id_usuario),
    obtenerPorUsuario('movimientos_hogar', id_usuario),
    obtenerPorUsuario('billeteras', id_usuario),
    obtenerPorUsuario('movimientos_saldo', id_usuario),
    obtenerPorUsuario('pagos_pendientes', id_usuario),
    obtenerPorUsuario('facturas', id_usuario),
    obtenerPorUsuario('detalles_factura', id_usuario),
    obtenerPorUsuario('calificaciones_productos', id_usuario),
    obtenerPorUsuario('reportes_precio', id_usuario),
    obtenerPorUsuario('confirmaciones_reporte', id_usuario),
    obtenerPorUsuario('deudas_tienda', id_usuario),
    obtenerPorUsuario('metas_ahorro', id_usuario),
    obtenerPorUsuario('perecederos', id_usuario),
    obtenerPorUsuario('perfiles_hogar', id_usuario),
    obtenerPorUsuario('prioridades_producto', id_usuario),
  ]);
  const user = profiles[0];
  if (!user) throw new Error('No se encontró el perfil de esta cuenta en el dispositivo.');

  const listDetails = (await Promise.all(
    lists.map((list) =>
      db.getAllAsync<ExportRow>(
        'SELECT * FROM detalles_lista_compra WHERE id_lista = ?',
        [list.id_lista]
      )
    )
  )).flat();
  const budgetDetails = (await Promise.all(
    budgets.map((budget) =>
      db.getAllAsync<ExportRow>(
        'SELECT * FROM detalles_presupuesto WHERE id_presupuesto = ?',
        [budget.id_presupuesto]
      )
    )
  )).flat();

  return {
    formato: 'mi-canasta-familiar',
    version: 1,
    fecha_exportacion: new Date().toISOString(),
    perfil: {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono,
      correo: user.correo,
      rol: user.rol,
      id_comercio: user.id_comercio,
      fecha_creacion: user.fecha_creacion,
    },
    presupuestos: budgets,
    compras: purchases,
    direcciones_entrega: deliveryAddresses,
    listas_compra: lists,
    detalles_lista_compra: listDetails,
    movimientos_hogar: householdMovements,
    billeteras: wallets,
    movimientos_saldo: walletMovements,
    pagos_pendientes: pendingPayments,
    facturas: invoices,
    detalles_factura: invoiceDetails,
    detalles_presupuesto: budgetDetails,
    calificaciones: ratings,
    reportes_precio: priceReports,
    confirmaciones_reporte: priceConfirmations,
    deudas_tienda: debts,
    metas_ahorro: savingsGoals,
    perecederos: perishables,
    perfil_hogar: householdProfiles,
    prioridades_producto: productPriorities,
  };
}
