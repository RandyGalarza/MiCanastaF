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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { crearUsuario, obtenerUsuarioPorCorreo } from '../repositories/usuarioRepository';
import { obtenerComercios, crearComercio } from '../repositories/comercioRepository';
import { Toast, ToastType } from '../components/toast';
import { Comercio, RolUsuario } from '../types/database';

export default function RegistroScreen() {
  const router = useRouter();
  const [rol, setRol] = useState<RolUsuario>('usuario');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  // Campos para cuenta de comercio
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [idComercioSeleccionado, setIdComercioSeleccionado] = useState<number | null>(null);
  const [esNuevoComercio, setEsNuevoComercio] = useState(false);
  const [nuevoNombreComercio, setNuevoNombreComercio] = useState('');
  const [nuevoTipoComercio, setNuevoTipoComercio] = useState('Supermercado');
  const [nuevaDireccionComercio, setNuevaDireccionComercio] = useState('');

  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false, message: '', type: 'info',
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const coms = await obtenerComercios();
        if (active && coms && coms.length > 0) {
          setComercios(coms);
          setIdComercioSeleccionado(coms[0].id_comercio);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleRegistro = async () => {
    if (!nombre.trim() || !apellido.trim() || !correo.trim() || !contrasena.trim()) {
      showToast('Por favor completa los campos obligatorios (*).', 'error');
      return;
    }

    if (rol === 'comercio' && esNuevoComercio && !nuevoNombreComercio.trim()) {
      showToast('Por favor escribe el nombre de tu comercio.', 'error');
      return;
    }

    if (contrasena !== confirmarContrasena) {
      showToast('Las contraseñas no coinciden.', 'error');
      return;
    }

    if (contrasena.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    try {
      setCargando(true);
      const existe = await obtenerUsuarioPorCorreo(correo.trim());
      if (existe) {
        showToast('El correo ya se encuentra registrado.', 'error');
        return;
      }

      let comercioIdParaUsuario: number | null = null;

      if (rol === 'comercio') {
        if (esNuevoComercio) {
          comercioIdParaUsuario = await crearComercio(
            nuevoNombreComercio.trim(),
            nuevaDireccionComercio.trim() || undefined,
            telefono.trim() || undefined,
            nuevoTipoComercio.trim() || 'Comercio'
          );
        } else {
          comercioIdParaUsuario = idComercioSeleccionado;
        }
      }

      await crearUsuario(
        nombre.trim(),
        apellido.trim(),
        correo.trim(),
        contrasena,
        telefono.trim() || undefined,
        rol,
        comercioIdParaUsuario
      );

      showToast('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.', 'success');
      setTimeout(() => router.replace('/login'), 1500);
    } catch (error) {
      console.error(error);
      showToast('No se pudo completar el registro.', 'error');
    } finally {
      setCargando(false);
    }
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
            <Ionicons name="person-add-outline" size={32} color="#16a34a" />
          </View>

          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete a Mi Canasta Familiar</Text>

          {/* Selector de Tipo de Usuario */}
          <Text style={styles.label}>Tipo de Cuenta</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleOption, rol === 'usuario' && styles.roleOptionActive]}
              onPress={() => setRol('usuario')}
            >
              <Ionicons
                name="person"
                size={18}
                color={rol === 'usuario' ? '#15803d' : '#64748b'}
              />
              <Text
                style={[
                  styles.roleOptionText,
                  rol === 'usuario' && styles.roleOptionTextActive,
                ]}
              >
                Usuario Común
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, rol === 'comercio' && styles.roleOptionActive]}
              onPress={() => setRol('comercio')}
            >
              <Ionicons
                name="storefront"
                size={18}
                color={rol === 'comercio' ? '#15803d' : '#64748b'}
              />
              <Text
                style={[
                  styles.roleOptionText,
                  rol === 'comercio' && styles.roleOptionTextActive,
                ]}
              >
                Comercio / Tienda
              </Text>
            </TouchableOpacity>
          </View>

          {/* Si eligió Comercio: elegir existente o crear nuevo */}
          {rol === 'comercio' && (
            <View style={styles.comercioSection}>
              <Text style={styles.sectionHeading}>Datos del Comercio Asociado</Text>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.subTab, !esNuevoComercio && styles.subTabActive]}
                  onPress={() => setEsNuevoComercio(false)}
                >
                  <Text style={[styles.subTabText, !esNuevoComercio && styles.subTabTextActive]}>
                    Comercio existente
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subTab, esNuevoComercio && styles.subTabActive]}
                  onPress={() => setEsNuevoComercio(true)}
                >
                  <Text style={[styles.subTabText, esNuevoComercio && styles.subTabTextActive]}>
                    + Registrar nuevo
                  </Text>
                </TouchableOpacity>
              </View>

              {!esNuevoComercio ? (
                <View style={styles.chipsWrap}>
                  {comercios.length === 0 ? (
                    <Text style={styles.emptyNotice}>No hay comercios aún, registra uno nuevo.</Text>
                  ) : (
                    comercios.map((com) => (
                      <TouchableOpacity
                        key={com.id_comercio}
                        onPress={() => setIdComercioSeleccionado(com.id_comercio)}
                        style={[
                          styles.chip,
                          idComercioSeleccionado === com.id_comercio && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            idComercioSeleccionado === com.id_comercio && styles.chipTextActive,
                          ]}
                        >
                          {com.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : (
                <View style={styles.newComercioBox}>
                  <Text style={styles.fieldLabel}>Nombre del Comercio *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej. Frutería El Vergel"
                    value={nuevoNombreComercio}
                    onChangeText={setNuevoNombreComercio}
                  />

                  <Text style={styles.fieldLabel}>Tipo de Negocio</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej. Supermercado, Tienda, Carnicería"
                    value={nuevoTipoComercio}
                    onChangeText={setNuevoTipoComercio}
                  />

                  <Text style={styles.fieldLabel}>Dirección del Local</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej. Carrera 10 # 25-10"
                    value={nuevaDireccionComercio}
                    onChangeText={setNuevaDireccionComercio}
                  />
                </View>
              )}
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Juan"
                placeholderTextColor="#94a3b8"
                value={nombre}
                onChangeText={setNombre}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Apellido *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Pérez"
                placeholderTextColor="#94a3b8"
                value={apellido}
                onChangeText={setApellido}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo Electrónico *</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Teléfono (Opcional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="3001234567"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={telefono}
                onChangeText={setTelefono}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!mostrarContrasena}
                value={contrasena}
                onChangeText={setContrasena}
              />
              <TouchableOpacity
                onPress={() => setMostrarContrasena(!mostrarContrasena)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={mostrarContrasena ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Contraseña *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
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
    marginTop: 2,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  roleOptionActive: {
    borderColor: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  roleOptionTextActive: {
    color: '#14532d',
    fontWeight: '700',
  },
  comercioSection: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  subTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  subTabActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  subTabText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
  },
  chipTextActive: {
    color: '#15803d',
    fontWeight: '700',
  },
  emptyNotice: {
    fontSize: 12,
    color: '#64748b',
    padding: 6,
  },
  newComercioBox: {
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 6,
    marginBottom: 3,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
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
  bold: {
    fontWeight: 'bold',
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
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
});
