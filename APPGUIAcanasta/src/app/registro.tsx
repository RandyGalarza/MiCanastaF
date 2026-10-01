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
import { crearUsuario, obtenerUsuarioPorCorreo } from '../repositories/usuarioRepository';

export default function RegistroScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleRegistro = async () => {
    if (!nombre.trim() || !apellido.trim() || !correo.trim() || !contrasena.trim()) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios (*).');
      return;
    }

    if (contrasena !== confirmarContrasena) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    if (contrasena.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setCargando(true);
      const existe = await obtenerUsuarioPorCorreo(correo.trim());
      if (existe) {
        Alert.alert('Error', 'El correo ya se encuentra registrado.');
        return;
      }

      await crearUsuario(
        nombre.trim(),
        apellido.trim(),
        correo.trim(),
        contrasena,
        telefono.trim() || undefined
      );

      Alert.alert('Éxito', 'Cuenta registrada correctamente.', [
        {
          text: 'Iniciar Sesión',
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo completar el registro.');
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
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete a Mi Canasta Familiar</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Juan"
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Apellido *</Text>
            <TextInput
              style={styles.input}
              placeholder="Pérez"
              value={apellido}
              onChangeText={setApellido}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo Electrónico *</Text>
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
            <Text style={styles.label}>Teléfono (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="3001234567"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={contrasena}
              onChangeText={setContrasena}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Contraseña *</Text>
            <TextInput
              style={styles.input}
              placeholder="Repite tu contraseña"
              secureTextEntry
              value={confirmarContrasena}
              onChangeText={setConfirmarContrasena}
            />
          </View>

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleRegistro}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonPrimaryText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={[styles.linkText, styles.bold]}>Inicia Sesión</Text>
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
    marginBottom: 20,
    marginTop: 4,
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
  },
  bold: {
    fontWeight: 'bold',
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
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
});
