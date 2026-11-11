import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { InformacionPagoCompra } from '@/repositories/compraRepository';
import { Compra } from '@/types/database';

export interface CompradorFactura {
  nombre: string;
  correo?: string;
  telefono?: string;
}

const APP_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#14532D"/>
  <circle cx="256" cy="256" r="190" fill="#15803D"/>
  <path d="M177 220 207 145M335 220 305 145" stroke="#F0FDF4" stroke-width="24" stroke-linecap="round"/>
  <path d="M148 222H364L337 363H175L148 222Z" fill="#F0FDF4"/>
  <path d="M160 246H352M204 238L222 349M256 238V349M308 238L290 349" stroke="#15803D" stroke-width="17" stroke-linecap="round"/>
  <path d="M256 145C256 111 282 86 315 86C310 119 289 143 256 145Z" fill="#86EFAC"/>
  <path d="M256 145C245 119 224 105 197 104C204 132 224 146 256 145Z" fill="#BBF7D0"/>
</svg>`;

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')} COP`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-CO');
}

function normalizeBuyer(buyer: string | CompradorFactura): CompradorFactura {
  return typeof buyer === 'string' ? { nombre: buyer } : buyer;
}

export function crearHtmlFactura(
  compra: Compra,
  comprador: string | CompradorFactura,
  pago?: InformacionPagoCompra
): string {
  const buyer = normalizeBuyer(comprador);
  const rows = compra.detalles.map((item) => {
    const discount = item.descuento_unitario * item.cantidad;
    const discountText = discount > 0
      ? `${item.porcentaje_descuento}% (${currency(discount)})`
      : 'Sin descuento';
    const priceText = discount > 0
      ? `<span class="old-price">${currency(item.precio_original)}</span><br>${currency(item.precio_unitario)}`
      : currency(item.precio_unitario);

    return `<tr>
      <td><strong>${escapeHtml(item.nombre_producto)}</strong><small>Producto #${item.id_producto}</small></td>
      <td>${escapeHtml(item.nombre_comercio)}<small>${escapeHtml(item.unidad_medida)}</small></td>
      <td class="numeric">${Number(item.cantidad).toLocaleString('es-CO')}</td>
      <td>${priceText}</td>
      <td>${discountText}</td>
      <td class="numeric">${currency(item.subtotal)}</td>
    </tr>`;
  }).join('');

  const storeNames = [...new Set(compra.detalles.map((item) => item.nombre_comercio).filter(Boolean))];
  const units = compra.detalles.reduce((sum, item) => sum + Number(item.cantidad), 0);
  const paymentMethod = escapeHtml(pago?.metodo || 'No disponible en el registro');
  const paymentReference = pago?.referencia
    ? `<p><strong>Referencia de pago:</strong> ${escapeHtml(pago.referencia)}</p>`
    : '';
  const stores = storeNames.length > 0
    ? storeNames.map(escapeHtml).join(' · ')
    : 'Comercio no especificado';
  const date = escapeHtml(formatDate(compra.fecha_compra));
  const generatedAt = escapeHtml(new Date().toLocaleString('es-CO'));

  return `<!doctype html>
  <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Comprobante ${escapeHtml(compra.numero_factura)}</title>
  <style>
    @page { size: letter; margin: 15mm 12mm 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #17211b; font-size: 11px; }
    .watermark { position: fixed; width: 360px; height: 360px; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: .12; z-index: 0; }
    .watermark svg { width: 100%; height: 100%; }
    .content { position: relative; z-index: 1; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 3px solid #16a34a; padding-bottom: 13px; margin-bottom: 15px; }
    .brand { display: flex; align-items: center; gap: 11px; }
    .logo { width: 54px; height: 54px; flex: 0 0 auto; }
    .brand-name { color: #14532d; font-size: 18px; font-weight: 800; margin: 0; }
    .brand-caption { color: #64748b; font-size: 10px; margin-top: 4px; }
    .document-badge { border: 1px solid #86efac; border-radius: 20px; color: #166534; background: #f0fdf4; padding: 7px 10px; font-size: 8px; font-weight: bold; text-align: center; }
    h2 { color: #14532d; font-size: 16px; margin: 0 0 9px; }
    h3 { color: #14532d; font-size: 12px; margin: 0 0 8px; }
    p { margin: 4px 0; color: #475569; line-height: 1.4; overflow-wrap: anywhere; }
    .invoice-title { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 14px 0 10px; }
    .invoice-title h2 { margin: 0; font-size: 20px; }
    .invoice-number { color: #14532d; font-size: 13px; font-weight: bold; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .panel { border: 1px solid #dcecdf; border-radius: 10px; background: rgba(255,255,255,.92); padding: 11px; break-inside: avoid; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
    .summary-item { border: 1px solid #e2e8f0; border-radius: 8px; background: rgba(255,255,255,.92); padding: 9px; }
    .summary-label { display: block; color: #64748b; font-size: 9px; margin-bottom: 4px; }
    .summary-value { color: #14532d; font-size: 12px; font-weight: bold; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; margin-top: 9px; background: rgba(255,255,255,.94); }
    th { text-align: left; background: #f0fdf4; color: #14532d; font-size: 9px; }
    th, td { padding: 7px 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    td { font-size: 9px; line-height: 1.35; }
    small { display: block; color: #64748b; margin-top: 3px; font-size: 8px; }
    .numeric { text-align: right; white-space: nowrap; }
    .old-price { color: #64748b; text-decoration: line-through; }
    .totals { width: 270px; max-width: 100%; margin: 13px 0 0 auto; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: rgba(255,255,255,.94); break-inside: avoid; }
    .total-row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; color: #475569; }
    .grand-total { color: #14532d; font-size: 14px; font-weight: bold; border-top: 2px solid #16a34a; margin-top: 4px; padding-top: 9px; }
    .note { margin-top: 13px; padding: 10px; border: 1px solid #fde68a; border-radius: 8px; background: rgba(255,251,235,.96); color: #854d0e; }
    .legal { margin-top: 8px; color: #64748b; font-size: 9px; }
    .generated { margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 7px; color: #64748b; font-size: 8px; text-align: center; }
    @media print {
      tr, .panel, .summary-item { break-inside: avoid; }
      thead { display: table-header-group; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style></head><body>
    <div class="watermark" aria-hidden="true">${APP_LOGO_SVG}</div>
    <main class="content">
      <header>
        <div class="brand">${APP_LOGO_SVG}<div><p class="brand-name">Mi Canasta Familiar</p><p class="brand-caption">Organiza y registra tus compras</p></div></div>
        <div class="document-badge">COMPROBANTE<br>GENERADO EN LA APP</div>
      </header>

      <div class="invoice-title">
        <h2>Comprobante de compra</h2>
        <span class="invoice-number">${escapeHtml(compra.numero_factura)}</span>
      </div>

      <div class="grid">
        <section class="panel">
          <h3>Datos de la compra</h3>
          <p><strong>Fecha:</strong> ${date}</p>
          <p><strong>Referencia interna:</strong> ${escapeHtml(String(compra.id_compra))}</p>
          <p><strong>Lista:</strong> ${escapeHtml(compra.nombre_lista)}</p>
          <p><strong>ID de lista:</strong> ${compra.id_lista == null ? 'No disponible' : escapeHtml(String(compra.id_lista))}</p>
          <p><strong>Estado en la app:</strong> Compra registrada</p>
        </section>
        <section class="panel">
          <h3>Comprador</h3>
          <p><strong>Nombre:</strong> ${escapeHtml(buyer.nombre || 'No registrado')}</p>
          <p><strong>Correo:</strong> ${escapeHtml(buyer.correo || 'No registrado')}</p>
          <p><strong>Teléfono:</strong> ${escapeHtml(buyer.telefono || 'No registrado')}</p>
        </section>
      </div>

      <div class="summary">
        <div class="summary-item"><span class="summary-label">Productos distintos</span><span class="summary-value">${compra.detalles.length}</span></div>
        <div class="summary-item"><span class="summary-label">Unidades totales</span><span class="summary-value">${units.toLocaleString('es-CO')}</span></div>
        <div class="summary-item"><span class="summary-label">Comercios</span><span class="summary-value">${storeNames.length}</span></div>
        <div class="summary-item"><span class="summary-label">Pago registrado como</span><span class="summary-value">${paymentMethod}</span></div>
      </div>
      <section class="panel"><h3>Comercios incluidos</h3><p>${stores}</p>${paymentReference}</section>

      <h3 style="margin-top:14px">Detalle de productos</h3>
      <table><thead><tr><th>Producto</th><th>Comercio / unidad</th><th class="numeric">Cant.</th><th>Precio unitario</th><th>Descuento</th><th class="numeric">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>

      <section class="totals">
        <div class="total-row"><span>Subtotal antes de descuentos</span><strong>${currency(compra.subtotal)}</strong></div>
        <div class="total-row"><span>Descuentos demostrativos</span><strong>− ${currency(compra.descuento)}</strong></div>
        <div class="total-row"><span>Impuestos</span><strong>No calculados</strong></div>
        <div class="total-row grand-total"><span>Total registrado</span><strong>${currency(compra.total)}</strong></div>
      </section>

      <p class="note">Las promociones marcadas como descuento son demostrativas y se calculan sobre los precios de referencia disponibles en el catálogo.</p>
      <p class="legal">Este es un comprobante informativo generado por Mi Canasta Familiar. El logotipo y la marca de agua identifican visualmente el documento, pero no certifican el pago ni le otorgan validez fiscal o legal. No reemplaza la factura electrónica o fiscal emitida por cada comercio.</p>
      <p class="generated">Generado el ${generatedAt} · Código de comprobante ${escapeHtml(compra.numero_factura)}</p>
    </main>
  </body></html>`;
}

export async function generarPdfFactura(
  compra: Compra,
  comprador: string | CompradorFactura,
  pago?: InformacionPagoCompra
): Promise<void> {
  const html = crearHtmlFactura(compra, comprador, pago);
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.');
    }

    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    window.setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
      }
    }, 250);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return;
  }
  await Print.printAsync({ html });
}
