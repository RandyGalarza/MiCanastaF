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
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { actualizarContrasenaPorCorreo } from '../repositories/usuarioRepository';
import { mostrarAlerta } from '../utils/alerts';

export default function RecuperarContrasenaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ correo?: string }>();
  const [correo, setCorreo] = useState(params.correo || '');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleRestablecer = async () => {
    if (!correo.trim() || !nuevaContrasena.trim() || !confirmarContrasena.trim()) {
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
      const exito = await actualizarContrasenaPorCorreo(
        correo.trim(),
        nuevaContrasena
      );

      if (exito) {
        mostrarAlerta(
          'Éxito',
          'Tu contraseña ha sido actualizada correctamente.',
          [
            {
              text: 'Iniciar Sesión',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      } else {
        mostrarAlerta('Error', 'No se pudo encontrar el usuario para actualizar la contraseña.');
      }
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

          <Text style={styles.title}>Recuperar Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu nueva contraseña para acceder de nuevo a tu cuenta.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={correo}
                onChangeText={setCorreo}
                editable={!params.correo}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
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
              />
              <TouchableOpacity
                onPress={() => setMostrarNueva(!mostrarNueva)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={mostrarNueva ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
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
              />
              <TouchableOpacity
                onPress={() => setMostrarConfirmar(!mostrarConfirmar)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={mostrarConfirmar ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleRestablecer}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonPrimaryText}>Restablecer Contraseña</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <TouchableOpacity onPress={() => router.replace('/login')}>
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
