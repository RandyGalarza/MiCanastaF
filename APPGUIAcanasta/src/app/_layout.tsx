import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeDatabase } from '../database/database';
import { seedDatabase } from '../database/seed';
import { syncDatabase } from '../database/syncService';
import { AuthProvider } from '../contexts/auth-context';

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        await seedDatabase();
        // Sincronizar automáticamente con Supabase en segundo plano
        syncDatabase()
          .then(() => seedDatabase())
          .catch((e) => console.warn('Error en sync inicial:', e));
      } catch (error) {
        console.error('Error inicializando la BD:', error);
      }
    }
    init();
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
