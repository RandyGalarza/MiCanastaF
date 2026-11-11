import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import {
  crearMovimientoHogar,
  eliminarMovimientoHogar,
  obtenerMovimientosHogar,
} from '@/repositories/movimientoHogarRepository';
import { MovimientoHogar, TipoMovimientoHogar } from '@/types/database';

const CATEGORIAS: Record<TipoMovimientoHogar, string[]> = {
  ingreso: ['Salario', 'Ventas', 'Apoyo familiar', 'Otros ingresos'],
  gasto: ['Servicios', 'Vivienda', 'Transporte', 'Salud', 'Educación', 'Otros gastos'],
};

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;

function localDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseAmount(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.').trim());
}

export default function MovimientosScreen() {
  const { user } = useAuth();
  const [movimientos, setMovimientos] = useState<MovimientoHogar[]>([]);
  const [tipo, setTipo] = useState<TipoMovimientoHogar>('gasto');
  const [categoria, setCategoria] = useState(CATEGORIAS.gasto[0]);
  const [concepto, setConcepto] = useState('');
  const [montoTexto, setMontoTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [movimientoAEliminar, setMovimientoAEliminar] = useState<MovimientoHogar | null>(null);

  const cargarMovimientos = useCallback(async () => {
    if (!user) {
      setMovimientos([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      setMovimientos(await obtenerMovimientosHogar(user.id_usuario));
    } catch (loadError) {
      console.error('No se pudieron cargar los movimientos del hogar:', loadError);
      setError('No pudimos cargar tus movimientos. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void cargarMovimientos(); }, [cargarMovimientos]));

  const mesActual = localDate().slice(0, 7);
  const movimientosDelMes = useMemo(
    () => movimientos.filter((item) => item.fecha.startsWith(mesActual)),
    [mesActual, movimientos]
  );
  const ingresos = movimientosDelMes
    .filter((item) => item.tipo === 'ingreso')
    .reduce((sum, item) => sum + Number(item.monto), 0);
  const gastos = movimientosDelMes
    .filter((item) => item.tipo === 'gasto')
    .reduce((sum, item) => sum + Number(item.monto), 0);

  const cambiarTipo = (nuevoTipo: TipoMovimientoHogar) => {
    setTipo(nuevoTipo);
    setCategoria(CATEGORIAS[nuevoTipo][0]);
  };

  const guardarMovimiento = async () => {
    if (!user || guardando) return;
    const nombre = concepto.trim();
    const monto = parseAmount(montoTexto);
    if (!nombre) {
      setError('Escribe un concepto para el movimiento.');
      return;
    }
    if (!Number.isSafeInteger(monto) || monto <= 0) {
      setError('Ingresa un monto entero en pesos, mayor que cero.');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      await crearMovimientoHogar(user.id_usuario, tipo, nombre, categoria, monto, localDate());
      setConcepto('');
      setMontoTexto('');
      await cargarMovimientos();
    } catch (saveError) {
      console.error('No se pudo guardar el movimiento:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No pudimos guardar el movimiento.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!user || !movimientoAEliminar || guardando) return;
    setGuardando(true);
    setError('');
    try {
      await eliminarMovimientoHogar(movimientoAEliminar.id_movimiento_hogar, user.id_usuario);
      setMovimientoAEliminar(null);
      await cargarMovimientos();
    } catch (deleteError) {
      console.error('No se pudo eliminar el movimiento:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'No pudimos eliminar el movimiento.');
    } finally {
      setGuardando(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <View style={styles.heroIcon}><Ionicons name="wallet-outline" size={27} color="#168344" /></View>
        <Text style={styles.title} accessibilityRole="header">Ingresos y gastos del hogar</Text>
        <Text style={styles.muted}>Inicia sesión para guardar y consultar tus movimientos en este dispositivo.</Text>
        <Link href="/login" style={styles.primaryLink} accessibilityRole="link" accessibilityLabel="Iniciar sesión para ver los movimientos">Iniciar sesión</Link>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Link href="/presupuesto" style={styles.backButton} accessibilityRole="link" accessibilityLabel="Volver al presupuesto" accessibilityHint="Regresa a tu resumen de presupuesto">
            <Ionicons name="arrow-back" size={20} color="#166534" />
          </Link>
          <View style={styles.headerCopy}>
            <Text style={styles.title} accessibilityRole="header">Ingresos y gastos</Text>
            <Text style={styles.muted}>Organiza los movimientos de tu hogar</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Ingresos del mes" amount={ingresos} icon="arrow-down-circle-outline" color="#15803d" />
          <SummaryCard label="Gastos del mes" amount={gastos} icon="arrow-up-circle-outline" color="#b91c1c" />
        </View>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>BALANCE DEL MES</Text>
          <Text style={styles.balanceAmount}>{currency(ingresos - gastos)}</Text>
          <Text style={styles.balanceHint}>Ingresos registrados menos gastos registrados</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Registrar movimiento</Text>
          <View style={styles.typeRow}>
            <TypeButton selected={tipo === 'gasto'} label="Gasto" icon="arrow-up" color="#b91c1c" onPress={() => cambiarTipo('gasto')} />
            <TypeButton selected={tipo === 'ingreso'} label="Ingreso" icon="arrow-down" color="#15803d" onPress={() => cambiarTipo('ingreso')} />
          </View>

          <Text style={styles.fieldLabel}>Concepto</Text>
          <TextInput
            value={concepto}
            onChangeText={setConcepto}
            placeholder={tipo === 'gasto' ? 'Ej. Recibo de energía' : 'Ej. Pago quincenal'}
            placeholderTextColor="#94a3b8"
            style={styles.input}
            maxLength={80}
            returnKeyType="next"
            accessibilityLabel="Concepto del movimiento"
            accessibilityHint="Describe el ingreso o gasto"
          />

          <Text style={styles.fieldLabel}>Monto en pesos</Text>
          <TextInput
            value={montoTexto}
            onChangeText={setMontoTexto}
            placeholder="Ej. 150000"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="numeric"
            maxLength={14}
            accessibilityLabel="Monto en pesos colombianos"
            accessibilityHint="Ingresa un monto entero mayor que cero"
          />

          <Text style={styles.fieldLabel}>Categoría</Text>
          <View style={styles.categoryRow}>
            {CATEGORIAS[tipo].map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategoria(item)}
                accessibilityRole="button"
                accessibilityLabel={`Categoría ${item}`}
                accessibilityState={{ selected: categoria === item }}
                style={[styles.categoryChip, categoria === item && styles.categoryChipSelected]}
              >
                <Text style={[styles.categoryText, categoria === item && styles.categoryTextSelected]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
          <Pressable
            onPress={() => void guardarMovimiento()}
            disabled={guardando}
            style={[styles.saveButton, guardando && styles.disabledButton]}
            accessibilityRole="button"
            accessibilityLabel={guardando ? 'Guardando movimiento' : 'Guardar movimiento'}
            accessibilityState={{ disabled: guardando, busy: guardando }}
          >
            {guardando ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="add" size={19} color="#ffffff" />}
            <Text style={styles.saveButtonText}>{guardando ? 'Guardando…' : 'Guardar movimiento'}</Text>
          </Pressable>
        </View>

        <View style={styles.listHeading}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Historial</Text>
          <Text style={styles.muted}>{movimientos.length} {movimientos.length === 1 ? 'registro' : 'registros'}</Text>
        </View>
        {cargando ? (
          <View style={styles.emptyCard} accessibilityLiveRegion="polite"><ActivityIndicator color="#168344" accessibilityLabel="Cargando movimientos" /><Text style={styles.muted}>Cargando movimientos…</Text></View>
        ) : error && movimientos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
            <Pressable onPress={() => void cargarMovimientos()} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Volver a cargar movimientos">
              <Text style={styles.retryText}>Intentar de nuevo</Text>
            </Pressable>
          </View>
        ) : movimientos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={25} color="#168344" />
            <Text style={styles.emptyTitle} accessibilityRole="header">Aún no tienes movimientos</Text>
            <Text style={styles.muted}>Registra un ingreso o un gasto para empezar a organizar tus finanzas.</Text>
          </View>
        ) : movimientos.map((item) => (
          <View key={item.id_movimiento_hogar} style={styles.movementRow}>
            <View style={[styles.movementIcon, item.tipo === 'ingreso' ? styles.incomeIcon : styles.expenseIcon]}>
              <Ionicons
                name={item.tipo === 'ingreso' ? 'arrow-down' : 'arrow-up'}
                size={17}
                color={item.tipo === 'ingreso' ? '#15803d' : '#b91c1c'}
              />
            </View>
            <View style={styles.movementCopy}>
              <Text numberOfLines={1} style={styles.movementConcept}>{item.concepto}</Text>
              <Text style={styles.movementMeta}>{item.categoria} · {item.fecha}</Text>
            </View>
            <View style={styles.movementAmountWrap}>
              <Text style={[styles.movementAmount, item.tipo === 'ingreso' ? styles.incomeText : styles.expenseText]}>
                {item.tipo === 'ingreso' ? '+' : '−'}{currency(item.monto)}
              </Text>
              <Pressable
                onPress={() => setMovimientoAEliminar(item)}
                style={styles.deleteButton}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item.concepto}`}
                accessibilityHint="Abre la confirmación para eliminar este movimiento"
                hitSlop={6}
              >
                <Ionicons name="trash-outline" size={17} color="#64748b" />
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.privacyNote}>
          <Ionicons name="phone-portrait-outline" size={16} color="#475569" />
          <Text style={styles.privacyText}>Estos movimientos se guardan solo en este dispositivo y no se sincronizan con Supabase.</Text>
        </View>
      </ScrollView>

      <Modal
        visible={movimientoAEliminar !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMovimientoAEliminar(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard} accessibilityViewIsModal>
            <Text style={styles.confirmTitle} accessibilityRole="header">¿Eliminar movimiento?</Text>
            <Text style={styles.muted}>Se eliminará “{movimientoAEliminar?.concepto}”. Esta acción no se puede deshacer.</Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={() => setMovimientoAEliminar(null)} style={styles.cancelButton} accessibilityRole="button" accessibilityLabel="Cancelar eliminación">
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={() => void confirmarEliminacion()} style={styles.deleteConfirmButton} accessibilityRole="button" accessibilityLabel={guardando ? 'Eliminando movimiento' : 'Confirmar eliminación'} accessibilityState={{ disabled: guardando, busy: guardando }}>
                <Text style={styles.deleteConfirmText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SummaryCard({ label, amount, icon, color }: { label: string; amount: number; icon: 'arrow-down-circle-outline' | 'arrow-up-circle-outline'; color: string }) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={[styles.summaryAmount, { color }]}>{currency(amount)}</Text>
    </View>
  );
}

function TypeButton({ selected, label, icon, color, onPress }: { selected: boolean; label: string; icon: 'arrow-up' | 'arrow-down'; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.typeButton, selected && { borderColor: color, backgroundColor: `${color}0d` }]}
    >
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[styles.typeButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6' },
  content: { padding: 18, paddingBottom: 36, gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12, backgroundColor: '#f7f8f6' },
  heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 3 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f4e9' },
  headerCopy: { flex: 1 },
  title: { color: '#14532d', fontSize: 21, fontWeight: '800' },
  muted: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, minWidth: 0, backgroundColor: '#ffffff', borderRadius: 17, padding: 14, borderWidth: 1, borderColor: '#e7ece7', gap: 5 },
  summaryLabel: { color: '#64748b', fontSize: 11 },
  summaryAmount: { fontSize: 17, fontWeight: '800' },
  balanceCard: { borderRadius: 20, padding: 18, backgroundColor: '#166534', gap: 4 },
  balanceLabel: { color: '#bbf7d0', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  balanceAmount: { color: '#ffffff', fontSize: 25, fontWeight: '800' },
  balanceHint: { color: '#dcfce7', fontSize: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 17, borderWidth: 1, borderColor: '#e7ece7', gap: 10 },
  sectionTitle: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeButton: { flex: 1, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 13, backgroundColor: '#ffffff' },
  typeButtonText: { fontSize: 13, fontWeight: '700' },
  fieldLabel: { color: '#334155', fontSize: 12, fontWeight: '700', marginTop: 2 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#dbe4db', borderRadius: 12, paddingHorizontal: 13, color: '#1e293b', fontSize: 14, backgroundColor: '#ffffff' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  categoryChip: { borderWidth: 1, borderColor: '#dbe4db', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#ffffff' },
  categoryChipSelected: { borderColor: '#168344', backgroundColor: '#eaf6eb' },
  categoryText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  categoryTextSelected: { color: '#166534' },
  errorText: { color: '#b91c1c', fontSize: 12, lineHeight: 18 },
  saveButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, backgroundColor: '#168344', marginTop: 3 },
  disabledButton: { opacity: 0.65 },
  saveButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#e7ece7', gap: 9 },
  emptyTitle: { color: '#1e293b', fontSize: 14, fontWeight: '700' },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#eaf6eb' },
  retryText: { color: '#166534', fontWeight: '700', fontSize: 12 },
  movementRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, backgroundColor: '#ffffff', paddingHorizontal: 12, borderWidth: 1, borderColor: '#e7ece7' },
  movementIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  incomeIcon: { backgroundColor: '#dcfce7' },
  expenseIcon: { backgroundColor: '#fee2e2' },
  movementCopy: { flex: 1, minWidth: 0, gap: 3 },
  movementConcept: { color: '#1e293b', fontSize: 13, fontWeight: '700' },
  movementMeta: { color: '#64748b', fontSize: 11 },
  movementAmountWrap: { alignItems: 'flex-end', gap: 4 },
  movementAmount: { fontSize: 12, fontWeight: '800' },
  incomeText: { color: '#15803d' },
  expenseText: { color: '#b91c1c' },
  deleteButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#eef2f5' },
  privacyText: { flex: 1, color: '#475569', fontSize: 11, lineHeight: 16 },
  primaryLink: { color: '#ffffff', fontSize: 14, fontWeight: '700', backgroundColor: '#168344', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 13, overflow: 'hidden' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  confirmCard: { width: '100%', maxWidth: 380, padding: 20, borderRadius: 20, backgroundColor: '#ffffff', gap: 12 },
  confirmTitle: { color: '#1e293b', fontSize: 17, fontWeight: '800' },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 4 },
  cancelButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 12, backgroundColor: '#f1f5f9' },
  cancelText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  deleteConfirmButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 12, backgroundColor: '#b91c1c' },
  deleteConfirmText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
});
