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
import { useRouter } from 'expo-router';
import { obtenerUsuarioPorCorreo } from '../repositories/usuarioRepository';

export default function OlvidarContrasenaScreen() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSolicitarCodigo = async () => {
    if (!correo.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico.');
      return;
    }

    try {
      setCargando(true);
      const usuario = await obtenerUsuarioPorCorreo(correo.trim());

      if (!usuario) {
        Alert.alert('Error', 'No existe una cuenta asociada a este correo.');
        return;
      }

      Alert.alert(
        'Verificación',
        'Se ha verificado tu cuenta. Procede a restablecer tu contraseña.',
        [
          {
            text: 'Continuar',
            onPress: () =>
              router.push({
                pathname: '/recuperar-contrasena',
                params: { correo: correo.trim() },
              }),
          },
        ]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Ocurrió un problema al verificar la información.');
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
          <Text style={styles.title}>Olvidé mi Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu correo registrado para iniciar el proceso de recuperación.
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
            />
          </View>

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleSolicitarCodigo}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonPrimaryText}>Continuar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.linkText}>Volver al Login</Text>
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
    marginBottom: 20,
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
