import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { obtenerVentasComercio } from '@/repositories/compraRepository';
import { obtenerPresupuestos } from '@/repositories/presupuestoRepository';
import { Presupuesto, VentaComercio } from '@/types/database';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;
type SalesPeriod = 'month' | 'all';

export default function PresupuestoScreen() {
  const { user, isComercio } = useAuth();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [sales, setSales] = useState<VentaComercio[]>([]);
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('month');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) {
      setPresupuestos([]);
      setSales([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      if (isComercio) {
        setPresupuestos([]);
        setSales(user.id_comercio ? await obtenerVentasComercio(user.id_comercio) : []);
        return;
      }
      const result = await obtenerPresupuestos(user.id_usuario);
      setPresupuestos(result || []);
    } catch (error) {
      console.error('Error cargando presupuestos:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user, isComercio]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const activos = useMemo(() => presupuestos.filter((item) => item.pre_estado === 1), [presupuestos]);
  const presupuestoActual = activos[0];
  const currentMonthSales = useMemo(() => {
    const now = new Date();
    return sales.filter((sale) => {
      const date = new Date(sale.fecha_compra);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
  }, [sales]);
  const periodSales = salesPeriod === 'month' ? currentMonthSales : sales;
  const salesTotal = periodSales.reduce((sum, sale) => sum + sale.total, 0);
  const orderCount = periodSales.length;
  const unitsSold = periodSales.reduce(
    (sum, sale) => sum + sale.productos.reduce((lineSum, item) => lineSum + Number(item.cantidad), 0),
    0
  );
  const topProducts = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; total: number }>();
    for (const sale of periodSales) {
      for (const item of sale.productos) {
        const key = `${item.id_producto}:${item.nombre_producto}`;
        const aggregate = totals.get(key) ?? { name: item.nombre_producto, quantity: 0, total: 0 };
        aggregate.quantity += Number(item.cantidad);
        aggregate.total += item.subtotal;
        totals.set(key, aggregate);
      }
    }
    return [...totals.values()].sort((left, right) => right.quantity - left.quantity).slice(0, 5);
  }, [periodSales]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}><Ionicons name="wallet" size={23} color="#15803d" /></View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{isComercio ? 'Ventas del comercio' : 'Mi presupuesto'}</Text>
          <Text style={styles.subtitle}>{isComercio ? 'Ingresos reportados por compras registradas' : 'Lleva el control de tu mercado'}</Text>
        </View>
      </View>

      {!user ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="person-outline" size={27} color="#16a34a" /></View>
          <Text style={styles.cardTitle}>Inicia sesión para ver tu saldo</Text>
          <Text style={styles.bodyText}>Tu presupuesto personal estará disponible aquí cuando ingreses a tu cuenta.</Text>
          <Link href="/login" style={styles.loginLink}>Iniciar sesión</Link>
        </View>
      ) : loading ? (
        <View style={styles.emptyCard}><ActivityIndicator color="#16a34a" /><Text style={styles.bodyText}>{isComercio ? 'Cargando tus ventas…' : 'Cargando tu presupuesto…'}</Text></View>
      ) : loadError ? (
        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color="#dc2626" />
          <Text style={styles.cardTitle}>No pudimos cargar tu presupuesto</Text>
          <Text style={styles.bodyText}>Intenta de nuevo en un momento.</Text>
        </View>
      ) : isComercio ? (
        user.id_comercio == null ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="storefront-outline" size={28} color="#16a34a" /></View>
            <Text style={styles.cardTitle}>Tu cuenta no tiene un comercio asignado</Text>
            <Text style={styles.bodyText}>Contacta al administrador para vincular tu usuario a un comercio.</Text>
          </View>
        ) : (
          <>
            <View style={styles.salesPeriodRow}>
              <PeriodButton label="Este mes" selected={salesPeriod === 'month'} onPress={() => setSalesPeriod('month')} />
              <PeriodButton label="Todo el historial" selected={salesPeriod === 'all'} onPress={() => setSalesPeriod('all')} />
            </View>

            <View style={styles.salesHero}>
              <View style={styles.salesLabelRow}><Ionicons name="trending-up-outline" size={17} color="#dcfce7" /><Text style={styles.salesLabel}>INGRESOS REGISTRADOS</Text></View>
              <Text style={styles.salesAmount}>{currency(salesTotal)}</Text>
              <Text style={styles.salesCaption}>{salesPeriod === 'month' ? 'Durante el mes actual' : 'Acumulado de todo el historial'}</Text>
              <View style={styles.salesStatsRow}>
                <View style={styles.salesStat}><Text style={styles.salesStatValue}>{orderCount}</Text><Text style={styles.salesStatLabel}>Compras</Text></View>
                <View style={styles.salesStatDivider} />
                <View style={styles.salesStat}><Text style={styles.salesStatValue}>{unitsSold}</Text><Text style={styles.salesStatLabel}>Unidades</Text></View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}><Ionicons name="information-circle-outline" size={20} color="#a16207" /></View>
              <View style={styles.infoCopy}>
                <Text style={styles.salesInfoTitle}>Estimación, no utilidad neta</Text>
                <Text style={styles.salesInfoText}>Se calcula con productos que los usuarios marcaron como comprados y precios de referencia. No confirma pagos ni descuenta costos del comercio.</Text>
              </View>
            </View>

            <View style={styles.manageCatalogCard}>
              <View style={styles.catalogCardIcon}><Ionicons name="pricetag-outline" size={20} color="#166534" /></View>
              <View style={styles.catalogCardCopy}>
                <Text style={styles.catalogCardTitle}>Catálogo y precios</Text>
                <Text style={styles.catalogCardText}>Mantén actualizados tus productos para mejorar estas estimaciones.</Text>
              </View>
              <Link href="/productos" style={styles.catalogLink}>Gestionar</Link>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.salesSectionHeading}>
                <Text style={styles.salesSectionTitle}>Productos más comprados</Text>
                <Text style={styles.salesSectionSubtitle}>Según las compras reportadas</Text>
              </View>
              {topProducts.length === 0 ? (
                <Text style={styles.noSalesText}>Aún no hay compras asociadas a tu comercio.</Text>
              ) : topProducts.map((item, index) => (
                <View key={`${item.name}-${index}`}>
                  {index > 0 && <View style={styles.summaryDivider} />}
                  <View style={styles.topProductRow}>
                    <View style={styles.rankBadge}><Text style={styles.rankText}>{index + 1}</Text></View>
                    <Text numberOfLines={1} style={styles.topProductName}>{item.name}</Text>
                    <View style={styles.topProductNumbers}>
                      <Text style={styles.topProductQuantity}>{item.quantity} un.</Text>
                      <Text style={styles.topProductTotal}>{currency(item.total)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Compras recientes</Text>
            {periodSales.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}><Ionicons name="cart-outline" size={28} color="#16a34a" /></View>
                <Text style={styles.cardTitle}>Sin ventas en este periodo</Text>
                <Text style={styles.bodyText}>Cuando un usuario registre una compra de tus productos, aparecerá aquí.</Text>
              </View>
            ) : periodSales.slice(0, 10).map((sale) => (
              <View key={sale.id_compra} style={styles.saleRow}>
                <View style={styles.saleIcon}><Ionicons name="receipt-outline" size={18} color="#15803d" /></View>
                <View style={styles.saleCopy}>
                  <Text style={styles.saleName}>{sale.nombre_lista}</Text>
                  <Text style={styles.saleMeta}>{sale.numero_factura} · {new Date(sale.fecha_compra).toLocaleDateString('es-CO')}</Text>
                  <Text style={styles.saleMeta}>{sale.productos.length} {sale.productos.length === 1 ? 'producto' : 'productos'}</Text>
                </View>
                <Text style={styles.saleTotal}>{currency(sale.total)}</Text>
              </View>
            ))}
          </>
        )
      ) : presupuestoActual ? (
        <>
          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View style={styles.balanceLabelRow}><Ionicons name="wallet-outline" size={16} color="#dcfce7" /><Text style={styles.balanceLabel}>SALDO DISPONIBLE</Text></View>
              <View style={styles.activePill}><View style={styles.activeDot} /><Text style={styles.activeText}>Activo</Text></View>
            </View>
            <Text style={styles.balanceAmount}>{currency(presupuestoActual.monto)}</Text>
            <Text style={styles.balanceName}>{presupuestoActual.nombre}</Text>
            <View style={styles.balanceDivider} />
            <View style={styles.periodRow}>
              <View><Text style={styles.periodLabel}>Desde</Text><Text style={styles.periodValue}>{presupuestoActual.fecha_inicio}</Text></View>
              <Ionicons name="arrow-forward" size={17} color="#bbf7d0" />
              <View><Text style={styles.periodLabel}>Hasta</Text><Text style={styles.periodValue}>{presupuestoActual.fecha_fin}</Text></View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}><Ionicons name="information-circle-outline" size={20} color="#0369a1" /></View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Saldo según tu presupuesto</Text>
              <Text style={styles.infoText}>Todavía no registras gastos para este periodo. El saldo muestra el monto completo asignado.</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.summaryCard}>
            <SummaryRow icon="cash-outline" label="Monto asignado" value={currency(presupuestoActual.monto)} />
            <View style={styles.summaryDivider} />
            <SummaryRow icon="cart-outline" label="Gastos registrados" value={currency(0)} />
            <View style={styles.summaryDivider} />
            <SummaryRow icon="checkmark-circle-outline" label="Presupuestos activos" value={String(activos.length)} />
          </View>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="pie-chart-outline" size={28} color="#16a34a" /></View>
          <Text style={styles.cardTitle}>Aún no tienes un presupuesto activo</Text>
          <Text style={styles.bodyText}>Cuando configures un presupuesto, aquí podrás consultar el monto asignado y tu saldo disponible.</Text>
          <View style={styles.suggestion}><Ionicons name="bulb-outline" size={18} color="#b45309" /><Text style={styles.suggestionText}>Define un monto para organizar mejor tus compras del mercado.</Text></View>
        </View>
      )}

      <View style={styles.tipCard}>
        <Ionicons name="sparkles-outline" size={19} color="#15803d" />
        <Text style={styles.tipText}>Consejo: consulta los precios del catálogo y compáralos con el monto que quieres destinar a tu mercado.</Text>
      </View>
    </ScrollView>
  );
}

function PeriodButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.periodFilter, selected && styles.periodFilterActive]}>
      <Text style={[styles.periodFilterText, selected && styles.periodFilterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={19} color="#16a34a" />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 18, paddingTop: 24, paddingBottom: 32, gap: 15, width: '100%', maxWidth: 760, alignSelf: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  headingIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1 },
  title: { color: '#14532d', fontSize: 23, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 3 },
  balanceCard: { backgroundColor: '#15803d', borderRadius: 22, padding: 20, boxShadow: '0px 5px 14px rgba(21, 128, 61, 0.18)' },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  balanceLabel: { color: '#dcfce7', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  activeDot: { width: 6, height: 6, backgroundColor: '#86efac', borderRadius: 3 },
  activeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  balanceAmount: { color: '#ffffff', fontSize: 34, fontWeight: '800', marginTop: 17 },
  balanceName: { color: '#dcfce7', fontSize: 13, marginTop: 3 },
  balanceDivider: { height: 1, backgroundColor: 'rgba(220,252,231,0.25)', marginVertical: 17 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  periodLabel: { color: '#bbf7d0', fontSize: 10, marginBottom: 3 },
  periodValue: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14 },
  infoIcon: { marginTop: 1 },
  infoCopy: { flex: 1, gap: 3 },
  infoTitle: { color: '#1e3a8a', fontSize: 12, fontWeight: '800' },
  infoText: { color: '#1e40af', fontSize: 11, lineHeight: 16 },
  sectionTitle: { color: '#14532d', fontSize: 17, fontWeight: '800', marginTop: 3, marginBottom: -7 },
  summaryCard: { backgroundColor: '#ffffff', paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: '#dcfce7' },
  summaryRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryLabel: { flex: 1, color: '#475569', fontSize: 13 },
  summaryValue: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  summaryDivider: { height: 1, backgroundColor: '#f1f5f9' },
  salesPeriodRow: { flexDirection: 'row', gap: 8 },
  periodFilter: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  periodFilterActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  periodFilterText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  periodFilterTextActive: { color: '#166534', fontWeight: '800' },
  salesHero: { backgroundColor: '#15803d', borderRadius: 22, padding: 20, boxShadow: '0px 5px 14px rgba(21, 128, 61, 0.18)' },
  salesLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  salesLabel: { color: '#dcfce7', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  salesAmount: { color: '#ffffff', fontSize: 32, fontWeight: '800', marginTop: 16 },
  salesCaption: { color: '#dcfce7', fontSize: 11, marginTop: 3 },
  salesStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(220,252,231,0.25)' },
  salesStat: { minWidth: 72, gap: 3 },
  salesStatValue: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  salesStatLabel: { color: '#bbf7d0', fontSize: 10 },
  salesStatDivider: { width: 1, height: 31, backgroundColor: 'rgba(220,252,231,0.35)' },
  salesInfoTitle: { color: '#854d0e', fontSize: 12, fontWeight: '800' },
  salesInfoText: { color: '#854d0e', fontSize: 11, lineHeight: 16 },
  manageCatalogCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dcfce7', borderRadius: 15 },
  catalogCardIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#dcfce7' },
  catalogCardCopy: { flex: 1, gap: 3 },
  catalogCardTitle: { color: '#14532d', fontSize: 12, fontWeight: '800' },
  catalogCardText: { color: '#64748b', fontSize: 10, lineHeight: 14 },
  catalogLink: { color: '#ffffff', backgroundColor: '#16a34a', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, fontSize: 10, fontWeight: '700' },
  salesSectionHeading: { paddingVertical: 13 },
  salesSectionTitle: { color: '#14532d', fontSize: 14, fontWeight: '800' },
  salesSectionSubtitle: { color: '#64748b', fontSize: 10, marginTop: 3 },
  noSalesText: { color: '#64748b', fontSize: 11, paddingVertical: 16, textAlign: 'center' },
  topProductRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 9 },
  rankBadge: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#dcfce7' },
  rankText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  topProductName: { flex: 1, color: '#334155', fontSize: 11, fontWeight: '600' },
  topProductNumbers: { alignItems: 'flex-end', gap: 2 },
  topProductQuantity: { color: '#64748b', fontSize: 9 },
  topProductTotal: { color: '#14532d', fontSize: 10, fontWeight: '800' },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14 },
  saleIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#dcfce7' },
  saleCopy: { flex: 1, gap: 3 },
  saleName: { color: '#1e293b', fontSize: 11, fontWeight: '800' },
  saleMeta: { color: '#64748b', fontSize: 9 },
  saleTotal: { color: '#14532d', fontSize: 11, fontWeight: '800' },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#dcfce7', gap: 10 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#14532d', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  bodyText: { color: '#64748b', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  loginLink: { color: '#ffffff', backgroundColor: '#16a34a', overflow: 'hidden', borderRadius: 12, paddingHorizontal: 17, paddingVertical: 11, fontSize: 13, fontWeight: '700', marginTop: 3 },
  suggestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fffbeb', borderRadius: 12, padding: 11, marginTop: 4 },
  suggestionText: { flex: 1, color: '#854d0e', fontSize: 11, lineHeight: 16 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#dcfce7', borderRadius: 14, padding: 13 },
  tipText: { flex: 1, color: '#166534', fontSize: 12, lineHeight: 18 },
});
