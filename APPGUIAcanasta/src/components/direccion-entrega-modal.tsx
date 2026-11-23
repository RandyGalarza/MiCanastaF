import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { guardarDireccionEntregaCompra } from '@/repositories/compraRepository';

interface DireccionEntregaModalProps {
  visible: boolean;
  purchaseId: number | null;
  userId: number | null;
  onContinue: (purchaseId: number) => void;
}

export function DireccionEntregaModal({
  visible,
  purchaseId,
  userId,
  onContinue,
}: DireccionEntregaModalProps) {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const continueToInvoice = () => {
    if (!saving && purchaseId !== null) onContinue(purchaseId);
  };

  const saveAddress = async () => {
    if (purchaseId === null || userId === null) {
      setError('No se pudo identificar la compra. Puedes continuar sin guardar la dirección.');
      return;
    }

    const normalizedAddress = address.trim().replace(/\s+/g, ' ');
    if (!normalizedAddress) {
      setError('Escribe una dirección antes de guardarla.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await guardarDireccionEntregaCompra(purchaseId, userId, normalizedAddress);
    } catch (saveError) {
      console.error('No se pudo guardar localmente la dirección de entrega:', saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar la dirección. Intenta de nuevo o continúa sin guardarla.'
      );
      setSaving(false);
      return;
    }
    setSaving(false);
    onContinue(purchaseId);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={continueToInvoice}
    >
      <View style={styles.backdrop}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.header}>
              <View style={styles.icon}>
                <Ionicons name="location-outline" size={22} color="#166534" />
              </View>
              <View style={styles.heading}>
                <Text style={styles.title} accessibilityRole="header">
                  ¿Quieres guardar una dirección?
                </Text>
                <Text style={styles.subtitle}>Es opcional y queda asociada a esta compra.</Text>
              </View>
            </View>

            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Calle, número, barrio y ciudad"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              multiline
              maxLength={240}
              textAlignVertical="top"
              accessibilityLabel="Dirección para esta compra"
              accessibilityHint="Se guarda solo en este dispositivo y no se envía al comercio"
            />
            <Text style={styles.disclaimer}>
              Se guardará solo en este dispositivo y podrás verla en el comprobante. No se envía
              al comercio ni solicita o confirma un envío.
            </Text>

            {error ? (
              <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={17} color="#b91c1c" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void saveAddress()}
              disabled={saving || !address.trim()}
              style={[styles.saveButton, (saving || !address.trim()) && styles.disabledButton]}
              accessibilityRole="button"
              accessibilityLabel={saving ? 'Guardando dirección' : 'Guardar dirección y ver comprobante'}
              accessibilityState={{ disabled: saving || !address.trim(), busy: saving }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="save-outline" size={18} color="#ffffff" />
              )}
              <Text style={styles.saveButtonText}>
                {saving ? 'Guardando…' : 'Guardar y ver comprobante'}
              </Text>
            </Pressable>
            <Pressable
              onPress={continueToInvoice}
              disabled={saving}
              style={styles.skipButton}
              accessibilityRole="button"
              accessibilityLabel="Omitir dirección y ver comprobante"
              accessibilityState={{ disabled: saving }}
            >
              <Text style={styles.skipButtonText}>Omitir por ahora</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 13,
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#dcfce7',
  },
  heading: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: '#14532d',
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 11,
  },
  input: {
    minHeight: 92,
    padding: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    color: '#0f172a',
    fontSize: 13,
    backgroundColor: '#f8fafc',
  },
  disclaimer: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 15,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 11,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 11,
    lineHeight: 16,
  },
  saveButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#16a34a',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  skipButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
  },
  skipButtonText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
});
