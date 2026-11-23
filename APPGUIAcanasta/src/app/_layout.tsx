import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { BrandColors } from '../constants/theme';
import { AuthProvider } from '../contexts/auth-context';
import { ThemeProvider } from '../contexts/theme-context';
import { initializeDatabase } from '../database/database';
import { seedDatabase } from '../database/seed';
import { pushToSupabase, syncDatabase } from '../database/syncService';

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
    databaseReady ? (
      <AuthProvider>
        <ThemeProvider>
          <NotificationObserver />
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </AuthProvider>
    ) : (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BrandColors.background }} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={BrandColors.primary} accessibilityLabel="Preparando la aplicación" />
      </View>
    )
  );
}

function NotificationObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const redirect = (notification: Notifications.Notification) => {
      const screen = notification.request.content.data?.screen;
      if (screen === '/perecederos') router.push('/perecederos');
      if (screen === '/(tabs)/presupuesto') router.push('/(tabs)/presupuesto');
    };

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) redirect(lastResponse.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      redirect(response.notification)
    );
    return () => subscription.remove();
  }, []);

  return null;
}
