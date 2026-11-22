import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BotonLecturaVoz } from '@/components/boton-lectura-voz';
import { useAuth } from '@/contexts/auth-context';
import { getDatabase } from '@/database/database';
import { obtenerCompras } from '@/repositories/compraRepository';
import {
  calcularAhorroMensualEstimado,
  PrecioCatalogo,
  ResumenAhorroMensual,
} from '@/utils/monthly-savings';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;

function localMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [year, value] = month.split('-').map(Number);
  return new Date(year, value - 1, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
}

export default function AhorroMensualScreen() {
  const { user } = useAuth();
  const [resumen, setResumen] = useState<ResumenAhorroMensual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const mes = localMonth();

  const cargar = useCallback(async () => {
    if (!user) {
      setResumen(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      const db = await getDatabase();
      const [compras, preciosActuales, comercios] = await Promise.all([
        obtenerCompras(user.id_usuario),
        db.getAllAsync<{ id_producto: number; id_comercio: number; precio: number; disponible: number }>(
          'SELECT id_producto, id_comercio, precio, disponible FROM precios WHERE disponible = 1'
        ),
        db.getAllAsync<{ id_comercio: number; nombre: string }>(
          'SELECT id_comercio, nombre FROM comercios'
        ),
      ]);
      const nombrePorComercio = new Map(
        comercios.map((comercio) => [Number(comercio.id_comercio), comercio.nombre])
      );
      const catalogo: PrecioCatalogo[] = preciosActuales
        .filter((precio) => Number(precio.disponible) === 1)
        .map((precio) => ({
          id_producto: Number(precio.id_producto),
          id_comercio: Number(precio.id_comercio),
          precio: Number(precio.precio),
          nombre_comercio: nombrePorComercio.get(Number(precio.id_comercio)) ?? 'Comercio no identificado',
        }));
      setResumen(calcularAhorroMensualEstimado(compras, catalogo, mes));
    } catch (loadError) {
      console.error('No se pudo calcular el informe mensual:', loadError);
      setError('No pudimos calcular el informe. Intenta de nuevo más tarde.');
    } finally {
      setCargando(false);
    }
  }, [mes, user]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="trending-down-outline" size={34} color="#166534" />
        <Text style={styles.title} accessibilityRole="header">Informe mensual</Text>
        <Text style={styles.body}>Inicia sesión para consultar las compras guardadas en este dispositivo.</Text>
        <Link href="/login" style={styles.backLink} accessibilityRole="link">Iniciar sesión</Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Link href="/presupuesto" style={styles.backButton} accessibilityRole="link" accessibilityLabel="Volver al presupuesto">
          <Ionicons name="arrow-back" size={20} color="#166534" />
        </Link>
        <View style={styles.headerCopy}>
          <Text style={styles.title} accessibilityRole="header">Informe mensual</Text>
          <Text style={styles.body}>{monthLabel(mes)}</Text>
        </View>
      </View>

      {cargando ? (
        <View style={styles.card} accessibilityLiveRegion="polite">
          <ActivityIndicator color="#168344" accessibilityLabel="Calculando informe mensual" />
          <Text style={styles.body}>Revisando compras y precios del catálogo…</Text>
        </View>
      ) : error ? (
        <View style={styles.card}>
          <Text style={styles.error} accessibilityRole="alert">{error}</Text>
        </View>
      ) : resumen ? (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}><Ionicons name="trending-down" size={22} color="#166534" /></View>
            <Text style={styles.summaryLabel}>Ahorro potencial estimado</Text>
            <Text style={styles.amount}>{currency(resumen.montoEstimado)}</Text>
            <Text style={styles.summaryCaption}>
              Comparación de {resumen.productosComparados} productos de {resumen.comprasDelMes} compras de este mes.
            </Text>
            <BotonLecturaVoz
              texto={`El ahorro potencial estimado para ${monthLabel(mes)} es de ${resumen.montoEstimado} pesos, comparando ${resumen.productosComparados} productos.`}
              etiqueta="Escuchar informe"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Comercios asociados a los precios de referencia</Text>
            {resumen.referencias.length === 0 ? (
              <Text style={styles.body}>Aún no hay suficientes precios comparables para estimar una diferencia. Se necesitan precios del mismo producto en al menos dos comercios.</Text>
            ) : resumen.referencias.slice(0, 5).map((referencia) => (
              <View key={referencia.tienda} style={styles.storeRow}>
                <View style={styles.storeIcon}><Ionicons name="storefront-outline" size={18} color="#166534" /></View>
                <Text style={styles.storeName}>{referencia.tienda}</Text>
                <Text style={styles.storeAmount}>{currency(referencia.montoEstimado)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.disclaimerCard}>
            <Ionicons name="information-circle-outline" size={20} color="#854d0e" />
            <Text style={styles.disclaimer}>
              Es una comparación orientativa: usa el precio guardado en cada compra y los precios actuales reportados en el catálogo. Las compras y los descuentos de la app son demostrativos; este valor no confirma cuánto pagaste ni un ahorro real. No se cuentan descuentos promocionales de demostración.
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6' },
  content: { padding: 18, paddingBottom: 36, gap: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 28, backgroundColor: '#f7f8f6' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f4e9' },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: '#14532d', fontSize: 21, fontWeight: '800' },
  body: { color: '#475569', fontSize: 13, lineHeight: 19 },
  backLink: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#eaf6eb', color: '#166534', fontWeight: '700' },
  summaryCard: { alignItems: 'flex-start', gap: 9, padding: 18, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d8e5d8' },
  summaryIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#eaf6eb' },
  summaryLabel: { color: '#334155', fontSize: 13, fontWeight: '700' },
  amount: { color: '#14532d', fontSize: 30, fontWeight: '900' },
  summaryCaption: { color: '#475569', fontSize: 12, lineHeight: 18 },
  card: { gap: 11, padding: 16, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { color: '#1e293b', fontSize: 15, fontWeight: '800' },
  storeRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 7 },
  storeIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#eaf6eb' },
  storeName: { flex: 1, color: '#334155', fontSize: 12, fontWeight: '700' },
  storeAmount: { color: '#166534', fontSize: 12, fontWeight: '800' },
  disclaimerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: 15, backgroundColor: '#fef3c7' },
  disclaimer: { flex: 1, color: '#713f12', fontSize: 11, lineHeight: 17 },
  error: { color: '#991b1b', fontSize: 13, lineHeight: 19 },
});
