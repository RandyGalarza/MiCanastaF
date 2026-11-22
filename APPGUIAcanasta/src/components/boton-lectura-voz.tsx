import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leerEnVozAlta } from '@/utils/speech';

interface BotonLecturaVozProps {
  texto: string;
  etiqueta?: string;
  size?: 'pequeno' | 'normal' | 'grande';
  color?: string;
}

export function BotonLecturaVoz({
  texto,
  etiqueta = 'Escuchar',
  size = 'normal',
  color = '#15803d',
}: BotonLecturaVozProps) {
  const isLarge = size === 'grande';
  const isSmall = size === 'pequeno';

  const iconSize = isLarge ? 22 : isSmall ? 15 : 18;

  return (
    <Pressable
      onPress={() => leerEnVozAlta(texto)}
      style={({ pressed }) => [
        styles.container,
        isLarge && styles.containerLarge,
        isSmall && styles.containerSmall,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Escuchar en voz alta: ${etiqueta}`}
      accessibilityHint="Lee el contenido de esta sección en voz alta"
    >
      <View style={[styles.iconWrapper, { backgroundColor: '#dcfce7' }]}>
        <Ionicons name="volume-high-outline" size={iconSize} color={color} />
      </View>
      {etiqueta ? (
        <Text
          style={[
            styles.text,
            isLarge && styles.textLarge,
            isSmall && styles.textSmall,
            { color },
          ]}
        >
          {etiqueta}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 48,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    alignSelf: 'flex-start',
  },
  containerLarge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
  },
  iconWrapper: {
    padding: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  textLarge: {
    fontSize: 15,
  },
  textSmall: {
    fontSize: 11,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
