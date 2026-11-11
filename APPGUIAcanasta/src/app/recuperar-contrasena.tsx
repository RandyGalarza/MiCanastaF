import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../database/supabaseClient';
import { mostrarAlerta } from '../utils/alerts';

export default function RecuperarContrasenaScreen() {
  const router = useRouter();
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  useEffect(() => {
    let active = true;

    const processRecoveryUrl = async (url: string | null) => {
      if (!url) return;

      try {
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (active && data.session) setRecoveryReady(true);
          return;
        }

        const fragment = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
        const accessToken = fragment.get('access_token') || parsedUrl.searchParams.get('access_token');
        const refreshToken = fragment.get('refresh_token') || parsedUrl.searchParams.get('refresh_token');
        if (!accessToken || !refreshToken) return;

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        if (active && data.session) setRecoveryReady(true);
      } catch (error) {
        console.error('No se pudo validar el enlace de recuperación:', error);
        if (active) setRecoveryError('El enlace no es válido o ya venció. Solicita uno nuevo.');
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session && active) {
        setRecoveryReady(true);
      }
    });
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      void processRecoveryUrl(url);
    });
    void Linking.getInitialURL().then(processRecoveryUrl).catch((error) => {
      console.error('No se pudo leer el enlace de recuperación:', error);
      if (active) setRecoveryError('No se pudo validar el enlace. Solicita uno nuevo.');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      urlSubscription.remove();
    };
  }, []);

  const handleRestablecer = async () => {
    if (!recoveryReady) {
      mostrarAlerta('Enlace requerido', 'Abre primero el enlace de recuperación enviado a tu correo.');
      return;
    }

    if (!nuevaContrasena.trim() || !confirmarContrasena.trim()) {
      mostrarAlerta('Error', 'Por favor completa todos los campos.');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      mostrarAlerta('Error', 'Las contraseñas no coinciden.');
      return;
    }

    if (nuevaContrasena.length < 6) {
      mostrarAlerta('Error', 'La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    try {
      setCargando(true);
      const { error } = await supabase.auth.updateUser({ password: nuevaContrasena });
      if (error) throw error;
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('La contraseña se actualizó, pero no se pudo cerrar la sesión:', signOutError);
        mostrarAlerta('Contraseña actualizada', 'La clave se cambió, pero no se pudo cerrar la sesión automáticamente.', [
          { text: 'Continuar', onPress: () => router.replace('/login') },
        ]);
        return;
      }
      mostrarAlerta('Éxito', 'Tu contraseña se actualizó. Ya puedes iniciar sesión.', [
        { text: 'Iniciar sesión', onPress: () => router.replace('/login') },
      ]);
    } catch (error) {
      console.error(error);
      mostrarAlerta('Error', 'Ocurrió un problema al actualizar la contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.backgroundCircle} />

        <View style={styles.card}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="key-outline" size={32} color="#16a34a" />
          </View>

          <Text style={styles.title} accessibilityRole="header">Recuperar Contraseña</Text>
          <Text style={styles.subtitle}>
            {recoveryReady
              ? 'Elige una contraseña nueva para volver a tu cuenta.'
              : recoveryError || 'Abre el enlace de recuperación que enviamos a tu correo para continuar.'}
          </Text>

          {recoveryReady && <View style={styles.inputContainer}>
            <Text style={styles.label}>Nueva Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!mostrarNueva}
                value={nuevaContrasena}
                onChangeText={setNuevaContrasena}
                accessibilityLabel="Nueva contraseña"
                accessibilityHint="Debe tener al menos 6 caracteres"
                textContentType="newPassword"
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setMostrarNueva(!mostrarNueva)}
                style={styles.eyeIcon}
                accessibilityRole="button"
                accessibilityLabel={mostrarNueva ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                accessibilityState={{ selected: mostrarNueva }}
                hitSlop={8}
              >
                <Ionicons
                  name={mostrarNueva ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>}

          {recoveryReady && <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repite la nueva contraseña"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!mostrarConfirmar}
                value={confirmarContrasena}
                onChangeText={setConfirmarContrasena}
                accessibilityLabel="Confirmar nueva contraseña"
                textContentType="newPassword"
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={() => setMostrarConfirmar(!mostrarConfirmar)}
                style={styles.eyeIcon}
                accessibilityRole="button"
                accessibilityLabel={mostrarConfirmar ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                accessibilityState={{ selected: mostrarConfirmar }}
                hitSlop={8}
              >
                <Ionicons
                  name={mostrarConfirmar ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>}

          {recoveryReady ? (
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleRestablecer}
              disabled={cargando}
              accessibilityRole="button"
              accessibilityLabel={cargando ? 'Restableciendo contraseña' : 'Restablecer contraseña'}
              accessibilityState={{ disabled: cargando, busy: cargando }}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Restablecer Contraseña</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={() => router.replace('/olvidar-contrasena')}
              accessibilityRole="button"
            >
              <Text style={styles.buttonPrimaryText}>Solicitar otro enlace</Text>
            </TouchableOpacity>
          )}

          <View style={styles.footerContainer}>
            <TouchableOpacity onPress={() => router.replace('/login')} accessibilityRole="link">
              <Text style={styles.linkText}>Cancelar e Ir al Login</Text>
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
    backgroundColor: '#f7f8f6',
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
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e7ece7',
    boxShadow: '0px 5px 18px rgba(31, 56, 38, 0.06)',
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dcfce7',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
    marginBottom: 20,
    marginTop: 4,
    lineHeight: 20,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 14,
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
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  eyeIcon: {
    padding: 6,
  },
  linkText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPrimary: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
});
