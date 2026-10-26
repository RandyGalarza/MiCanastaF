import React, { useEffect } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

const ICONS: Record<ToastType, string> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
};

const COLORS: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: { bg: '#f0fdf4', icon: '#16a34a', border: '#86efac' },
  error: { bg: '#fef2f2', icon: '#dc2626', border: '#fca5a5' },
  info: { bg: '#eff6ff', icon: '#2563eb', border: '#93c5fd' },
};

export function Toast({ visible, message, type = 'info', duration = 3000, onHide }: ToastProps) {
  const [opacity] = React.useState(() => new Animated.Value(0));
  const [translateY] = React.useState(() => new Animated.Value(-20));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, opacity, translateY]);

  if (!visible) return null;

  const colors = COLORS[type];

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.toast, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Ionicons name={ICONS[type] as any} size={22} color={colors.icon} style={styles.icon} />
        <Text style={[styles.message, { color: type === 'error' ? '#991b1b' : type === 'success' ? '#14532d' : '#1e3a8a' }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.10)',
    maxWidth: 480,
    width: '100%',
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
