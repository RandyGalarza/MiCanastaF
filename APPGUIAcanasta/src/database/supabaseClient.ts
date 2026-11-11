import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL o Anon Key no configuradas en las variables de entorno.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) =>
        Platform.OS === 'web'
          ? Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(key))
          : SecureStore.getItemAsync(key),
      setItem: (key, value) =>
        Platform.OS === 'web'
          ? Promise.resolve(
              typeof localStorage === 'undefined' ? undefined : localStorage.setItem(key, value)
            )
          : SecureStore.setItemAsync(key, value),
      removeItem: (key) =>
        Platform.OS === 'web'
          ? Promise.resolve(
              typeof localStorage === 'undefined' ? undefined : localStorage.removeItem(key)
            )
          : SecureStore.deleteItemAsync(key),
    },
    persistSession: true,
    autoRefreshToken: true,
    // The password-recovery route validates and consumes callback tokens on every platform.
    detectSessionInUrl: false,
  },
});

