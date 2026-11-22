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
  crearPerecedero,
  eliminarPerecedero,
  marcarPerecederoConsumido,
  obtenerPerecederos,
  actualizarNotificacionPerecedero,
  Perecedero,
} from '@/repositories/perecederoRepository';
import { cancelarAlertaPerecedero, programarAlertaPerecedero } from '@/utils/notifications';

const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function PerecederosScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Perecedero[]>([]);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [fecha, setFecha] = useState('');
  const [mostrarConsumidos, setMostrarConsumidos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [itemAEliminar, setItemAEliminar] = useState<Perecedero | null>(null);

  const cargar = useCallback(async () => {
    if (!user) {
      setItems([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      setItems(await obtenerPerecederos(user.id_usuario));
    } catch (loadError) {
      console.error('No se pudieron cargar los perecederos:', loadError);
      setError('No pudimos cargar tus alimentos. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const pendientes = useMemo(
    () => items.filter((item) => (item.consumido === 1) === mostrarConsumidos),
    [items, mostrarConsumidos]
  );

  const guardar = async () => {
    if (!user || guardando) return;
    setGuardando(true);
    setError('');
    setAviso('');
    try {
      const id = await crearPerecedero(user.id_usuario, nombre, fecha, cantidad);
      setNombre('');
      setCantidad('');
      setFecha('');
      try {
        const resultado = await programarAlertaPerecedero(id, nombre.trim(), fecha);
        if (resultado.status === 'scheduled') {
          try {
            await actualizarNotificacionPerecedero(id, user.id_usuario, resultado.notificationId);
          } catch (saveNotificationError) {
            await cancelarAlertaPerecedero(resultado.notificationId);
            throw saveNotificationError;
          }
          setAviso('Alimento guardado. Recibirás un aviso a las 9:00 a. m. del día de vencimiento.');
        } else if (resultado.status === 'permission-denied') {
          setAviso('Alimento guardado, pero las notificaciones están desactivadas. Puedes activarlas en los ajustes del teléfono.');
        } else if (resultado.status === 'unsupported') {
          setAviso('Alimento guardado. En la web, revisa esta lista para ver qué debes consumir primero.');
        } else {
          setAviso('Alimento guardado. La fecha ya pasó, así que no se programó un aviso.');
        }
      } catch (notificationError) {
        console.error('El alimento se guardó, pero no se pudo programar el aviso:', notificationError);
        setAviso('Alimento guardado, pero no se pudo programar el aviso. Revisa los permisos de notificación.');
      }
      await cargar();
    } catch (saveError) {
      console.error('No se pudo guardar el perecedero:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No pudimos guardar el alimento.');
    } finally {
      setGuardando(false);
    }
  };

  const consumir = async (item: Perecedero) => {
    if (!user || guardando) return;
    setGuardando(true);
    setError('');
    try {
      await cancelarAlertaPerecedero(item.notification_id);
      await marcarPerecederoConsumido(item.id_perecedero, user.id_usuario);
      await cargar();
    } catch (consumeError) {
      console.error('No se pudo actualizar el alimento perecedero:', consumeError);
      setError('No pudimos marcar el alimento como consumido. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!user || !itemAEliminar || guardando) return;
    setGuardando(true);
    setError('');
    try {
      await cancelarAlertaPerecedero(itemAEliminar.notification_id);
      await eliminarPerecedero(itemAEliminar.id_perecedero, user.id_usuario);
      setItemAEliminar(null);
      await cargar();
    } catch (deleteError) {
      console.error('No se pudo eliminar el alimento perecedero:', deleteError);
      setError('No pudimos eliminar el alimento. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="leaf-outline" size={34} color="#166534" />
        <Text style={styles.title} accessibilityRole="header">Consumir primero</Text>
        <Text style={styles.muted}>Inicia sesión para guardar alimentos y sus fechas de vencimiento.</Text>
        <Link href="/login" style={styles.primaryButton} accessibilityRole="link">Iniciar sesión</Link>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Link href="/presupuesto" style={styles.backButton} accessibilityRole="link" accessibilityLabel="Volver al presupuesto">
            <Ionicons name="arrow-back" size={20} color="#166534" />
          </Link>
          <View style={styles.headerCopy}>
            <Text style={styles.title} accessibilityRole="header">Consumir primero</Text>
            <Text style={styles.muted}>Organiza los alimentos por fecha y reduce el desperdicio.</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="earth-outline" size={20} color="#166534" />
          <Text style={styles.infoText}>Usar a tiempo los alimentos ayuda a cuidar el bolsillo y evita desperdiciar comida y recursos.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Agregar alimento</Text>
          <Text style={styles.fieldLabel}>Alimento</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej. leche"
            style={styles.input}
            maxLength={80}
            accessibilityLabel="Nombre del alimento"
          />
          <Text style={styles.fieldLabel}>Cantidad (opcional)</Text>
          <TextInput
            value={cantidad}
            onChangeText={setCantidad}
            placeholder="Ej. 2 unidades"
            style={styles.input}
            maxLength={40}
            accessibilityLabel="Cantidad del alimento"
          />
          <Text style={styles.fieldLabel}>Fecha de vencimiento</Text>
          <TextInput
            value={fecha}
            onChangeText={setFecha}
            placeholder="AAAA-MM-DD"
            style={styles.input}
            maxLength={10}
            accessibilityLabel="Fecha de vencimiento"
            accessibilityHint="Escribe año, mes y día, por ejemplo 2026-12-31"
          />
          {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
          {aviso ? <Text style={styles.noticeText} accessibilityLiveRegion="polite">{aviso}</Text> : null}
          <Pressable
            onPress={() => void guardar()}
            disabled={guardando}
            style={[styles.primaryButton, guardando && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={guardando ? 'Guardando alimento' : 'Guardar alimento y recordatorio'}
            accessibilityState={{ disabled: guardando, busy: guardando }}
          >
            {guardando ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="notifications-outline" size={18} color="#ffffff" />}
            <Text style={styles.primaryButtonText}>{guardando ? 'Guardando…' : 'Guardar alimento'}</Text>
          </Pressable>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {mostrarConsumidos ? 'Alimentos consumidos' : 'Pendientes'}
          </Text>
          <Pressable
            onPress={() => setMostrarConsumidos((value) => !value)}
            style={styles.filterButton}
            accessibilityRole="button"
            accessibilityLabel={mostrarConsumidos ? 'Ver alimentos pendientes' : 'Ver alimentos consumidos'}
            accessibilityState={{ selected: mostrarConsumidos }}
          >
            <Text style={styles.filterText}>{mostrarConsumidos ? 'Ver pendientes' : 'Ver consumidos'}</Text>
          </Pressable>
        </View>
        {cargando ? (
          <View style={styles.emptyCard} accessibilityLiveRegion="polite">
            <ActivityIndicator color="#168344" accessibilityLabel="Cargando alimentos" />
            <Text style={styles.muted}>Cargando alimentos…</Text>
          </View>
        ) : pendientes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name={mostrarConsumidos ? 'checkmark-circle-outline' : 'nutrition-outline'} size={28} color="#166534" />
            <Text style={styles.muted}>{mostrarConsumidos ? 'Aún no has marcado alimentos como consumidos.' : 'Aún no agregas alimentos perecederos.'}</Text>
          </View>
        ) : pendientes.map((item) => {
          const estado = item.fecha_vencimiento < localDate()
            ? 'Vencido'
            : item.fecha_vencimiento === localDate()
            ? 'Vence hoy'
            : `Vence el ${item.fecha_vencimiento}`;
          return (
            <View key={item.id_perecedero} style={styles.itemCard}>
              <View style={styles.itemIcon}>
                <Ionicons name={item.consumido ? 'checkmark-circle-outline' : 'nutrition-outline'} size={22} color="#166534" />
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <Text style={styles.itemMeta}>{item.cantidad ? `${item.cantidad} · ` : ''}{estado}</Text>
                {!item.consumido && !item.notification_id ? (
                  <Text style={styles.reminderOff}>Sin aviso programado</Text>
                ) : null}
              </View>
              {!item.consumido ? (
                <Pressable
                  onPress={() => void consumir(item)}
                  disabled={guardando}
                  style={styles.itemAction}
                  accessibilityRole="button"
                  accessibilityLabel={`Marcar ${item.nombre} como consumido`}
                >
                  <Ionicons name="checkmark" size={18} color="#166534" />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setItemAEliminar(item)}
                disabled={guardando}
                style={styles.itemAction}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item.nombre}`}
              >
                <Ionicons name="trash-outline" size={17} color="#991b1b" />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={itemAEliminar !== null} transparent animationType="fade" onRequestClose={() => setItemAEliminar(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Eliminar alimento</Text>
            <Text style={styles.muted}>También se cancelará su recordatorio.</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setItemAEliminar(null)} style={styles.cancelButton} accessibilityRole="button" accessibilityLabel="Cancelar eliminación">
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={() => void eliminar()} disabled={guardando} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel="Confirmar eliminación">
                <Text style={styles.deleteText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  muted: { color: '#475569', fontSize: 13, lineHeight: 19 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderRadius: 15, backgroundColor: '#eaf6eb' },
  infoText: { flex: 1, color: '#14532d', fontSize: 12, lineHeight: 18 },
  card: { gap: 10, padding: 16, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d8e5d8' },
  sectionTitle: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  fieldLabel: { color: '#334155', fontSize: 12, fontWeight: '700' },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, color: '#1e293b', fontSize: 15, backgroundColor: '#ffffff' },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#168344' },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  errorText: { color: '#991b1b', fontSize: 12, lineHeight: 18 },
  noticeText: { color: '#854d0e', fontSize: 12, lineHeight: 18 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  filterButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10 },
  filterText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  emptyCard: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  itemCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 15, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  itemIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#eaf6eb' },
  itemCopy: { flex: 1, gap: 3 },
  itemName: { color: '#1e293b', fontSize: 14, fontWeight: '700' },
  itemMeta: { color: '#334155', fontSize: 12 },
  reminderOff: { color: '#854d0e', fontSize: 11 },
  itemAction: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f1f5f9' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  modalCard: { gap: 12, padding: 18, borderRadius: 18, backgroundColor: '#ffffff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#f1f5f9' },
  cancelText: { color: '#334155', fontWeight: '700' },
  deleteButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#b91c1c' },
  deleteText: { color: '#ffffff', fontWeight: '700' },
});
