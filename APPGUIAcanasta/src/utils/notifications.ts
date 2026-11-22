import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configurar cómo se presentan las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function programarRecordatorioDiario(hora: number, minuto: number): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      console.log(`[Recordatorio Web] Programado a las ${hora}:${minuto}`);
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        localStorage.setItem(
          'recordatorio_gastos',
          JSON.stringify({ hora, minuto, activado: true })
        );
      }
      return true;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permiso de notificaciones denegado');
      return false;
    }

    // Cancelar recordatorios previos del registro de gastos
    await cancelarRecordatoriosPrevios();

    // Programar repetición diaria
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🛒 ¿Hiciste compras hoy?',
        body: 'Anota tus gastos en 2 toques para cuidar el bolsillo y mantener tu presupuesto al día.',
        sound: true,
        data: { screen: '/(tabs)/presupuesto', kind: 'daily_expense' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hora,
        minute: minuto,
      },
    });

    return true;
  } catch (error) {
    console.error('Error al programar recordatorio:', error);
    return false;
  }
}

export async function cancelarRecordatoriosPrevios(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const dailyReminders = scheduled.filter((notification) => {
    const data = notification.content.data;
    return data?.kind === 'daily_expense' ||
      (data?.screen === '/(tabs)/presupuesto' &&
        notification.content.title === '🛒 ¿Hiciste compras hoy?');
  });
  await Promise.all(
    dailyReminders.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    )
  );
}

export type PerishableReminderResult =
  | { status: 'scheduled'; notificationId: string }
  | { status: 'permission-denied' | 'unsupported' | 'expired' };

export async function programarAlertaPerecedero(
  id_perecedero: number,
  nombre: string,
  fecha_vencimiento: string
): Promise<PerishableReminderResult> {
  if (Platform.OS === 'web') return { status: 'unsupported' };

  const permissions = await Notifications.getPermissionsAsync();
  let status = permissions.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return { status: 'permission-denied' };

  const alertDate = new Date(`${fecha_vencimiento}T09:00:00`);
  if (Number.isNaN(alertDate.getTime())) throw new Error('La fecha del recordatorio no es válida.');
  if (alertDate.getTime() < Date.now()) return { status: 'expired' };
  if (alertDate.getTime() < Date.now() + 60_000) {
    alertDate.setTime(Date.now() + 60_000);
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Consume primero este alimento',
      body: `${nombre} vence hoy. Revisa si aún está en buen estado antes de consumirlo.`,
      data: { screen: '/perecederos', id_perecedero, kind: 'perishable' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alertDate,
    },
  });
  return { status: 'scheduled', notificationId };
}

export async function cancelarAlertaPerecedero(notificationId: string | null): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
