import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crearMovimientoHogar } from '@/repositories/movimientoHogarRepository';
import { BotonLecturaVoz } from '@/components/boton-lectura-voz';
import { BrandColors } from '@/constants/theme';

interface QuickExpenseModalProps {
  visible: boolean;
  idUsuario: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIAS_RAPIDAS = [
  { id: 'Alimentos', label: 'Comida / Tienda', icon: 'cart-outline' as const, bg: BrandColors.primarySoft, color: BrandColors.primary },
  { id: 'Transporte', label: 'Transporte / Moto', icon: 'bicycle-outline' as const, bg: BrandColors.orangeSoft, color: BrandColors.orange },
  { id: 'Servicios', label: 'Servicios / Recarga', icon: 'flash-outline' as const, bg: BrandColors.yellowSoft, color: '#93620b' },
  { id: 'Salud', label: 'Farmacia / Salud', icon: 'medkit-outline' as const, bg: BrandColors.redSoft, color: BrandColors.red },
  { id: 'Otros', label: 'Imprevisto / Otro', icon: 'cash-outline' as const, bg: '#f2eee4', color: BrandColors.muted },
];

function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function QuickExpenseModal({
  visible,
  idUsuario,
  onClose,
  onSuccess,
}: QuickExpenseModalProps) {
  const [categoria, setCategoria] = useState(CATEGORIAS_RAPIDAS[0].id);
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const appendDigito = (digito: string) => {
    if (monto.length >= 8) return;
    setMonto((prev) => prev + digito);
  };

  const borrarDigito = () => {
    setMonto((prev) => prev.slice(0, -1));
  };

  const limpiar = () => {
    setMonto('');
    setConcepto('');
    setError('');
  };

  const handleGuardar = async () => {
    const valor = parseInt(monto, 10);
    if (!valor || isNaN(valor) || valor <= 0) {
      setError('Escribe un monto mayor que 0.');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      const descFinal = concepto.trim() || `Gasto en ${categoria}`;
      await crearMovimientoHogar(
        idUsuario,
        'gasto',
        descFinal,
        categoria,
        valor,
        localDate()
      );
      limpiar();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo guardar el gasto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard} accessibilityViewIsModal>
          {/* Header accesible con voz */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} accessibilityRole="header">Anotar gasto en 2 toques</Text>
              <Text style={styles.subtitle}>Elige la categoría, pulsa el monto y listo.</Text>
            </View>
            <BotonLecturaVoz
              texto="Anotar gasto rápido en 2 toques. Primero toca la categoría como Comida o Transporte, luego marca el dinero gastado y dale al botón Anotar Gasto."
              size="pequeno"
              etiqueta="Voz"
            />
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>

          {/* Categorías con iconos grandes */}
          <Text style={styles.stepTitle}>1. Toca la categoría</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {CATEGORIAS_RAPIDAS.map((item) => {
              const selected = categoria === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setCategoria(item.id)}
                  style={[
                    styles.catCard,
                    selected && styles.catCardSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Categoría ${item.label}`}
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <Text style={[styles.catLabel, selected && styles.catLabelSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Visualizador de monto grande */}
          <Text style={styles.stepTitle}>2. Marca cuánto gastaste</Text>
          <View style={styles.displayRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <Text style={styles.amountDisplay}>
              {monto ? parseInt(monto, 10).toLocaleString('es-CO') : '0'}
            </Text>
            {monto.length > 0 && (
              <Pressable onPress={borrarDigito} style={styles.backspaceBtn}>
                <Ionicons name="backspace-outline" size={22} color="#dc2626" />
              </Pressable>
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Teclado numérico grande y táctil */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['000', '0', 'C'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => {
                      if (k === 'C') {
                        setMonto('');
                      } else {
                        appendDigito(k);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.keypadKey,
                      k === 'C' && styles.keypadKeyClear,
                      pressed && styles.keyPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.keyText,
                        k === 'C' && styles.keyTextClear,
                        k === '000' && styles.keyTextSmall,
                      ]}
                    >
                      {k}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          {/* Botón final grande */}
          <TouchableOpacity
            onPress={handleGuardar}
            disabled={guardando || !monto}
            style={[
              styles.actionButton,
              (!monto || guardando) && styles.disabledAction,
            ]}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#ffffff" />
                <Text style={styles.actionButtonText}>
                  Anotar Gasto ({monto ? `$${parseInt(monto, 10).toLocaleString('es-CO')}` : '$0'})
                </Text>
              </>
            )}
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
    backgroundColor: 'rgba(47, 53, 45, 0.52)',
  },
  modalCard: {
    backgroundColor: BrandColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '92%',
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
    color: BrandColors.text,
  },
  subtitle: {
    fontSize: 15,
    color: BrandColors.muted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#f4f0e7',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  catScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  catCard: {
    alignItems: 'center',
    gap: 6,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
    minWidth: 98,
  },
  catCardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.primarySoft,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.text,
    textAlign: 'center',
  },
  catLabelSelected: {
    color: BrandColors.primary,
    fontWeight: '800',
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.background,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BrandColors.border,
    marginVertical: 6,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.muted,
    marginRight: 6,
  },
  amountDisplay: {
    fontSize: 32,
    fontWeight: '900',
    color: BrandColors.text,
    letterSpacing: 1,
  },
  backspaceBtn: {
    marginLeft: 'auto',
    padding: 6,
  },
  errorText: {
    color: BrandColors.red,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
  },
  keypad: {
    gap: 6,
    marginTop: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 6,
  },
  keypadKey: {
    flex: 1,
    height: 50,
    backgroundColor: '#f4f0e7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadKeyClear: {
    backgroundColor: BrandColors.redSoft,
  },
  keyPressed: {
    opacity: 0.6,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
    color: BrandColors.text,
  },
  keyTextClear: {
    color: BrandColors.red,
    fontWeight: '800',
  },
  keyTextSmall: {
    fontSize: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    height: 52,
    marginTop: 14,
  },
  disabledAction: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
