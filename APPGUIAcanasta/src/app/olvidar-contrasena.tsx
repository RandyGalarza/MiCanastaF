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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { obtenerUsuarioPorCorreo } from '../repositories/usuarioRepository';
import { mostrarAlerta } from '../utils/alerts';

export default function OlvidarContrasenaScreen() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSolicitarCodigo = async () => {
    if (!correo.trim()) {
      mostrarAlerta('Error', 'Por favor ingresa tu correo electrónico.');
      return;
    }

    try {
      setCargando(true);
      const usuario = await obtenerUsuarioPorCorreo(correo.trim());

      if (!usuario) {
        mostrarAlerta('Error', 'No existe una cuenta asociada a este correo.');
        return;
      }

      mostrarAlerta(
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
      mostrarAlerta('Error', 'Ocurrió un problema al verificar la información.');
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
            <Ionicons name="help-circle-outline" size={32} color="#16a34a" />
          </View>

          <Text style={styles.title}>Olvidé mi Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu correo registrado para iniciar el proceso de recuperación.
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
              />
            </View>
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
    marginBottom: 24,
    marginTop: 4,
    lineHeight: 20,
    fontWeight: '500',
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
