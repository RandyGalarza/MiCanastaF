import { Ionicons } from '@expo/vector-icons';
import { router, Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { InformacionPagoCompra, obtenerCompra, obtenerInformacionPagoCompra } from '@/repositories/compraRepository';
import { Compra, DetalleCompra } from '@/types/database';
import { generarPdfFactura } from '@/utils/invoice-pdf';
import { ProductImage } from '@/components/product-image';
import { AppLogo } from '@/components/app-logo';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;

export default function FacturaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [purchase, setPurchase] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<InformacionPagoCompra | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState('');
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadPurchase() {
      if (!user || !id || !/^\d+$/.test(id)) {
        setPurchase(null);
        setError('No encontramos una factura válida para mostrar.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const result = await obtenerCompra(Number(id), user.id_usuario);
        if (active) {
          setPurchase(result);
          if (!result) setError('Esta factura no existe o no pertenece a tu cuenta.');
        }
      } catch (err) {
        console.error('No se pudo cargar la factura:', err);
        if (active) setError('No se pudo cargar la factura. Intenta de nuevo.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPurchase();
    return () => { active = false; };
  }, [id, user]);

  useEffect(() => {
    let active = true;
    async function loadPayment() {
      if (!purchase || !user) {
        setPayment(null);
        setPaymentError('');
        setPaymentLoading(false);
        return;
      }

      const purchaseId = purchase.id_compra;
      const userId = user.id_usuario;
      setPayment(null);
      setPaymentError('');
      setPaymentLoading(true);
      try {
        const result = await obtenerInformacionPagoCompra(purchaseId, userId);
        if (active) setPayment(result);
      } catch (err) {
        console.error('No se pudo cargar la información de pago de la factura:', err);
        if (active) setPaymentError('No se pudo cargar la información del pago. El detalle de la compra sigue disponible.');
      } finally {
        if (active) setPaymentLoading(false);
      }
    }
    void loadPayment();
    return () => { active = false; };
  }, [purchase, user]);

  const downloadPdf = async () => {
    if (!purchase || !user || pdfBusy) return;
    setPdfBusy(true);
    setPdfError('');
    try {
      await generarPdfFactura(purchase, {
        nombre: `${user.nombre} ${user.apellido}`,
        correo: user.correo,
        telefono: user.telefono,
      }, payment ?? undefined);
    } catch (err) {
      console.error('No se pudo generar o compartir el PDF:', err);
      setPdfError(
        err instanceof Error && err.message.includes('ventana de impresión')
          ? 'El navegador bloqueó la factura. Permite las ventanas emergentes e inténtalo de nuevo.'
          : 'No se pudo generar el PDF. Intenta de nuevo.'
      );
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push('/historial-compras')}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver al historial"
          accessibilityHint="Regresa a tus compras"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color="#166534" />
        </Pressable>
        <Text style={styles.topTitle} accessibilityRole="header">Detalle de factura</Text>
      </View>

      {!user ? (
        <View style={styles.stateCard}><Ionicons name="person-outline" size={30} color="#16a34a" /><Text style={styles.cardTitle}>Inicia sesión para ver la factura</Text><Link href="/login" style={styles.loginButton}>Iniciar sesión</Link></View>
      ) : loading ? (
        <View style={styles.stateCard} accessibilityLiveRegion="polite"><ActivityIndicator color="#16a34a" accessibilityLabel="Cargando factura" /><Text style={styles.bodyText}>Cargando factura…</Text></View>
      ) : error || !purchase ? (
        <View style={styles.stateCard} accessibilityRole="alert"><Ionicons name="alert-circle-outline" size={30} color="#dc2626" /><Text style={styles.cardTitle} accessibilityRole="header">Factura no disponible</Text><Text style={styles.bodyText}>{error || 'No encontramos la factura solicitada.'}</Text></View>
      ) : (
        <>
          <View style={styles.invoiceHeader}>
            <AppLogo size={52} style={styles.invoiceIcon} />
            <Text style={styles.invoiceTitle} accessibilityRole="header">Factura de compra</Text>
            <Text style={styles.invoiceNumber}>{purchase.numero_factura}</Text>
            <Text style={styles.invoiceMeta}>{new Date(purchase.fecha_compra).toLocaleString('es-CO')}</Text>
            <Text style={styles.invoiceMeta}>Referencia interna #{purchase.id_compra}</Text>
            <View style={styles.listTag}><Ionicons name="list-outline" size={14} color="#166534" /><Text style={styles.listName}>{purchase.nombre_lista}</Text></View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Información de la compra</Text>
            <InfoRow label="Comprador" value={`${user.nombre} ${user.apellido}`} />
            <InfoRow label="Correo" value={user.correo} />
            <InfoRow label="Teléfono" value={user.telefono || 'No registrado'} />
            <InfoRow label="ID de lista" value={purchase.id_lista == null ? 'No disponible' : String(purchase.id_lista)} />
            <InfoRow label="Productos distintos" value={String(purchase.detalles.length)} />
            <InfoRow label="Unidades totales" value={purchase.detalles.reduce((sum, item) => sum + Number(item.cantidad), 0).toLocaleString('es-CO')} />
            <InfoRow
              label="Comercios"
              value={[...new Set(purchase.detalles.map((item) => item.nombre_comercio).filter(Boolean))].join(', ') || 'No especificados'}
            />
          </View>

          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Productos comprados</Text>
            {purchase.detalles.map((item, index) => <InvoiceItem key={`${item.id_producto}-${index}`} item={item} />)}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Información de pago</Text>
            {paymentLoading ? (
              <View style={styles.paymentLoading} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color="#16a34a" accessibilityLabel="Cargando información de pago" />
                <Text style={styles.infoValue}>Consultando registro de pago…</Text>
              </View>
            ) : (
              <>
                <InfoRow label="Método registrado" value={payment?.metodo || 'No disponible en el registro'} />
                {payment?.referencia ? <InfoRow label="Referencia de pago" value={payment.referencia} /> : null}
              </>
            )}
            {paymentError ? (
              <View style={styles.paymentError} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={17} color="#b91c1c" />
                <Text style={styles.errorText}>{paymentError}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.totalsCard}>
            <TotalRow label="Subtotal antes de descuentos" value={currency(purchase.subtotal)} />
            <TotalRow label="Descuentos" value={`− ${currency(purchase.descuento)}`} highlight={purchase.descuento > 0} />
            <TotalRow label="Impuestos" value="No calculados" />
            <View style={styles.divider} />
            <TotalRow label="Total de la compra" value={currency(purchase.total)} strong />
          </View>

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={18} color="#a16207" />
            <Text style={styles.disclaimerText}>Los descuentos mostrados son promociones demostrativas calculadas con los precios de referencia del catálogo. Los impuestos no se calculan. Este comprobante y su logotipo son informativos: no certifican el pago ni otorgan validez fiscal o legal, y no reemplazan la factura emitida por el comercio.</Text>
          </View>

          {pdfError ? <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite"><Ionicons name="alert-circle-outline" size={17} color="#b91c1c" /><Text style={styles.errorText}>{pdfError}</Text></View> : null}
          <Pressable
            onPress={() => void downloadPdf()}
            disabled={pdfBusy}
            style={[styles.pdfButton, pdfBusy && styles.disabledButton]}
            accessibilityRole="button"
            accessibilityLabel={pdfBusy ? 'Preparando factura en PDF' : Platform.OS === 'web' ? 'Abrir factura para imprimir o guardar como PDF' : 'Generar y compartir factura en PDF'}
            accessibilityHint={Platform.OS === 'web' ? 'Abre la factura para imprimirla o guardarla como PDF en el navegador' : 'Genera un documento PDF y abre las opciones para compartirlo'}
            accessibilityState={{ disabled: pdfBusy, busy: pdfBusy }}
          >
            {pdfBusy ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="download-outline" size={19} color="#ffffff" />}
            <Text style={styles.pdfButtonText}>{pdfBusy ? 'Preparando factura…' : Platform.OS === 'web' ? 'Imprimir o guardar como PDF' : 'Generar y compartir PDF'}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InvoiceItem({ item }: { item: DetalleCompra }) {
  const discount = item.descuento_unitario * item.cantidad;
  return (
    <View style={styles.itemRow}>
      <ProductImage
        productName={item.nombre_producto}
        style={styles.productIcon}
        fallback={<Ionicons name="basket-outline" size={18} color="#15803d" />}
      />
      <View style={styles.itemCopy}>
        <Text style={styles.productName}>{item.nombre_producto}</Text>
        <Text style={styles.itemMeta}>{item.nombre_comercio} · {item.unidad_medida}</Text>
        <Text style={styles.itemMeta}>{item.cantidad} × {currency(item.precio_unitario)}{discount > 0 ? ` · Antes ${currency(item.precio_original)}` : ''}</Text>
        {discount > 0 ? <Text style={styles.discountTag}>Descuento {item.porcentaje_descuento}% · −{currency(discount)}</Text> : <Text style={styles.noDiscount}>Sin descuento</Text>}
      </View>
      <Text style={styles.lineTotal}>{currency(item.subtotal)}</Text>
    </View>
  );
}

function TotalRow({ label, value, highlight, strong }: { label: string; value: string; highlight?: boolean; strong?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, strong && styles.totalStrong]}>{label}</Text>
      <Text style={[styles.totalValue, highlight && styles.discountValue, strong && styles.totalStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6' },
  content: { padding: 18, paddingTop: 20, paddingBottom: 36, gap: 13, width: '100%', maxWidth: 760, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#14532d', fontSize: 18, fontWeight: '800' },
  stateCard: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 22, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  cardTitle: { color: '#14532d', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  bodyText: { color: '#64748b', fontSize: 12, textAlign: 'center' },
  loginButton: { color: '#ffffff', backgroundColor: '#16a34a', paddingHorizontal: 17, paddingVertical: 11, borderRadius: 12, overflow: 'hidden', fontSize: 13, fontWeight: '700' },
  invoiceHeader: { alignItems: 'center', padding: 20, gap: 5, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  invoiceIcon: { marginBottom: 5 },
  invoiceTitle: { color: '#14532d', fontSize: 20, fontWeight: '800' },
  invoiceNumber: { color: '#334155', fontSize: 12, fontWeight: '700' },
  invoiceMeta: { color: '#64748b', fontSize: 11 },
  listTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, marginTop: 5, borderRadius: 20, backgroundColor: '#f0fdf4' },
  listName: { color: '#166534', fontSize: 11, fontWeight: '700' },
  infoCard: { padding: 15, gap: 8, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  infoLabel: { flex: 1, color: '#64748b', fontSize: 11 },
  infoValue: { flex: 1.5, color: '#334155', fontSize: 11, fontWeight: '600', textAlign: 'right' },
  paymentLoading: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 4 },
  paymentError: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4, padding: 10, borderRadius: 11, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  itemsCard: { padding: 15, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  sectionTitle: { color: '#14532d', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  productIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, gap: 3 },
  productName: { color: '#1e293b', fontSize: 12, fontWeight: '800' },
  itemMeta: { color: '#64748b', fontSize: 10 },
  discountTag: { color: '#15803d', fontSize: 10, fontWeight: '700' },
  noDiscount: { color: '#64748b', fontSize: 10 },
  lineTotal: { color: '#14532d', fontSize: 12, fontWeight: '800' },
  totalsCard: { padding: 15, gap: 11, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  totalLabel: { flex: 1, color: '#64748b', fontSize: 11 },
  totalValue: { color: '#334155', fontSize: 12, fontWeight: '700' },
  discountValue: { color: '#15803d' },
  totalStrong: { color: '#14532d', fontSize: 14, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#dcfce7' },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 13, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  disclaimerText: { flex: 1, color: '#854d0e', fontSize: 10, lineHeight: 15 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  errorText: { flex: 1, color: '#991b1b', fontSize: 12 },
  pdfButton: { minHeight: 48, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a' },
  pdfButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  disabledButton: { opacity: 0.65 },
});
