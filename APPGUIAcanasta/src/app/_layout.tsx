import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeDatabase } from '../database/database';
import { seedDatabase } from '../database/seed';

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
    <Stack screenOptions={{ headerShown: false }} />
  );
}