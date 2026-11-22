import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { crearDeudaTienda, marcarDeudaTiendaPagada, obtenerDeudasTienda } from '@/repositories/deudaTiendaRepository';
import { DeudaTienda } from '@/types/database';

const money = (value: number) => `$${Number(value).toLocaleString('es-CO')}`;

function localDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseAmount(value: string): number {
  return Number(value.replace(/\D/g, ''));
}

export default function DeudasTiendaScreen() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<DeudaTienda[]>([]);
  const [store, setStore] = useState('');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDebts = useCallback(async () => {
    if (!user) {
      setDebts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setDebts(await obtenerDeudasTienda(user.id_usuario));
    } catch (loadError) {
      console.error('No se pudieron cargar las deudas:', loadError);
      setError('No pudimos cargar tus deudas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void loadDebts(); }, [loadDebts]));

  const saveDebt = async () => {
    const parsedAmount = parseAmount(amount);
    if (!user || saving) return;
    setSaving(true);
    setError('');
    try {
      await crearDeudaTienda(user.id_usuario, store, concept, parsedAmount, localDate());
      setStore('');
      setConcept('');
      setAmount('');
      await loadDebts();
    } catch (saveError) {
      console.error('No se pudo registrar la deuda:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No se pudo registrar la deuda.');
    } finally {
      setSaving(false);
    }
  };

  const payDebt = async (debt: DeudaTienda) => {
    if (!user || saving) return;
    setSaving(true);
    setError('');
    try {
      await marcarDeudaTiendaPagada(debt.id_deuda, user.id_usuario);
      await loadDebts();
    } catch (payError) {
      console.error('No se pudo marcar la deuda como pagada:', payError);
      setError(payError instanceof Error ? payError.message : 'No se pudo actualizar la deuda.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="receipt-outline" size={34} color="#168344" />
        <Text style={styles.title}>Fiado y deudas de tienda</Text>
        <Text style={styles.muted}>Inicia sesión para guardar tus deudas en este dispositivo.</Text>
        <Link href="/login" style={styles.primaryButton}>Iniciar sesión</Link>
      </View>
    );
  }

  const outstanding = debts.filter((debt) => Number(debt.pagada) === 0);
  const totalOwed = outstanding.reduce((sum, debt) => sum + Number(debt.monto), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Link href="/presupuesto" style={styles.backButton} accessibilityRole="link" accessibilityLabel="Volver al presupuesto">
          <Ionicons name="arrow-back" size={20} color="#166534" />
        </Link>
        <View style={styles.headerCopy}>
          <Text style={styles.title} accessibilityRole="header">Fiado y deudas</Text>
          <Text style={styles.muted}>Anota lo que debes en cada tienda</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>DEUDA PENDIENTE REGISTRADA</Text>
        <Text style={styles.summaryAmount}>{money(totalOwed)}</Text>
        <Text style={styles.summaryHint}>{outstanding.length} {outstanding.length === 1 ? 'deuda pendiente' : 'deudas pendientes'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Registrar fiado</Text>
        <Text style={styles.fieldLabel}>Tienda o mercado</Text>
        <TextInput value={store} onChangeText={setStore} style={styles.input} placeholder="Ej. Tienda de Don José" maxLength={70} accessibilityLabel="Nombre de la tienda" />
        <Text style={styles.fieldLabel}>¿Qué compraste?</Text>
        <TextInput value={concept} onChangeText={setConcept} style={styles.input} placeholder="Ej. Mercado de la semana" maxLength={100} accessibilityLabel="Concepto de la deuda" />
        <Text style={styles.fieldLabel}>Monto pendiente (COP)</Text>
        <TextInput value={amount} onChangeText={setAmount} style={styles.input} placeholder="Ej. 25000" keyboardType="numeric" maxLength={14} accessibilityLabel="Monto de la deuda en pesos colombianos" />
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <Pressable onPress={() => void saveDebt()} disabled={saving} style={[styles.primaryButton, saving && styles.disabled]} accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }}>
          {saving ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="add" size={18} color="#ffffff" />}
          <Text style={styles.primaryButtonText}>{saving ? 'Guardando…' : 'Guardar deuda'}</Text>
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Tus registros</Text>
        <Text style={styles.muted}>{debts.length} {debts.length === 1 ? 'registro' : 'registros'}</Text>
      </View>
      {loading ? (
        <View style={styles.emptyCard}><ActivityIndicator color="#168344" /><Text style={styles.muted}>Cargando deudas…</Text></View>
      ) : error && debts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.error} accessibilityRole="alert">{error}</Text>
          <Pressable onPress={() => void loadDebts()}><Text style={styles.retry}>Intentar de nuevo</Text></Pressable>
        </View>
      ) : debts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={28} color="#168344" />
          <Text style={styles.emptyTitle}>No tienes deudas registradas</Text>
          <Text style={styles.muted}>Cuando compres fiado, anótalo aquí para tenerlo presente.</Text>
        </View>
      ) : debts.map((debt) => {
        const paid = Number(debt.pagada) === 1;
        return (
          <View key={debt.id_deuda} style={styles.debtRow}>
            <View style={[styles.debtIcon, paid && styles.paidIcon]}>
              <Ionicons name={paid ? 'checkmark' : 'storefront-outline'} size={18} color={paid ? '#15803d' : '#b45309'} />
            </View>
            <View style={styles.debtCopy}>
              <Text style={styles.debtStore}>{debt.tienda}</Text>
              <Text style={styles.debtMeta}>{debt.concepto} · {debt.fecha}</Text>
              <Text style={[styles.debtAmount, paid && styles.paidText]}>{money(Number(debt.monto))}{paid ? ' · Pagada' : ''}</Text>
            </View>
            {!paid ? (
              <Pressable onPress={() => void payDebt(debt)} disabled={saving} style={styles.paidButton} accessibilityRole="button" accessibilityLabel={`Marcar deuda de ${debt.tienda} como pagada`}>
                <Text style={styles.paidButtonText}>Pagada</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}

      <Text style={styles.privacyNote}>Los registros se guardan en este dispositivo.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9f6' },
  content: { padding: 18, paddingBottom: 36, gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28, backgroundColor: '#f7f9f6' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 3 },
  backButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#eaf5e9', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: '#193d27', fontSize: 20, fontWeight: '800' },
  muted: { color: '#718076', fontSize: 12, lineHeight: 18 },
  summaryCard: { backgroundColor: '#14532d', borderRadius: 18, padding: 17, gap: 5 },
  summaryLabel: { color: '#dcfce7', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  summaryAmount: { color: '#ffffff', fontSize: 26, fontWeight: '900' },
  summaryHint: { color: '#bbf7d0', fontSize: 11 },
  card: { padding: 16, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7', gap: 9 },
  sectionTitle: { color: '#193d27', fontSize: 15, fontWeight: '800' },
  fieldLabel: { color: '#365e3e', fontSize: 11, fontWeight: '700', marginTop: 3 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#dce5dc', borderRadius: 12, paddingHorizontal: 13, color: '#193d27', backgroundColor: '#ffffff', fontSize: 14 },
  primaryButton: { minHeight: 46, borderRadius: 13, backgroundColor: '#168344', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, paddingHorizontal: 16, marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  error: { color: '#b91c1c', fontSize: 12, lineHeight: 18 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  emptyCard: { minHeight: 110, backgroundColor: '#ffffff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  emptyTitle: { color: '#193d27', fontWeight: '800', fontSize: 14 },
  retry: { color: '#168344', fontWeight: '800', padding: 8 },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 15, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  debtIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  paidIcon: { backgroundColor: '#eaf5e9' },
  debtCopy: { flex: 1, gap: 3 },
  debtStore: { color: '#193d27', fontSize: 13, fontWeight: '800' },
  debtMeta: { color: '#718076', fontSize: 10 },
  debtAmount: { color: '#b45309', fontSize: 12, fontWeight: '800' },
  paidText: { color: '#15803d' },
  paidButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eaf5e9' },
  paidButtonText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  privacyNote: { color: '#718076', fontSize: 10, textAlign: 'center', marginTop: 4 },
});
