import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';

function formatRegistrationDate(value: string): string {
  if (!value) return 'No disponible';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CuentaScreen() {
  const { user, isAdmin, isComercio, signOut } = useAuth();

  if (!user) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.guestContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.guestCard}>
          <View style={styles.guestDecoration} />
          <View style={styles.guestIcon}>
            <Ionicons name="person-outline" size={30} color="#15803d" />
          </View>
          <Text style={styles.guestEyebrow}>MI CANASTA FAMILIAR</Text>
          <Text style={styles.guestTitle}>Tu espacio personal</Text>
          <Text style={styles.guestText}>
            Inicia sesión para consultar tu perfil, organizar tu presupuesto y tener tus compras a mano.
          </Text>
          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
            <Ionicons name="arrow-forward" size={17} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/registro')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Crear una cuenta nueva</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const roleLabel = isAdmin ? 'Administrador' : isComercio ? 'Comercio afiliado' : 'Usuario';
  const roleDescription = isAdmin
    ? 'Acceso de administración'
    : isComercio
    ? 'Gestión de productos y ventas'
    : 'Cuenta personal';
  const roleColor = isAdmin ? '#b45309' : isComercio ? '#0369a1' : '#15803d';
  const roleBackground = isAdmin ? '#fef3c7' : isComercio ? '#e0f2fe' : '#dcfce7';
  const roleIcon = isAdmin ? 'shield-checkmark-outline' : isComercio ? 'storefront-outline' : 'person-outline';
  const initials = `${user.nombre.trim().charAt(0)}${user.apellido.trim().charAt(0)}`.toUpperCase();

  const handleSignOut = () => {
    signOut();
    router.replace('/(tabs)/cuenta');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeading}>
        <View>
          <Text style={styles.pageEyebrow}>TU PERFIL</Text>
          <Text style={styles.pageTitle}>Mi cuenta</Text>
        </View>
        <View style={styles.headingIcon}>
          <Ionicons name="person-circle-outline" size={23} color="#15803d" />
        </View>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileDecoration} />
        <View style={styles.profileTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'MC'}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleBackground }]}>
            <Ionicons name={roleIcon} size={14} color={roleColor} />
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>
        <Text style={styles.profileName}>{user.nombre} {user.apellido}</Text>
        <Text style={styles.profileEmail} numberOfLines={1}>{user.correo}</Text>
        <View style={styles.profileDivider} />
        <View style={styles.profileMeta}>
          <View style={styles.profileMetaItem}>
            <Ionicons name="calendar-outline" size={16} color="#bbf7d0" />
            <Text style={styles.profileMetaText}>
              Miembro desde {formatRegistrationDate(user.fecha_creacion)}
            </Text>
          </View>
          <Text style={styles.accountId}>ID {user.id_usuario}</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          <Text style={styles.sectionCaption}>Continúa donde lo necesitas</Text>
        </View>
      </View>

      <View style={styles.actionList}>
          <Pressable
            onPress={() => router.push('/(tabs)/lista-compra')}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <View style={[styles.actionIcon, styles.actionGreen]}>
              <Ionicons name="cart-outline" size={20} color="#15803d" />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Mis listas de compra</Text>
              <Text style={styles.actionDescription}>Organiza los productos que necesitas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/historial-compras')}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <View style={[styles.actionIcon, styles.actionBlue]}>
              <Ionicons name="receipt-outline" size={20} color="#0369a1" />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Historial de compras</Text>
              <Text style={styles.actionDescription}>Revisa compras y facturas guardadas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/presupuesto')}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <View style={[styles.actionIcon, styles.actionPurple]}>
              <Ionicons name={isComercio ? 'stats-chart-outline' : 'wallet-outline'} size={20} color="#7c3aed" />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>{isComercio ? 'Mis ventas' : 'Mi presupuesto'}</Text>
              <Text style={styles.actionDescription}>
                {isComercio ? 'Consulta el resumen de ventas' : 'Lleva control de tu mercado'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </Pressable>

        {isAdmin && (
            <Pressable
              onPress={() => router.push('/(tabs)/admin' as any)}
              style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <View style={[styles.actionIcon, styles.actionAmber]}>
                <Ionicons name="settings-outline" size={20} color="#b45309" />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Panel de administración</Text>
                <Text style={styles.actionDescription}>Administra la configuración de la app</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </Pressable>
        )}
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Información de perfil</Text>
          <Text style={styles.sectionCaption}>{roleDescription}</Text>
        </View>
        <Ionicons name="id-card-outline" size={20} color="#15803d" />
      </View>

      <View style={styles.detailsCard}>
        <InfoRow label="Nombre completo" value={`${user.nombre} ${user.apellido}`} icon="person-outline" />
        <View style={styles.detailsDivider} />
        <InfoRow label="Correo electrónico" value={user.correo} icon="mail-outline" />
        <View style={styles.detailsDivider} />
        <InfoRow label="Teléfono" value={user.telefono || 'No registrado'} icon="call-outline" />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleSignOut}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
      >
        <View style={styles.logoutIcon}>
          <Ionicons name="log-out-outline" size={19} color="#b91c1c" />
        </View>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        <Ionicons name="chevron-forward" size={18} color="#ef4444" />
      </Pressable>

      <Text style={styles.footerText}>Tu cuenta de Mi Canasta Familiar</Text>
    </ScrollView>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#15803d" />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6' },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 30,
    gap: 14,
  },
  guestContent: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: 20,
  },
  guestCard: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    padding: 25,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eee7',
    boxShadow: '0px 8px 24px rgba(20, 83, 45, 0.08)',
  },
  guestDecoration: {
    position: 'absolute',
    top: -90,
    right: -85,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#f0fdf4',
  },
  guestIcon: {
    zIndex: 1,
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    marginBottom: 16,
  },
  guestEyebrow: { color: '#15803d', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  guestTitle: { color: '#14532d', fontSize: 23, fontWeight: '800', marginTop: 7, textAlign: 'center' },
  guestText: { maxWidth: 360, color: '#64748b', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 17 },
  primaryButton: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 13,
    backgroundColor: '#15803d',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  secondaryButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 12 },
  secondaryButtonText: { color: '#15803d', fontSize: 14, fontWeight: '700' },
  pageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  pageEyebrow: { color: '#15803d', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  pageTitle: { color: '#14532d', fontSize: 25, fontWeight: '800', marginTop: 3 },
  headingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
  },
  profileCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#14532d',
  },
  profileDecoration: {
    position: 'absolute',
    width: 175,
    height: 175,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -100,
    right: -35,
  },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#bbf7d0',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { color: '#14532d', fontSize: 23, fontWeight: '900' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '800' },
  profileName: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 15 },
  profileEmail: { color: '#dcfce7', fontSize: 13, marginTop: 4 },
  profileDivider: { height: 1, backgroundColor: 'rgba(220,252,231,0.2)', marginVertical: 15 },
  profileMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  profileMetaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  profileMetaText: { color: '#dcfce7', fontSize: 11, fontWeight: '600' },
  accountId: { color: '#bbf7d0', fontSize: 10, fontWeight: '700' },
  sectionHeading: { marginTop: 5, marginBottom: 1 },
  sectionTitle: { color: '#14532d', fontSize: 17, fontWeight: '800' },
  sectionCaption: { color: '#64748b', fontSize: 11, marginTop: 3 },
  actionList: { gap: 9 },
  actionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eee7',
  },
  actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionGreen: { backgroundColor: '#dcfce7' },
  actionBlue: { backgroundColor: '#e0f2fe' },
  actionPurple: { backgroundColor: '#ede9fe' },
  actionAmber: { backgroundColor: '#fef3c7' },
  actionCopy: { flex: 1, gap: 3 },
  actionTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  actionDescription: { color: '#64748b', fontSize: 11, lineHeight: 15 },
  detailsCard: {
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eee7',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
  infoIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' },
  infoText: { flex: 1, gap: 3 },
  infoLabel: { color: '#64748b', fontSize: 10, fontWeight: '600' },
  infoValue: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  detailsDivider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 49 },
  logoutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#fff7f7',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2' },
  logoutButtonText: { flex: 1, color: '#b91c1c', fontSize: 13, fontWeight: '800' },
  footerText: { color: '#94a3b8', fontSize: 10, textAlign: 'center', marginTop: 1 },
  pressed: { opacity: 0.75 },
});
