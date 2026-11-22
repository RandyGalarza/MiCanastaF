import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { aportarAMetaAhorro, crearMetaAhorro, obtenerMetasAhorro } from '@/repositories/metaAhorroRepository';
import { MetaAhorro } from '@/types/database';

const money = (value: number) => `$${Number(value).toLocaleString('es-CO')}`;
const parseAmount = (value: string) => Number(value.replace(/\D/g, ''));

export default function MetasAhorroScreen() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<MetaAhorro[]>([]);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<MetaAhorro | null>(null);
  const [contribution, setContribution] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setGoals(await obtenerMetasAhorro(user.id_usuario));
    } catch (loadError) {
      console.error('No se pudieron cargar las metas:', loadError);
      setError('No pudimos cargar tus metas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void loadGoals(); }, [loadGoals]));

  const saveGoal = async () => {
    if (!user || saving) return;
    setSaving(true);
    setError('');
    try {
      await crearMetaAhorro(
        user.id_usuario,
        name,
        parseAmount(target),
        targetDate.trim() || null
      );
      setName('');
      setTarget('');
      setTargetDate('');
      await loadGoals();
    } catch (saveError) {
      console.error('No se pudo guardar la meta:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la meta.');
    } finally {
      setSaving(false);
    }
  };

  const saveContribution = async () => {
    if (!user || !selectedGoal || saving) return;
    setSaving(true);
    setError('');
    try {
      await aportarAMetaAhorro(selectedGoal.id_meta_ahorro, user.id_usuario, parseAmount(contribution));
      setSelectedGoal(null);
      setContribution('');
      await loadGoals();
    } catch (saveError) {
      console.error('No se pudo registrar el aporte:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No se pudo registrar el aporte.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="sparkles-outline" size={34} color="#168344" />
        <Text style={styles.title}>Metas de ahorro</Text>
        <Text style={styles.muted}>Inicia sesión para guardar tus metas en este dispositivo.</Text>
        <Link href="/login" style={styles.primaryButton}>Iniciar sesión</Link>
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
            <Text style={styles.title} accessibilityRole="header">Metas de ahorro</Text>
            <Text style={styles.muted}>Define un objetivo y registra cada aporte</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Crear una meta</Text>
          <Text style={styles.fieldLabel}>¿Para qué estás ahorrando?</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Ej. Uniformes escolares" maxLength={70} accessibilityLabel="Nombre de la meta" />
          <Text style={styles.fieldLabel}>Monto objetivo (COP)</Text>
          <TextInput value={target} onChangeText={setTarget} style={styles.input} placeholder="Ej. 300000" keyboardType="numeric" maxLength={14} accessibilityLabel="Monto objetivo en pesos colombianos" />
          <Text style={styles.fieldLabel}>Fecha objetivo (opcional, AAAA-MM-DD)</Text>
          <TextInput value={targetDate} onChangeText={setTargetDate} style={styles.input} placeholder="2026-12-31" maxLength={10} accessibilityLabel="Fecha objetivo opcional" />
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <Pressable onPress={() => void saveGoal()} disabled={saving} style={[styles.primaryButton, saving && styles.disabled]} accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="add" size={18} color="#ffffff" />}
            <Text style={styles.primaryButtonText}>{saving ? 'Guardando…' : 'Crear meta'}</Text>
          </Pressable>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Tu progreso</Text>
          <Text style={styles.muted}>{goals.length} {goals.length === 1 ? 'meta' : 'metas'}</Text>
        </View>
        {loading ? (
          <View style={styles.emptyCard}><ActivityIndicator color="#168344" /><Text style={styles.muted}>Cargando metas…</Text></View>
        ) : error && goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.error} accessibilityRole="alert">{error}</Text>
            <Pressable onPress={() => void loadGoals()}><Text style={styles.retry}>Intentar de nuevo</Text></Pressable>
          </View>
        ) : goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="flag-outline" size={28} color="#168344" />
            <Text style={styles.emptyTitle}>Crea tu primera meta</Text>
            <Text style={styles.muted}>El progreso se calcula con los aportes que registres.</Text>
          </View>
        ) : goals.map((goal) => {
          const ratio = Number(goal.monto_objetivo) > 0
            ? Number(goal.monto_ahorrado) / Number(goal.monto_objetivo)
            : 0;
          const percentage = Math.min(100, Math.round(ratio * 100));
          const completed = ratio >= 1;
          return (
            <View key={goal.id_meta_ahorro} style={styles.goalCard}>
              <View style={styles.goalHeading}>
                <View style={styles.goalIcon}><Ionicons name={completed ? 'checkmark-circle' : 'flag-outline'} size={19} color="#168344" /></View>
                <View style={styles.goalCopy}>
                  <Text style={styles.goalName}>{goal.nombre}</Text>
                  <Text style={styles.muted}>{goal.fecha_objetivo ? `Meta para ${goal.fecha_objetivo}` : 'Sin fecha límite'}</Text>
                </View>
                {completed ? <Text style={styles.completed}>¡Lograda!</Text> : null}
              </View>
              <View
                style={styles.progressTrack}
                accessibilityRole="progressbar"
                accessibilityLabel={`Progreso de ${goal.nombre}`}
                accessibilityValue={{ min: 0, max: 100, now: percentage }}
              >
                <View style={[styles.progressFill, { width: `${percentage}%` }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>{money(Number(goal.monto_ahorrado))} ahorrados</Text>
                <Text style={styles.progressText}>{money(Number(goal.monto_objetivo))} objetivo · {percentage}%</Text>
              </View>
              {!completed ? (
                <Pressable onPress={() => { setSelectedGoal(goal); setContribution(''); }} style={styles.contributeButton} accessibilityRole="button" accessibilityLabel={`Agregar aporte a ${goal.nombre}`}>
                  <Ionicons name="add-circle-outline" size={17} color="#166534" />
                  <Text style={styles.contributeText}>Registrar aporte</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        <Text style={styles.privacyNote}>Las metas se guardan en este dispositivo.</Text>
      </ScrollView>

      <Modal visible={selectedGoal !== null} transparent animationType="fade" onRequestClose={() => setSelectedGoal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <Text style={styles.sectionTitle}>Aportar a {selectedGoal?.nombre}</Text>
            <Text style={styles.fieldLabel}>Monto del aporte (COP)</Text>
            <TextInput value={contribution} onChangeText={setContribution} style={styles.input} placeholder="Ej. 10000" keyboardType="numeric" maxLength={14} accessibilityLabel="Monto del aporte en pesos colombianos" />
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => { setSelectedGoal(null); setError(''); }} style={styles.cancelButton} accessibilityRole="button"><Text style={styles.cancelText}>Cancelar</Text></Pressable>
              <Pressable onPress={() => void saveContribution()} disabled={saving} style={[styles.primaryButton, styles.modalSave, saving && styles.disabled]} accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }}>
                <Text style={styles.primaryButtonText}>{saving ? 'Guardando…' : 'Guardar aporte'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  goalCard: { padding: 15, borderRadius: 17, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7', gap: 9 },
  goalHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#eaf5e9', alignItems: 'center', justifyContent: 'center' },
  goalCopy: { flex: 1, gap: 3 },
  goalName: { color: '#193d27', fontSize: 13, fontWeight: '800' },
  completed: { color: '#15803d', fontSize: 10, fontWeight: '800' },
  progressTrack: { height: 9, borderRadius: 5, backgroundColor: '#e7ece7', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: '#22a455' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  progressText: { color: '#536358', fontSize: 10, fontWeight: '700' },
  contributeButton: { alignSelf: 'flex-start', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#eaf5e9' },
  contributeText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  privacyNote: { color: '#718076', fontSize: 10, textAlign: 'center', marginTop: 4 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.45)', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, padding: 18, borderRadius: 19, backgroundColor: '#ffffff', gap: 11 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9, marginTop: 5 },
  cancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13 },
  cancelText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  modalSave: { marginTop: 0 },
});
