import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import {
  crearMovimientoHogarCompartido,
  HogarCompartido,
  MovimientoHogarCompartido,
  obtenerHogarCompartido,
  obtenerMovimientosHogarCompartido,
} from '@/repositories/hogarCompartidoRepository';

type TipoMovimiento = 'ingreso' | 'gasto';

const CATEGORIAS: Record<TipoMovimiento, string[]> = {
  ingreso: ['Trabajo diario', 'Trabajo semanal', 'Ventas', 'Apoyo familiar', 'Otros ingresos'],
  gasto: ['Mercado', 'Servicios', 'Vivienda', 'Transporte', 'Educación', 'Otros gastos'],
};

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;

function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseAmount(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.').trim());
}

export default function MovimientosCompartidosScreen() {
  const { user } = useAuth();
  const [hogar, setHogar] = useState<HogarCompartido | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoHogarCompartido[]>([]);
  const [tipo, setTipo] = useState<TipoMovimiento>('gasto');
  const [categoria, setCategoria] = useState(CATEGORIAS.gasto[0]);
  const [concepto, setConcepto] = useState('');
  const [montoTexto, setMontoTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    if (!user) {
      setHogar(null);
      setMovimientos([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      const hogarActual = await obtenerHogarCompartido();
      setHogar(hogarActual);
      setMovimientos(hogarActual
        ? await obtenerMovimientosHogarCompartido(hogarActual.id_hogar)
        : []);
    } catch (loadError) {
      console.error('No se pudieron cargar los movimientos compartidos:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar los movimientos.');
    } finally {
      setCargando(false);
    }
  }, [user]);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const mesActual = localDate().slice(0, 7);
  const resumen = useMemo(() => {
    const mes = movimientos.filter((item) => item.fecha.startsWith(mesActual));
    return {
      ingresos: mes.filter((item) => item.tipo === 'ingreso').reduce((sum, item) => sum + Number(item.monto), 0),
      gastos: mes.filter((item) => item.tipo === 'gasto').reduce((sum, item) => sum + Number(item.monto), 0),
    };
  }, [mesActual, movimientos]);

  const cambiarTipo = (nuevoTipo: TipoMovimiento) => {
    setTipo(nuevoTipo);
    setCategoria(CATEGORIAS[nuevoTipo][0]);
  };

  const guardar = async () => {
    if (!user || !hogar || guardando) return;
    const monto = parseAmount(montoTexto);
    if (!concepto.trim()) {
      setError('Escribe un concepto para el movimiento.');
      return;
    }
    if (!Number.isSafeInteger(monto) || monto <= 0) {
      setError('Ingresa un monto entero en pesos, mayor que cero.');
      return;
    }

    setGuardando(true);
    setError('');
    setAviso('');
    try {
      await crearMovimientoHogarCompartido(
        hogar.id_hogar,
        `${user.nombre} ${user.apellido}`.trim(),
        tipo,
        concepto,
        categoria,
        monto,
        localDate()
      );
      setConcepto('');
      setMontoTexto('');
      setAviso('Movimiento guardado y compartido con tu hogar.');
      await cargar();
    } catch (saveError) {
      console.error('No se pudo guardar el movimiento compartido:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No pudimos guardar el movimiento.');
    } finally {
      setGuardando(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="swap-vertical-outline" size={34} color="#166534" />
        <Text style={styles.title} accessibilityRole="header">Movimientos compartidos</Text>
        <Text style={styles.body}>Inicia sesión para consultar los ingresos y gastos de tu hogar.</Text>
        <Link href="/login" style={styles.primaryButton} accessibilityRole="link">Iniciar sesión</Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Link href="/hogar-compartido" style={styles.backButton} accessibilityRole="link" accessibilityLabel="Volver a la gestión del hogar compartido">
          <Ionicons name="arrow-back" size={20} color="#166534" />
        </Link>
        <View style={styles.headerCopy}>
          <Text style={styles.title} accessibilityRole="header">Movimientos del hogar</Text>
          <Text style={styles.body}>{hogar?.nombre ?? 'Ingresos y gastos compartidos'}</Text>
        </View>
      </View>

      {cargando ? (
        <View style={styles.emptyCard} accessibilityLiveRegion="polite">
          <ActivityIndicator color="#168344" accessibilityLabel="Cargando movimientos del hogar" />
          <Text style={styles.body}>Cargando movimientos…</Text>
        </View>
      ) : !hogar ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={28} color="#166534" />
          <Text style={styles.sectionTitle} accessibilityRole="header">Aún no tienes un hogar compartido</Text>
          <Text style={styles.body}>Crea un hogar o acepta una invitación para compartir ingresos y gastos.</Text>
          <Link href="/hogar-compartido" style={styles.primaryButton} accessibilityRole="link">Ir a Hogar compartido</Link>
        </View>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <SummaryCard label="Ingresos del mes" amount={resumen.ingresos} icon="arrow-down-circle-outline" color="#166534" />
            <SummaryCard label="Gastos del mes" amount={resumen.gastos} icon="arrow-up-circle-outline" color="#991b1b" />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Registrar movimiento</Text>
            <Text style={styles.body}>Los datos se guardan en línea y los ven los miembros del hogar.</Text>
            <View style={styles.typeRow}>
              <TypeButton selected={tipo === 'gasto'} label="Gasto" color="#991b1b" onPress={() => cambiarTipo('gasto')} />
              <TypeButton selected={tipo === 'ingreso'} label="Ingreso" color="#166534" onPress={() => cambiarTipo('ingreso')} />
            </View>

            <Text style={styles.fieldLabel}>Concepto</Text>
            <TextInput
              value={concepto}
              onChangeText={setConcepto}
              placeholder={tipo === 'gasto' ? 'Ej. Compra de arroz' : 'Ej. Trabajo de hoy'}
              style={styles.input}
              maxLength={80}
              accessibilityLabel="Concepto del movimiento compartido"
            />
            <Text style={styles.fieldLabel}>Monto en pesos</Text>
            <TextInput
              value={montoTexto}
              onChangeText={setMontoTexto}
              placeholder="Ej. 15000"
              style={styles.input}
              keyboardType="numeric"
              maxLength={14}
              accessibilityLabel="Monto en pesos colombianos"
              accessibilityHint="Ingresa un monto entero mayor que cero"
            />
            {Number.isSafeInteger(parseAmount(montoTexto)) && parseAmount(montoTexto) > 0 ? (
              <Text
                style={styles.amountConfirmation}
                accessibilityRole="text"
                accessibilityLabel={`Monto ingresado: ${currency(parseAmount(montoTexto))} pesos colombianos`}
              >
                Se registrará: {currency(parseAmount(montoTexto))} pesos
              </Text>
            ) : null}
            <Text style={styles.fieldLabel}>Categoría</Text>
            <View style={styles.categoryRow}>
              {CATEGORIAS[tipo].map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategoria(item)}
                  style={[styles.categoryChip, categoria === item && styles.categoryChipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Categoría ${item}`}
                  accessibilityState={{ selected: categoria === item }}
                >
                  <Text style={[styles.categoryText, categoria === item && styles.categoryTextSelected]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
            {aviso ? <Text style={styles.successText} accessibilityLiveRegion="polite">{aviso}</Text> : null}
            <Pressable
              onPress={() => void guardar()}
              disabled={guardando}
              style={[styles.primaryButton, guardando && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={guardando ? 'Guardando movimiento compartido' : 'Guardar movimiento para el hogar'}
              accessibilityState={{ disabled: guardando, busy: guardando }}
            >
              {guardando ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="add" size={19} color="#ffffff" />}
              <Text style={styles.primaryButtonText}>{guardando ? 'Guardando…' : 'Guardar movimiento'}</Text>
            </Pressable>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Últimos movimientos</Text>
            <Text style={styles.body}>Hasta 100 registros</Text>
          </View>
          {movimientos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={26} color="#166534" />
              <Text style={styles.body}>Todavía no hay movimientos compartidos.</Text>
            </View>
          ) : movimientos.map((item) => (
            <View key={item.id_movimiento} style={styles.movementCard}>
              <View style={[styles.movementIcon, item.tipo === 'ingreso' ? styles.incomeIcon : styles.expenseIcon]}>
                <Ionicons
                  name={item.tipo === 'ingreso' ? 'arrow-down' : 'arrow-up'}
                  size={17}
                  color={item.tipo === 'ingreso' ? '#166534' : '#991b1b'}
                />
              </View>
              <View style={styles.movementCopy}>
                <Text style={styles.movementConcept}>{item.concepto}</Text>
                <Text style={styles.body}>{item.categoria} · {item.fecha} · {item.nombre_creador}</Text>
              </View>
              <Text style={[styles.movementAmount, item.tipo === 'ingreso' ? styles.incomeText : styles.expenseText]}>
                {item.tipo === 'ingreso' ? '+' : '−'}{currency(item.monto)}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function SummaryCard({
  label,
  amount,
  icon,
  color,
}: {
  label: string;
  amount: number;
  icon: 'arrow-down-circle-outline' | 'arrow-up-circle-outline';
  color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryAmount, { color }]}>{currency(amount)}</Text>
    </View>
  );
}

function TypeButton({
  selected,
  label,
  color,
  onPress,
}: {
  selected: boolean;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.typeButton,
        selected && { borderColor: color, backgroundColor: `${color}0d` },
      ]}
    >
      <Text style={[styles.typeButtonText, { color }]}>{label}</Text>
    </Pressable>
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
  body: { color: '#475569', fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: '#1e293b', fontSize: 15, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, minWidth: 0, gap: 5, padding: 13, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  summaryLabel: { color: '#334155', fontSize: 11 },
  summaryAmount: { fontSize: 15, fontWeight: '800' },
  card: { gap: 10, padding: 15, borderRadius: 17, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d8e5d8' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 13, backgroundColor: '#ffffff' },
  typeButtonText: { fontSize: 13, fontWeight: '700' },
  fieldLabel: { color: '#334155', fontSize: 12, fontWeight: '700' },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, color: '#1e293b', fontSize: 15, backgroundColor: '#ffffff' },
  amountConfirmation: { color: '#14532d', fontSize: 13, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  categoryChip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 18, backgroundColor: '#ffffff' },
  categoryChipSelected: { borderColor: '#168344', backgroundColor: '#eaf6eb' },
  categoryText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  categoryTextSelected: { color: '#14532d', fontWeight: '800' },
  errorText: { color: '#991b1b', fontSize: 12, lineHeight: 18 },
  successText: { color: '#166534', fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#168344' },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  emptyCard: { minHeight: 94, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  movementCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 15, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  movementIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  incomeIcon: { backgroundColor: '#dcfce7' },
  expenseIcon: { backgroundColor: '#fee2e2' },
  movementCopy: { flex: 1, minWidth: 0, gap: 3 },
  movementConcept: { color: '#1e293b', fontSize: 13, fontWeight: '700' },
  movementAmount: { fontSize: 12, fontWeight: '800' },
  incomeText: { color: '#166534' },
  expenseText: { color: '#991b1b' },
});
