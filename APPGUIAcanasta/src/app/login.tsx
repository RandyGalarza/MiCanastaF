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

export default function LoginScreen() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!correo.trim() || !contrasena.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    try {
      setCargando(true);
      const usuario = await obtenerUsuarioPorCorreo(correo.trim());

      if (!usuario) {
        Alert.alert('Error', 'El correo ingresado no se encuentra registrado.');
        return;
      }

      if (usuario.contrasena !== contrasena) {
        Alert.alert('Error', 'Contraseña incorrecta.');
        return;
      }

      Alert.alert('¡Bienvenido!', `Hola, ${usuario.nombre} ${usuario.apellido}`);
      // Redireccionar al usuario a la vista deseada tras iniciar sesión
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Ocurrió un error al intentar iniciar sesión.');
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
          <Text style={styles.title}>Iniciar Sesión</Text>
          <Text style={styles.subtitle}>Mi Canasta Familiar</Text>

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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="********"
              secureTextEntry
              value={contrasena}
              onChangeText={setContrasena}
            />
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a253c',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
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
  linkRight: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
  },
  bold: {
    fontWeight: 'bold',
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
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
});
