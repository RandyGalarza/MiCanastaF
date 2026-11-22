import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import {
  aceptarInvitacionHogar,
  crearHogarCompartido,
  HogarCompartido,
  InvitacionHogar,
  invitarAlHogar,
  MiembroHogar,
  obtenerHogarCompartido,
  obtenerInvitacionesHogar,
  obtenerMiembrosHogar,
} from '@/repositories/hogarCompartidoRepository';

export default function HogarCompartidoScreen() {
  const { user } = useAuth();
  const [hogar, setHogar] = useState<HogarCompartido | null>(null);
  const [miembros, setMiembros] = useState<MiembroHogar[]>([]);
  const [invitaciones, setInvitaciones] = useState<InvitacionHogar[]>([]);
  const [nombreHogar, setNombreHogar] = useState('');
  const [correoInvitacion, setCorreoInvitacion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    if (!user) {
      setHogar(null);
      setMiembros([]);
      setInvitaciones([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      const [hogarActual, pendientes] = await Promise.all([
        obtenerHogarCompartido(),
        obtenerInvitacionesHogar(),
      ]);
      setHogar(hogarActual);
      setInvitaciones(pendientes);
      setMiembros(hogarActual ? await obtenerMiembrosHogar(hogarActual.id_hogar) : []);
    } catch (loadError) {
      console.error('No se pudo cargar el hogar compartido:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar el hogar compartido.');
    } finally {
      setCargando(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const crear = async () => {
    if (!user || guardando) return;
    setGuardando(true);
    setError('');
    setAviso('');
    try {
      await crearHogarCompartido(nombreHogar);
      setNombreHogar('');
      setAviso('Hogar creado. Ahora puedes invitar a las personas de tu familia.');
      await cargar();
    } catch (createError) {
      console.error('No se pudo crear el hogar compartido:', createError);
      setError(createError instanceof Error ? createError.message : 'No pudimos crear el hogar.');
    } finally {
      setGuardando(false);
    }
  };

  const aceptar = async (invitacion: InvitacionHogar) => {
    if (guardando) return;
    setGuardando(true);
    setError('');
    setAviso('');
    try {
      await aceptarInvitacionHogar(invitacion.id_invitacion);
      setAviso(`Ya formas parte de ${invitacion.nombre_hogar}.`);
      await cargar();
    } catch (acceptError) {
      console.error('No se pudo aceptar la invitación:', acceptError);
      setError(acceptError instanceof Error ? acceptError.message : 'No pudimos aceptar la invitación.');
    } finally {
      setGuardando(false);
    }
  };

  const invitar = async () => {
    if (!hogar || guardando) return;
    const email = correoInvitacion.trim().toLowerCase();
    setGuardando(true);
    setError('');
    setAviso('');
    try {
      await invitarAlHogar(hogar.id_hogar, email);
      setCorreoInvitacion('');
      const mensaje = `Te invitaron al hogar "${hogar.nombre}" en Mi Canasta. Inicia sesión con ${email} y acepta la invitación en la sección Hogar compartido. La invitación vence en 7 días.`;
      setAviso(`Invitación creada para ${email}. La persona debe entrar con ese mismo correo y aceptarla en la app.`);
      try {
        await Share.share({ title: `Invitación a ${hogar.nombre}`, message: mensaje });
      } catch (shareError) {
        console.error('La invitación se creó, pero no se pudo abrir la opción para compartir:', shareError);
        setAviso(`Invitación creada para ${email}. No se pudo abrir la opción para compartir; avísale que entre con ese correo y acepte en Hogar compartido.`);
      }
      await cargar();
    } catch (inviteError) {
      console.error('No se pudo invitar al hogar:', inviteError);
      setError(inviteError instanceof Error ? inviteError.message : 'No pudimos crear la invitación.');
    } finally {
      setGuardando(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="people-outline" size={34} color="#166534" />
        <Text style={styles.title} accessibilityRole="header">Hogar compartido</Text>
        <Text style={styles.body}>Inicia sesión con un correo confirmado para compartir ingresos y gastos con tu hogar.</Text>
        <Link href="/login" style={styles.primaryButton} accessibilityRole="link">Iniciar sesión</Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Link href="/presupuesto" style={styles.backButton} accessibilityRole="link" accessibilityLabel="Volver al presupuesto">
          <Ionicons name="arrow-back" size={20} color="#166534" />
        </Link>
        <View style={styles.headerCopy}>
          <Text style={styles.title} accessibilityRole="header">Hogar compartido</Text>
          <Text style={styles.body}>Registra ingresos y gastos junto con tu familia.</Text>
        </View>
      </View>

      {cargando ? (
        <View style={styles.emptyCard} accessibilityLiveRegion="polite">
          <ActivityIndicator color="#168344" accessibilityLabel="Cargando hogar compartido" />
          <Text style={styles.body}>Cargando…</Text>
        </View>
      ) : error && !hogar && invitaciones.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
          <Pressable onPress={() => void cargar()} style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Volver a cargar el hogar compartido">
            <Text style={styles.secondaryButtonText}>Intentar de nuevo</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {hogar ? (
            <>
              <View style={styles.householdCard}>
                <View style={styles.householdIcon}><Ionicons name="home-outline" size={22} color="#166534" /></View>
                <View style={styles.householdCopy}>
                  <Text style={styles.householdName}>{hogar.nombre}</Text>
                  <Text style={styles.body}>{hogar.rol === 'admin' ? 'Administras este hogar' : 'Eres miembro de este hogar'} · {miembros.length} {miembros.length === 1 ? 'persona' : 'personas'}</Text>
                </View>
              </View>

              <Link
                href="/movimientos-compartidos"
                style={styles.primaryButton}
                accessibilityRole="link"
                accessibilityLabel="Ver ingresos y gastos del hogar compartido"
              >
                <Ionicons name="swap-vertical-outline" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Movimientos del hogar</Text>
              </Link>

              {hogar.rol === 'admin' ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle} accessibilityRole="header">Invitar por correo</Text>
                  <Text style={styles.body}>La invitación dura 7 días. La persona debe iniciar sesión con ese correo y aceptar desde su app.</Text>
                  <TextInput
                    value={correoInvitacion}
                    onChangeText={setCorreoInvitacion}
                    placeholder="correo@ejemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    maxLength={254}
                    accessibilityLabel="Correo de la persona que quieres invitar"
                  />
                  <Pressable
                    onPress={() => void invitar()}
                    disabled={guardando}
                    style={[styles.primaryButton, guardando && styles.disabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Crear y compartir invitación por correo"
                    accessibilityState={{ disabled: guardando, busy: guardando }}
                  >
                    {guardando ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="mail-outline" size={18} color="#ffffff" />}
                    <Text style={styles.primaryButtonText}>{guardando ? 'Procesando…' : 'Invitar persona'}</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.sectionTitle} accessibilityRole="header">Miembros</Text>
                {miembros.map((miembro) => (
                  <View key={miembro.auth_user_id} style={styles.memberRow}>
                    <View style={styles.memberIcon}><Ionicons name="person-outline" size={17} color="#166534" /></View>
                    <Text style={styles.memberEmail}>{miembro.correo}</Text>
                    <Text style={styles.memberRole}>{miembro.rol === 'admin' ? 'Admin' : 'Miembro'}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              {invitaciones.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle} accessibilityRole="header">Invitaciones recibidas</Text>
                  {invitaciones.map((invitacion) => (
                    <View key={invitacion.id_invitacion} style={styles.invitationCard}>
                      <View style={styles.invitationCopy}>
                        <Text style={styles.householdName}>{invitacion.nombre_hogar}</Text>
                        <Text style={styles.body}>Invitación enviada a {invitacion.correo_invitado}.</Text>
                      </View>
                      <Pressable
                        onPress={() => void aceptar(invitacion)}
                        disabled={guardando}
                        style={[styles.acceptButton, guardando && styles.disabled]}
                        accessibilityRole="button"
                        accessibilityLabel={`Aceptar invitación a ${invitacion.nombre_hogar}`}
                        accessibilityState={{ disabled: guardando, busy: guardando }}
                      >
                        <Text style={styles.acceptButtonText}>Aceptar</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.card}>
                <Text style={styles.sectionTitle} accessibilityRole="header">Crear un hogar</Text>
                <Text style={styles.body}>Una cuenta puede pertenecer a un hogar compartido. Los movimientos se registran cuando hay conexión a internet.</Text>
                <TextInput
                  value={nombreHogar}
                  onChangeText={setNombreHogar}
                  placeholder="Ej. Familia Galarza"
                  style={styles.input}
                  maxLength={60}
                  accessibilityLabel="Nombre del hogar compartido"
                />
                <Pressable
                  onPress={() => void crear()}
                  disabled={guardando}
                  style={[styles.primaryButton, guardando && styles.disabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Crear hogar compartido"
                  accessibilityState={{ disabled: guardando, busy: guardando }}
                >
                  {guardando ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="home-outline" size={18} color="#ffffff" />}
                  <Text style={styles.primaryButtonText}>{guardando ? 'Creando…' : 'Crear hogar'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </>
      )}

      {error && (hogar || invitaciones.length > 0) ? (
        <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
      ) : null}
      {aviso ? <Text style={styles.successText} accessibilityLiveRegion="polite">{aviso}</Text> : null}
      <View style={styles.privacyNote}>
        <Ionicons name="lock-closed-outline" size={16} color="#334155" />
        <Text style={styles.privacyText}>Solo los miembros del hogar pueden ver sus movimientos. Cada miembro puede registrar movimientos; puede editar los propios y la persona administradora puede gestionarlos todos.</Text>
      </View>
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
  body: { color: '#475569', fontSize: 12, lineHeight: 18 },
  householdCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 15, borderRadius: 17, backgroundColor: '#eaf6eb', borderWidth: 1, borderColor: '#b7d9bb' },
  householdIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ffffff' },
  householdCopy: { flex: 1, gap: 3 },
  householdName: { color: '#14532d', fontSize: 15, fontWeight: '800' },
  card: { gap: 10, padding: 15, borderRadius: 17, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d8e5d8' },
  sectionTitle: { color: '#1e293b', fontSize: 15, fontWeight: '800' },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, color: '#1e293b', fontSize: 15, backgroundColor: '#ffffff' },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#168344' },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  secondaryButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#eaf6eb' },
  secondaryButtonText: { color: '#166534', fontWeight: '800' },
  disabled: { opacity: 0.6 },
  errorText: { color: '#991b1b', fontSize: 12, lineHeight: 18 },
  successText: { color: '#166534', fontSize: 12, lineHeight: 18 },
  memberRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6 },
  memberIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#eaf6eb' },
  memberEmail: { flex: 1, color: '#334155', fontSize: 12, fontWeight: '600' },
  memberRole: { color: '#334155', fontSize: 11, fontWeight: '700' },
  invitationCard: { gap: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  invitationCopy: { gap: 3 },
  acceptButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#eaf6eb' },
  acceptButtonText: { color: '#166534', fontWeight: '800' },
  emptyCard: { minHeight: 94, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#f1f5f9' },
  privacyText: { flex: 1, color: '#334155', fontSize: 11, lineHeight: 17 },
});
