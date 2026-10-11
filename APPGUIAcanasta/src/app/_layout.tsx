import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeDatabase } from '../database/database';
import { seedDatabase } from '../database/seed';
import { AuthProvider } from '../contexts/auth-context';

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        await seedDatabase();
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