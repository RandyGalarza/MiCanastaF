import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeDatabase } from '../src/database/database';

export default function RootLayout() {
  useEffect(() => {
    initializeDatabase().catch((error) => {
      console.error('Error inicializando la BD:', error);
    });
  }, []);

  return <Stack />;
}

await initializeDatabase();
await seedDatabase();