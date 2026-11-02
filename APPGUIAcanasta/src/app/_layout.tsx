import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { initializeDatabase } from '../database/database';
import { seedDatabase } from '../database/seed';
import { pushToSupabase, syncDatabase } from '../database/syncService';
import { AuthProvider } from '../contexts/auth-context';

export default function RootLayout() {
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        await seedDatabase();
      } catch (error) {
        console.error('Error inicializando la BD:', error);
      } finally {
        setDatabaseReady(true);
      }
      void syncDatabase()
        .then(async () => {
          await seedDatabase();
          await pushToSupabase();
        })
        .catch((e) => console.warn('Error en sync inicial:', e));
    }
    void init();
  }, []);

  return (
    <AuthProvider>
      {databaseReady ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8faf8' }}>
          <ActivityIndicator size="large" color="#15803d" />
        </View>
      )}
    </AuthProvider>
  );
}
