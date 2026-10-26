import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { obtenerPresupuestos } from '@/repositories/presupuestoRepository';
import { Presupuesto } from '@/types/database';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;

export default function PresupuestoScreen() {
  const { user } = useAuth();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) {
      setPresupuestos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const result = await obtenerPresupuestos(user.id_usuario);
      setPresupuestos(result || []);
    } catch (error) {
      console.error('Error cargando presupuestos:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void cargar(); }, [cargar]);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const activos = useMemo(() => presupuestos.filter((item) => item.pre_estado === 1), [presupuestos]);
  const presupuestoActual = activos[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}><Ionicons name="wallet" size={23} color="#15803d" /></View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Mi presupuesto</Text>
          <Text style={styles.subtitle}>Lleva el control de tu mercado</Text>
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
        <View style={styles.emptyCard}><ActivityIndicator color="#16a34a" /><Text style={styles.bodyText}>Cargando tu presupuesto…</Text></View>
      ) : loadError ? (
        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color="#dc2626" />
          <Text style={styles.cardTitle}>No pudimos cargar tu presupuesto</Text>
          <Text style={styles.bodyText}>Intenta de nuevo en un momento.</Text>
        </View>
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
