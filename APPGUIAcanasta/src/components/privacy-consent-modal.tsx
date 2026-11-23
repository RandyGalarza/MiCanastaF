import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BotonLecturaVoz } from '@/components/boton-lectura-voz';

interface PrivacyConsentModalProps {
  visible: boolean;
  onClose: () => void;
  onDeleteAccount?: () => void;
  deleting?: boolean;
}

export function PrivacyConsentModal({
  visible,
  onClose,
  onDeleteAccount,
  deleting,
}: PrivacyConsentModalProps) {
  const [tab, setTab] = useState<'aviso' | 'derechos' | 'borrar'>('aviso');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const textoLectura =
    'Aviso de privacidad y protección de datos según la Ley 1581 de 2012 de Colombia. Mi Canasta Familiar protege tus datos y los utiliza para organizar tus compras y presupuestos. Las direcciones de los comercios se consultan con Photon, basado en OpenStreetMap, para ubicarlos en el mapa. Puedes solicitar la eliminación de tu cuenta; si administras un hogar compartido o registraste movimientos compartidos, primero debes resolver esos datos para no afectar a otros miembros.';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} accessibilityRole="header">
                Privacidad y Tus Datos
              </Text>
              <Text style={styles.subtitle}>Ley 1581 de 2012 · Colombia</Text>
            </View>
            <BotonLecturaVoz texto={textoLectura} size="pequeno" etiqueta="Escuchar" />
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>

          {/* Selector de pestañas */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setTab('aviso')}
              style={[styles.tabButton, tab === 'aviso' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, tab === 'aviso' && styles.tabTextActive]}>
                Aviso Legal
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('derechos')}
              style={[styles.tabButton, tab === 'derechos' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, tab === 'derechos' && styles.tabTextActive]}>
                Tus Derechos
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('borrar')}
              style={[styles.tabButton, tab === 'borrar' && styles.tabButtonActiveDanger]}
            >
              <Text style={[styles.tabText, tab === 'borrar' && styles.tabTextActiveDanger]}>
                Borrar Cuenta
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {tab === 'aviso' && (
              <View style={styles.section}>
                <View style={styles.badgeBanner}>
                  <Ionicons name="shield-checkmark" size={20} color="#15803d" />
                  <Text style={styles.badgeBannerText}>
                    Tus datos están protegidos y nunca se venden a terceros.
                  </Text>
                </View>
                <Text style={styles.paragraph}>
                  En cumplimiento de la <Text style={styles.bold}>Ley Estatutaria 1581 de 2012</Text> y el Decreto 1377 de 2013 de la República de Colombia, te informamos que los datos suministrados (nombre, correo electrónico, compras y presupuestos) son tratados de manera confidencial.
                </Text>
                <Text style={styles.sectionHeading}>Finalidad del tratamiento:</Text>
                <Text style={styles.bulletPoint}>• Permitir la sincronización local y en la nube de tus listas de mercado.</Text>
                <Text style={styles.bulletPoint}>• Estimar tus gastos y enviarte recordatorios útiles para no exceder tu presupuesto.</Text>
                <Text style={styles.bulletPoint}>• Alimentar de manera anónima y comunitaria el comparador de precios de Riohacha.</Text>
                <Text style={styles.sectionHeading}>Consulta de direcciones:</Text>
                <Text style={styles.paragraph}>
                  Al registrar o cambiar la dirección de un comercio, se envía a Photon, un servicio basado en OpenStreetMap, para obtener sus coordenadas y mostrarlo en el mapa.
                </Text>
              </View>
            )}

            {tab === 'derechos' && (
              <View style={styles.section}>
                <Text style={styles.paragraph}>
                  Como titular de tus datos personales según el marco legal colombiano (Habeas Data), tienes derecho a:
                </Text>
                <View style={styles.rightCard}>
                  <Ionicons name="eye-outline" size={18} color="#0369a1" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rightTitle}>Conocer y acceder</Text>
                    <Text style={styles.rightDesc}>Ver toda la información que tenemos guardada sobre ti.</Text>
                  </View>
                </View>
                <View style={styles.rightCard}>
                  <Ionicons name="pencil-outline" size={18} color="#15803d" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rightTitle}>Actualizar y rectificar</Text>
                    <Text style={styles.rightDesc}>Corregir tus datos si son parciales, inexactos o incompletos.</Text>
                  </View>
                </View>
                <View style={styles.rightCard}>
                  <Ionicons name="trash-bin-outline" size={18} color="#b91c1c" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rightTitle}>Revocar y suprimir</Text>
                    <Text style={styles.rightDesc}>Eliminar tu cuenta y registros personales. Los datos compartidos deben resolverse primero para proteger a los demás miembros.</Text>
                  </View>
                </View>
              </View>
            )}

            {tab === 'borrar' && (
              <View style={styles.section}>
                <View style={styles.dangerBanner}>
                  <Ionicons name="alert-circle" size={24} color="#b91c1c" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dangerTitle}>Eliminar cuenta y datos personales</Text>
                    <Text style={styles.dangerText}>
                      Se eliminarán tu cuenta de acceso, perfil y datos personales de la nube y de este dispositivo. Para no borrar información de otras familias, la acción se bloqueará si eres responsable de un hogar compartido o registraste movimientos allí.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setConfirmDelete(!confirmDelete)}
                  style={styles.checkboxRow}
                >
                  <View style={[styles.checkbox, confirmDelete && styles.checkboxActive]}>
                    {confirmDelete && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Entiendo que perderé mis datos personales y que el borrado se bloqueará si afecta información compartida.
                  </Text>
                </Pressable>

                <TouchableOpacity
                  onPress={onDeleteAccount}
                  disabled={!confirmDelete || deleting}
                  style={[
                    styles.deleteButton,
                    (!confirmDelete || deleting) && styles.deleteButtonDisabled,
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.deleteButtonText}>Eliminar mi cuenta y mis datos</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabButtonActiveDanger: {
    backgroundColor: '#fee2e2',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#15803d',
    fontWeight: '800',
  },
  tabTextActiveDanger: {
    color: '#dc2626',
    fontWeight: '800',
  },
  scroll: {
    maxHeight: 340,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  section: {
    gap: 10,
  },
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  badgeBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  paragraph: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  bold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6,
  },
  bulletPoint: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    paddingLeft: 6,
  },
  rightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  rightDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  dangerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991b1b',
  },
  dangerText: {
    fontSize: 11,
    color: '#7f1d1d',
    marginTop: 3,
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    height: 48,
    marginTop: 6,
  },
  deleteButtonDisabled: {
    opacity: 0.45,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  doneButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
