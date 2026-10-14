import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { obtenerUsuarioPorCorreo } from '../repositories/usuarioRepository';
import { Toast, ToastType } from '../components/toast';
import { useAuth } from '../contexts/auth-context';

const DEMO_USERS = [
  {
    titulo: 'Admin',
    subtitulo: 'Control total',
    correo: 'admin@canasta.com',
    contrasena: 'admin123',
    rol: 'admin' as const,
    icon: 'shield-checkmark' as const,
  },
  {
    titulo: 'Comercio',
    subtitulo: 'Don Pedro',
    correo: 'donpedro@canasta.com',
    contrasena: 'comercio123',
    rol: 'comercio' as const,
    icon: 'storefront' as const,
  },
  {
    titulo: 'Usuario',
    subtitulo: 'Randy',
    correo: 'randy@canasta.com',
    contrasena: 'demo123',
    rol: 'usuario' as const,
    icon: 'person' as const,
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false, message: '', type: 'info',
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  };

  const handleLogin = async () => {
    if (!correo.trim() || !contrasena.trim()) {
      showToast('Por favor ingresa tu correo y contraseña.', 'error');
      return;
    }

    try {
      setCargando(true);
      const usuario = await obtenerUsuarioPorCorreo(correo.trim());

      if (!usuario) {
        showToast('El correo ingresado no se encuentra registrado.', 'error');
        return;
      }

      if (usuario.contrasena !== contrasena) {
        showToast('Contraseña incorrecta.', 'error');
        return;
      }

      signIn(usuario);
      showToast(`¡Bienvenido, ${usuario.nombre}!`, 'success');
      setTimeout(() => router.replace('/(tabs)/cuenta'), 1200);
    } catch (error) {
      console.error(error);
      showToast('Ocurrió un error al intentar iniciar sesión.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const fillDemo = (user: typeof DEMO_USERS[0]) => {
    setCorreo(user.correo);
    setContrasena(user.contrasena);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.backgroundCircle} />

        <View style={styles.card}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="basket" size={42} color="#16a34a" />
          </View>

          <Text style={styles.title}>Iniciar Sesión</Text>
          <Text style={styles.subtitle}>Mi Canasta Familiar</Text>

          {/* Usuarios de demo adaptativo */}
          <View style={styles.demoContainer}>
            <View style={styles.demoHeaderRow}>
              <Ionicons name="flash" size={14} color="#16a34a" />
              <Text style={styles.demoLabel}>Acceso rápido de prueba</Text>
            </View>
            <View style={styles.demoGrid}>
              {DEMO_USERS.map((u) => {
                const isSelected = correo === u.correo;
                return (
                  <TouchableOpacity
                    key={u.correo}
                    style={[
                      styles.demoCard,
                      isSelected && styles.demoCardSelected,
                      u.rol === 'admin'
                        ? styles.demoAdminBorder
                        : u.rol === 'comercio'
                        ? styles.demoComercioBorder
                        : styles.demoUserBorder,
                    ]}
                    onPress={() => fillDemo(u)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={u.icon}
                      size={16}
                      color={
                        u.rol === 'admin'
                          ? '#b45309'
                          : u.rol === 'comercio'
                          ? '#0284c7'
                          : '#16a34a'
                      }
                      style={styles.demoCardIcon}
                    />
                    <View style={styles.demoCardTexts}>
                      <Text
                        style={[
                          styles.demoCardTitle,
                          u.rol === 'admin'
                            ? styles.demoAdminTitle
                            : u.rol === 'comercio'
                            ? styles.demoComercioTitle
                            : styles.demoUserTitle,
                        ]}
                        numberOfLines={1}
                      >
                        {u.titulo}
                      </Text>
                      <Text style={styles.demoCardSub} numberOfLines={1}>
                        {u.subtitulo}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={correo}
                onChangeText={setCorreo}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="********"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!mostrarContrasena}
                value={contrasena}
                onChangeText={setContrasena}
              />
              <TouchableOpacity onPress={() => setMostrarContrasena(!mostrarContrasena)} style={styles.eyeIcon}>
                <Ionicons
                  name={mostrarContrasena ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.linkRight}
            onPress={() => router.push('/olvidar-contrasena')}
          >
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleLogin}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonPrimaryText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/registro')}>
              <Text style={[styles.linkText, styles.bold]}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
  },
  backgroundCircle: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#dcfce7',
    opacity: 0.7,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0px 4px 12px rgba(22, 163, 74, 0.08)',
  },
  headerIconContainer: {
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
    marginBottom: 18,
    marginTop: 2,
    fontWeight: '500',
  },
  demoContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  demoLabel: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  demoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    gap: 6,
    minHeight: 46,
  },
  demoCardSelected: {
    backgroundColor: '#f0fdf4',
    transform: [{ scale: 1.02 }],
  },
  demoAdminBorder: {
    borderColor: '#fde68a',
  },
  demoComercioBorder: {
    borderColor: '#bae6fd',
  },
  demoUserBorder: {
    borderColor: '#bbf7d0',
  },
  demoCardIcon: {
    alignSelf: 'center',
  },
  demoCardTexts: {
    flex: 1,
    justifyContent: 'center',
  },
  demoCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  demoAdminTitle: {
    color: '#b45309',
  },
  demoComercioTitle: {
    color: '#0369a1',
  },
  demoUserTitle: {
    color: '#15803d',
  },
  demoCardSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  eyeIcon: {
    padding: 6,
  },
  linkRight: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  linkText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },
  bold: {
    fontWeight: 'bold',
  },
  buttonPrimary: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
});
