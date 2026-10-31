import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Compra } from '@/types/database';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function crearHtmlFactura(compra: Compra, nombreComprador: string): string {
  const rows = compra.detalles.map((item) => {
    const discount = item.descuento_unitario * item.cantidad;
    const discountText = discount > 0
      ? `${item.porcentaje_descuento}% (${currency(discount)})`
      : 'Sin descuento';
    const priceText = discount > 0
      ? `<span class="old-price">${currency(item.precio_original)}</span><br>${currency(item.precio_unitario)}`
      : currency(item.precio_unitario);
    return `<tr>
      <td><strong>${escapeHtml(item.nombre_producto)}</strong><small>${escapeHtml(item.nombre_comercio)} · ${escapeHtml(item.unidad_medida)}</small></td>
      <td>${item.cantidad}</td>
      <td>${priceText}</td>
      <td>${discountText}</td>
      <td>${currency(item.subtotal)}</td>
    </tr>`;
  }).join('');
  const date = new Date(compra.fecha_compra).toLocaleString('es-CO');

  return `<!doctype html>
  <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    @page { size: letter; margin: 18mm 14mm; }
    body { font-family: Arial, sans-serif; color: #17211b; font-size: 12px; }
    header { border-bottom: 3px solid #16a34a; padding-bottom: 14px; margin-bottom: 18px; }
    h1 { color: #14532d; font-size: 24px; margin: 0 0 5px; }
    p { margin: 4px 0; color: #475569; }
    .meta { display: flex; justify-content: space-between; gap: 20px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { text-align: left; background: #f0fdf4; color: #14532d; }
    th, td { padding: 9px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    small { display: block; color: #64748b; margin-top: 4px; }
    .old-price { color: #64748b; text-decoration: line-through; }
    .totals { width: 260px; margin: 18px 0 0 auto; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .grand-total { color: #14532d; font-size: 16px; font-weight: bold; border-top: 2px solid #16a34a; margin-top: 5px; padding-top: 9px; }
    .note { margin-top: 22px; padding: 10px; background: #fffbeb; color: #854d0e; }
    @media print { tr { page-break-inside: avoid; } }
  </style></head><body>
    <header><h1>Factura de compra</h1><p>Mi Canasta Familiar · Comprobante de compra</p></header>
    <div class="meta"><div><p><strong>Factura:</strong> ${escapeHtml(compra.numero_factura)}</p><p><strong>Fecha:</strong> ${escapeHtml(date)}</p></div>
    <div><p><strong>Comprador:</strong> ${escapeHtml(nombreComprador)}</p><p><strong>Lista:</strong> ${escapeHtml(compra.nombre_lista)}</p></div></div>
    <table><thead><tr><th>Producto / comercio</th><th>Cant.</th><th>Precio unitario</th><th>Descuento</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="totals"><div class="total-row"><span>Subtotal</span><strong>${currency(compra.subtotal)}</strong></div>
    <div class="total-row"><span>Descuentos</span><strong>− ${currency(compra.descuento)}</strong></div>
    <div class="total-row grand-total"><span>Total pagado</span><strong>${currency(compra.total)}</strong></div></section>
    <p class="note">Las promociones marcadas como descuento son demostrativas y se calculan sobre los precios de referencia disponibles en el catálogo.</p>
    <p>Este documento es un comprobante generado por la aplicación; no reemplaza la factura fiscal del comercio.</p>
  </body></html>`;
}

export async function generarPdfFactura(compra: Compra, nombreComprador: string): Promise<void> {
  const html = crearHtmlFactura(compra, nombreComprador);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return;
  }
  await Print.printAsync({ html });
}
