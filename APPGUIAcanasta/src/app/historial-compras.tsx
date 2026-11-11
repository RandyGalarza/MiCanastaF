import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { obtenerCompras } from '@/repositories/compraRepository';
import { Compra } from '@/types/database';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;
const formatDate = (value: string) => new Date(value).toLocaleString('es-CO');

export default function HistorialComprasScreen() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPurchases = useCallback(async () => {
    if (!user) {
      setPurchases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setPurchases(await obtenerCompras(user.id_usuario));
    } catch (err) {
      console.error('No se pudo cargar el historial de compras:', err);
      setError('No se pudo cargar tu historial. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void loadPurchases(); }, [loadPurchases]));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/lista-compra')}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver a la lista"
          accessibilityHint="Regresa a tus listas de compra"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color="#166534" />
        </Pressable>
        <View style={styles.headerIcon}><Ionicons name="receipt" size={23} color="#15803d" /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title} accessibilityRole="header">Historial de compras</Text>
          <Text style={styles.subtitle}>Consulta tus compras y facturas</Text>
        </View>
      </View>

      {!user ? (
        <View style={styles.stateCard}>
          <Ionicons name="person-outline" size={30} color="#16a34a" />
          <Text style={styles.cardTitle} accessibilityRole="header">Inicia sesión para ver tu historial</Text>
          <Text style={styles.bodyText}>Tus compras guardadas aparecerán aquí.</Text>
          <Link href="/login" style={styles.loginButton}>Iniciar sesión</Link>
        </View>
      ) : loading ? (
        <View style={styles.stateCard} accessibilityLiveRegion="polite">
          <ActivityIndicator color="#16a34a" accessibilityLabel="Cargando compras" />
          <Text style={styles.bodyText}>Cargando compras…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={29} color="#dc2626" />
          <Text style={styles.cardTitle} accessibilityRole="header">No pudimos abrir tu historial</Text>
          <Text style={styles.bodyText} accessibilityRole="alert">{error}</Text>
          <Pressable
            onPress={() => void loadPurchases()}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Volver a cargar el historial"
            accessibilityHint="Intenta cargar tus compras nuevamente"
          >
            <Text style={styles.retryText}>Intentar de nuevo</Text>
          </Pressable>
        </View>
      ) : purchases.length === 0 ? (
        <View style={styles.stateCard}>
          <View style={styles.emptyIcon}><Ionicons name="cart-outline" size={28} color="#16a34a" /></View>
          <Text style={styles.cardTitle} accessibilityRole="header">Todavía no tienes compras</Text>
          <Text style={styles.bodyText}>Marca los productos comprados en una lista y registra tu primera compra para crear una factura.</Text>
          <Pressable onPress={() => router.push('/lista-compra')} style={styles.primaryButton} accessibilityRole="button" accessibilityLabel="Ir a mis listas de compra">
            <Text style={styles.primaryButtonText}>Ir a mis listas</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.purchaseList}>
          {purchases.map((purchase) => (
            <Pressable
              key={purchase.id_compra}
              onPress={() => router.push({ pathname: '/factura/[id]', params: { id: String(purchase.id_compra) } })}
              style={({ pressed }) => [styles.purchaseCard, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Abrir factura ${purchase.numero_factura}, ${purchase.nombre_lista}, total ${currency(purchase.total)}`}
              accessibilityHint="Abre el detalle y las opciones de la factura">
              <View style={styles.purchaseIcon}><Ionicons name="receipt-outline" size={20} color="#15803d" /></View>
              <View style={styles.purchaseCopy}>
                <Text style={styles.purchaseTitle} numberOfLines={1}>{purchase.nombre_lista}</Text>
                <Text style={styles.purchaseMeta}>{purchase.numero_factura} · {formatDate(purchase.fecha_compra)}</Text>
                <Text style={styles.purchaseItems}>{purchase.detalles.length} {purchase.detalles.length === 1 ? 'producto' : 'productos'} · Descuento {currency(purchase.descuento)}</Text>
              </View>
              <View style={styles.purchaseTotal}>
                <Text style={styles.total}>{currency(purchase.total)}</Text>
                <Ionicons name="chevron-forward" size={17} color="#64748b" />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6' },
  content: { padding: 18, paddingTop: 24, paddingBottom: 36, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { color: '#14532d', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 11, marginTop: 3 },
  stateCard: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 22, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  emptyIcon: { width: 55, height: 55, borderRadius: 19, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#14532d', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  bodyText: { color: '#64748b', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  loginButton: { color: '#ffffff', backgroundColor: '#16a34a', paddingHorizontal: 17, paddingVertical: 11, borderRadius: 12, overflow: 'hidden', fontSize: 13, fontWeight: '700', marginTop: 3 },
  primaryButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#16a34a', marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11, backgroundColor: '#dcfce7' },
  retryText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  purchaseList: { gap: 10 },
  purchaseCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 15, borderRadius: 19, borderWidth: 1, borderColor: '#e7ece7', backgroundColor: '#ffffff' },
  purchaseIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  purchaseCopy: { flex: 1, gap: 4 },
  purchaseTitle: { color: '#1e293b', fontSize: 13, fontWeight: '800' },
  purchaseMeta: { color: '#64748b', fontSize: 10 },
  purchaseItems: { color: '#15803d', fontSize: 10, fontWeight: '600' },
  purchaseTotal: { alignItems: 'flex-end', gap: 4 },
  total: { color: '#14532d', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
