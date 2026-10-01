import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { actualizarContrasenaPorCorreo } from '../repositories/usuarioRepository';

export default function RecuperarContrasenaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ correo?: string }>();
  const [correo, setCorreo] = useState(params.correo || '');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleRestablecer = async () => {
    if (!correo.trim() || !nuevaContrasena.trim() || !confirmarContrasena.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    if (nuevaContrasena.length < 6) {
      Alert.alert('Error', 'La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    try {
      setCargando(true);
      const exito = await actualizarContrasenaPorCorreo(
        correo.trim(),
        nuevaContrasena
      );

      if (exito) {
        Alert.alert(
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
        Alert.alert('Error', 'No se pudo encontrar el usuario para actualizar la contraseña.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Ocurrió un problema al actualizar la contraseña.');
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
        <View style={styles.card}>
          <Text style={styles.title}>Recuperar Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu nueva contraseña para acceder de nuevo a tu cuenta.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="ejemplo@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={correo}
              onChangeText={setCorreo}
              editable={!params.correo}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nueva Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={nuevaContrasena}
              onChangeText={setNuevaContrasena}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Repite la nueva contraseña"
              secureTextEntry
              value={confirmarContrasena}
              onChangeText={setConfirmarContrasena}
            />
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
    backgroundColor: '#f4f6f8',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a253c',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 6,
    lineHeight: 20,
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
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    elevation: 1,
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
