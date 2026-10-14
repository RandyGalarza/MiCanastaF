import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

export default function CuentaScreen() {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-outline" size={34} color="#16a34a" />
          </View>
          <Text style={styles.title}>Tu cuenta</Text>
          <Text style={styles.subtitle}>Inicia sesión para ver la información de tu cuenta.</Text>
          <Link href="/login" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
            </Pressable>
          </Link>
          <Link href="/registro" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.linkText}>Crear cuenta</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    );
  }

  const handleSignOut = () => {
    signOut();
    router.replace('/(tabs)/cuenta');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="person" size={34} color="#16a34a" />
        </View>
        <Text style={styles.title}>Mi cuenta</Text>
        <Text style={styles.subtitle}>Información de tu perfil</Text>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.roleBadge,
              user.rol === 'admin'
                ? styles.adminBadge
                : user.rol === 'comercio'
                ? styles.comercioBadge
                : styles.userBadge,
            ]}
          >
            <Ionicons
              name={
                user.rol === 'admin'
                  ? 'shield-checkmark'
                  : user.rol === 'comercio'
                  ? 'storefront'
                  : 'person'
              }
              size={14}
              color={
                user.rol === 'admin'
                  ? '#b45309'
                  : user.rol === 'comercio'
                  ? '#0369a1'
                  : '#16a34a'
              }
            />
            <Text
              style={[
                styles.roleBadgeText,
                user.rol === 'admin'
                  ? styles.adminBadgeText
                  : user.rol === 'comercio'
                  ? styles.comercioBadgeText
                  : styles.userBadgeText,
              ]}
            >
              {user.rol === 'admin'
                ? 'Administrador'
                : user.rol === 'comercio'
                ? 'Comercio Afiliado'
                : 'Usuario Común'}
            </Text>
          </View>
        </View>

        <View style={styles.infoList}>
          <InfoRow label="Nombre" value={`${user.nombre} ${user.apellido}`} icon="person-outline" />
          <InfoRow
            label="Tipo de cuenta"
            value={
              user.rol === 'admin'
                ? 'Administrador General'
                : user.rol === 'comercio'
                ? 'Comercio (Gestor de sus productos)'
                : 'Usuario Estándar'
            }
            icon="shield-outline"
          />
          <InfoRow label="Correo electrónico" value={user.correo} icon="mail-outline" />
          <InfoRow label="Teléfono" value={user.telefono || 'No registrado'} icon="call-outline" />
          <InfoRow label="Fecha de registro" value={user.fecha_creacion} icon="calendar-outline" />
        </View>

        {user.rol === 'admin' && (
          <Link href={'/(tabs)/admin' as any} asChild>
            <Pressable style={styles.adminAccessButton}>
              <Ionicons name="settings-outline" size={18} color="#ffffff" />
              <Text style={styles.adminAccessButtonText}>Ir al Panel de Administración</Text>
            </Pressable>
          </Link>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={20} color="#b91c1c" />
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </Pressable>
      </View>
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
        <Ionicons name={icon} size={19} color="#16a34a" />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0px 4px 12px rgba(22, 163, 74, 0.08)',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14532d',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#16a34a',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  comercioBadge: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  userBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  adminBadgeText: {
    color: '#92400e',
  },
  comercioBadgeText: {
    color: '#0369a1',
  },
  userBadgeText: {
    color: '#166534',
  },
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  linkText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },
  adminAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#15803d',
    paddingVertical: 13,
    marginTop: 20,
    boxShadow: '0px 3px 8px rgba(21, 128, 61, 0.25)',
  },
  adminAccessButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    paddingVertical: 13,
    marginTop: 14,
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
