import { AppLogo } from '@/components/app-logo';
import { BotonLecturaVoz } from '@/components/boton-lectura-voz';
import { QuickExpenseModal } from '@/components/quick-expense-modal';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';
import { obtenerCompras } from '@/repositories/compraRepository';
import { obtenerMovimientosHogar } from '@/repositories/movimientoHogarRepository';
import { obtenerPresupuestos } from '@/repositories/presupuestoRepository';
import { Compra, MovimientoHogar, Presupuesto } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;

function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function purchaseDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : localDate(date);
}

function daysUntil(endDate: string, today: string): number {
  const end = new Date(`${endDate}T12:00:00`);
  const start = new Date(`${today}T12:00:00`);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function formatShortDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  });
}

type BudgetSnapshot = {
  name: string;
  amount: number;
  spent: number;
  daysRemaining: number;
};

const QUICK_ACTIONS = [
  {
    id: 'expense',
    title: 'Registrar gasto',
    text: 'Anótalo en pocos pasos',
    icon: 'add-circle-outline' as const,
    color: BrandColors.orange,
    background: BrandColors.orangeSoft,
  },
  {
    id: 'list',
    title: 'Mi lista',
    text: 'Prepara tu mercado',
    icon: 'cart-outline' as const,
    color: BrandColors.primary,
    background: BrandColors.primarySoft,
  },
  {
    id: 'prices',
    title: 'Comparar precios',
    text: 'Busca opciones para ahorrar',
    icon: 'pricetag-outline' as const,
    color: '#93620b',
    background: BrandColors.yellowSoft,
  },
  {
    id: 'savings',
    title: 'Mi ahorro',
    text: 'Avanza hacia tu meta',
    icon: 'flag-outline' as const,
    color: BrandColors.primary,
    background: BrandColors.primarySoft,
  },
] as const;

const COMMERCE_ACTIONS = [
  {
    id: 'catalog',
    title: 'Catálogo',
    text: 'Actualiza tus productos',
    icon: 'basket-outline' as const,
    color: BrandColors.primary,
    background: BrandColors.primarySoft,
  },
  {
    id: 'stores',
    title: 'Tiendas',
    text: 'Consulta el mapa local',
    icon: 'map-outline' as const,
    color: '#93620b',
    background: BrandColors.yellowSoft,
  },
  {
    id: 'sales',
    title: 'Mis ventas',
    text: 'Revisa tus registros',
    icon: 'stats-chart-outline' as const,
    color: BrandColors.orange,
    background: BrandColors.orangeSoft,
  },
  {
    id: 'account',
    title: 'Mi cuenta',
    text: 'Consulta tu perfil',
    icon: 'person-circle-outline' as const,
    color: BrandColors.primary,
    background: BrandColors.primarySoft,
  },
] as const;

export function WelcomeScreen() {
  const { user, isComercio } = useAuth();
  const { isDark, colors: BrandColors, toggleTheme } = useAppTheme();
  const userId = user?.id_usuario;
  const firstName = user?.nombre?.trim().split(/\s+/)[0];
  const [budget, setBudget] = useState<BudgetSnapshot | null>(null);
  const [upcomingBudgetStart, setUpcomingBudgetStart] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!userId || isComercio) {
      setBudget(null);
      setUpcomingBudgetStart(null);
      setSummaryError(false);
      setSummaryLoading(false);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(false);
    try {
      const [budgets, purchases, movements] = await Promise.all([
        obtenerPresupuestos(userId),
        obtenerCompras(userId),
        obtenerMovimientosHogar(userId),
      ]);
      const today = localDate();
      const activeBudgets = budgets.filter((item) => item.pre_estado === 1);
      const currentBudget = activeBudgets.find(
        (item) => item.fecha_inicio <= today && item.fecha_fin >= today
      );
      const upcomingBudget = activeBudgets
        .filter((item) => item.fecha_inicio > today)
        .sort((left, right) => left.fecha_inicio.localeCompare(right.fecha_inicio))[0];

      setUpcomingBudgetStart(upcomingBudget?.fecha_inicio ?? null);
      if (!currentBudget) {
        setBudget(null);
        return;
      }

      const marketPurchases = totalPurchasesForBudget(purchases, currentBudget);
      const otherExpenses = totalExpensesForBudget(movements, currentBudget);
      setBudget({
        name: currentBudget.nombre,
        amount: Number(currentBudget.monto),
        spent: marketPurchases + otherExpenses,
        daysRemaining: daysUntil(currentBudget.fecha_fin, today),
      });
    } catch (error) {
      console.error('No se pudo cargar el resumen del presupuesto:', error);
      setBudget(null);
      setUpcomingBudgetStart(null);
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  }, [isComercio, userId]);

  useFocusEffect(useCallback(() => {
    void loadSummary();
  }, [loadSummary]));

  const openAction = (action: string) => {
    switch (action) {
      case 'expense':
        if (user) setExpenseModalVisible(true);
        else router.push('/login');
        break;
      case 'list':
        router.push('/(tabs)/lista-compra');
        break;
      case 'prices':
      case 'catalog':
        router.push('/(tabs)/productos');
        break;
      case 'savings':
        router.push(user ? '/metas-ahorro' : '/login');
        break;
      case 'stores':
        router.push('/(tabs)/mapa-tiendas');
        break;
      case 'sales':
        router.push('/(tabs)/presupuesto');
        break;
      case 'account':
        router.push('/(tabs)/cuenta');
        break;
    }
  };

  const actions = isComercio ? COMMERCE_ACTIONS : QUICK_ACTIONS;
  const remaining = budget ? budget.amount - budget.spent : 0;
  const spentPercent = budget && budget.amount > 0
    ? Math.min((budget.spent / budget.amount) * 100, 100)
    : 0;
  const overBudget = Boolean(budget && remaining < 0);
  const needsAttention = Boolean(budget && spentPercent >= 80);
  const statusColor = overBudget
    ? BrandColors.red
    : needsAttention
    ? '#93620b'
    : BrandColors.primary;
  const statusText = overBudget
    ? `Has superado el límite por ${currency(Math.abs(remaining))}.`
    : needsAttention
    ? `Ya usaste el ${Math.round(spentPercent)}% de tu presupuesto.`
    : `Vas bien: has usado el ${Math.round(spentPercent)}% de tu presupuesto.`;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: BrandColors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <AppLogo size={46} />
            <View>
              <Text style={styles.brandName}>Mi Canasta</Text>
              <Text style={styles.brandCaption}>RIOHACHA · LA GUAJIRA</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleTheme}
              style={({ pressed }) => [styles.themeButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              accessibilityHint="Cambia la apariencia visual de la aplicación"
            >
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={19} color={BrandColors.primary} />
            </Pressable>
            <BotonLecturaVoz
              texto={user
                ? `Hola ${firstName || 'bienvenido'} a Mi Canasta. Revisa cuánto te queda, registra gastos y organiza tu mercado.`
                : 'Bienvenido a Mi Canasta. Compara precios, prepara tu lista y organiza el gasto de tu hogar.'}
              size="pequeno"
              etiqueta="Voz"
            />
            <Pressable
              onPress={() => router.push('/(tabs)/cuenta')}
              style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={user ? 'Abrir mi cuenta' : 'Iniciar sesión o crear cuenta'}
              accessibilityHint="Abre tu perfil y opciones de cuenta"
            >
              <Ionicons name={user ? 'person' : 'person-outline'} size={21} color={BrandColors.primary} />
            </Pressable>
          </View>
        </View>

        {isComercio ? (
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="storefront-outline" size={23} color={BrandColors.primary} />
            </View>
            <Text style={styles.eyebrow}>PARA TU COMERCIO</Text>
            <Text style={styles.welcomeTitle}>Hola, {firstName || 'bienvenido'}</Text>
            <Text style={styles.welcomeText}>Actualiza tu catálogo y consulta las ventas registradas.</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/presupuesto')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Consultar las ventas de mi comercio"
            >
              <Text style={styles.primaryButtonText}>Ver mis ventas</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </Pressable>
          </View>
        ) : !user ? (
          <View style={styles.welcomeCard}>
            <Text style={styles.eyebrow}>TU MERCADO, A TU MANERA</Text>
            <Text style={styles.welcomeTitle}>Compra con más tranquilidad</Text>
            <Text style={styles.welcomeText}>Compara precios, prepara tu lista y cuida el dinero de tu hogar.</Text>
          </View>
        ) : summaryLoading ? (
          <View style={styles.summaryCard} accessibilityLiveRegion="polite">
            <ActivityIndicator color={BrandColors.primary} accessibilityLabel="Consultando cuánto queda del presupuesto" />
            <Text style={styles.summaryHint}>Consultando tu presupuesto…</Text>
          </View>
        ) : summaryError ? (
          <View style={styles.summaryCard}>
            <View style={[styles.statusIcon, { backgroundColor: BrandColors.orangeSoft }]}>
              <Ionicons name="refresh-outline" size={22} color={BrandColors.orange} />
            </View>
            <Text style={styles.summaryTitle}>No pudimos actualizar tu saldo</Text>
            <Text style={styles.summaryHint}>Tus registros siguen guardados. Intenta cargar el resumen otra vez.</Text>
            <Pressable
              onPress={() => void loadSummary()}
              style={styles.retryButton}
              accessibilityRole="button"
              accessibilityLabel="Volver a consultar mi presupuesto"
            >
              <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
            </Pressable>
          </View>
        ) : budget ? (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeading}>
              <View style={styles.balanceIcon}>
                <Ionicons name="wallet-outline" size={20} color={BrandColors.primary} />
              </View>
              <View style={styles.balanceHeadingCopy}>
                <Text style={styles.eyebrow}>TU MERCADO</Text>
                <Text style={styles.budgetName} numberOfLines={1}>{budget.name}</Text>
              </View>
              <Ionicons name="sunny-outline" size={21} color={BrandColors.orange} />
            </View>
            <Text style={styles.balanceLabel}>{overBudget ? 'Te pasaste por' : 'Te quedan'}</Text>
            <Text
              style={[styles.balanceAmount, overBudget && styles.overBudgetAmount]}
              accessibilityLabel={`${currency(Math.abs(remaining))} pesos ${overBudget ? 'por encima del presupuesto' : 'disponibles'}`}
            >
              {currency(Math.abs(remaining))}
            </Text>
            <Text style={styles.balanceContext}>
              {overBudget ? 'Revisa tus gastos con calma.' : `Para ${budget.daysRemaining} ${budget.daysRemaining === 1 ? 'día' : 'días'} de mercado.`}
            </Text>
            <View
              style={styles.progressTrack}
              accessibilityRole="text"
              accessibilityLabel={`Has usado el ${Math.round(spentPercent)} por ciento de ${currency(budget.amount)}.`}
            >
              <View style={[styles.progressFill, { width: `${spentPercent}%`, backgroundColor: statusColor }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Gastado: {currency(budget.spent)}</Text>
              <Text style={styles.progressLabel}>Meta: {currency(budget.amount)}</Text>
            </View>
            <View style={styles.statusRow} accessibilityLiveRegion="polite">
              <Ionicons
                name={overBudget ? 'alert-circle-outline' : needsAttention ? 'warning-outline' : 'checkmark-circle-outline'}
                size={19}
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.summaryCard}>
            <View style={styles.statusIcon}>
              <Ionicons name="basket-outline" size={23} color={BrandColors.primary} />
            </View>
            <Text style={styles.summaryTitle}>
              {upcomingBudgetStart
                ? `Tu próximo presupuesto empieza el ${formatShortDate(upcomingBudgetStart)}`
                : 'Tu saldo estará aquí'}
            </Text>
            <Text style={styles.summaryHint}>
              {upcomingBudgetStart
                ? 'Cuando empiece el periodo, verás cuánto te queda para tu mercado.'
                : 'Crea un presupuesto para saber cuánto dinero te queda durante el mes.'}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/presupuesto')}
              style={styles.retryButton}
              accessibilityRole="button"
              accessibilityLabel="Configurar mi presupuesto"
            >
              <Text style={styles.retryButtonText}>{upcomingBudgetStart ? 'Ver presupuesto' : 'Crear presupuesto'}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {isComercio ? 'Tus accesos principales' : '¿Qué necesitas hoy?'}
            </Text>
            <Text style={styles.sectionCaption}>
              {isComercio ? 'Herramientas para tu negocio' : 'Elige una opción para empezar'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          {actions.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => openAction(action.id)}
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: action.background },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${action.title}. ${action.text}`}
              accessibilityHint={`Abre ${action.title}`}
            >
              <View style={[styles.actionIcon, { backgroundColor: BrandColors.surface }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionText}>{action.text}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/chat')}
          style={({ pressed }) => [styles.assistantCard, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Abrir el asistente de compras"
          accessibilityHint="Pide ideas para organizar tu mercado"
        >
          <View style={styles.assistantIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={21} color={BrandColors.orange} />
          </View>
          <View style={styles.assistantCopy}>
            <Text style={styles.assistantTitle}>¿Necesitas una idea para tu mercado?</Text>
            <Text style={styles.assistantText}>Consulta el asistente de compras.</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={BrandColors.primary} />
        </Pressable>
      </ScrollView>

      {user && !isComercio ? (
        <QuickExpenseModal
          visible={expenseModalVisible}
          idUsuario={user.id_usuario}
          onClose={() => setExpenseModalVisible(false)}
          onSuccess={() => void loadSummary()}
        />
      ) : null}
    </>
  );
}

function totalPurchasesForBudget(purchases: Compra[], budget: Presupuesto): number {
  return purchases.reduce((total, purchase) => {
    const date = purchaseDate(purchase.fecha_compra);
    return date >= budget.fecha_inicio && date <= budget.fecha_fin
      ? total + Number(purchase.total || 0)
      : total;
  }, 0);
}

function totalExpensesForBudget(movements: MovimientoHogar[], budget: Presupuesto): number {
  return movements.reduce((total, movement) => {
    const inBudget = movement.tipo === 'gasto'
      && movement.fecha >= budget.fecha_inicio
      && movement.fecha <= budget.fecha_fin;
    return inBudget ? total + Number(movement.monto || 0) : total;
  }, 0);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 16,
    paddingTop: 14,
    paddingBottom: 108,
    gap: 18,
  },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  themeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: BrandColors.border, backgroundColor: BrandColors.surfaceElevated },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { color: BrandColors.primary, fontSize: 18, fontWeight: '800' },
  brandCaption: { color: BrandColors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.7, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surfaceElevated,
  },
  welcomeCard: {
    gap: 10,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
    boxShadow: '0px 10px 28px rgba(0, 0, 0, 0.16)',
  },
  welcomeIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: BrandColors.primarySoft,
  },
  eyebrow: { color: BrandColors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  welcomeTitle: { color: BrandColors.text, fontSize: 26, lineHeight: 32, fontWeight: '800' },
  welcomeText: { color: BrandColors.muted, fontSize: 16, lineHeight: 23 },
  primaryButton: {
    minHeight: 50,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 17,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
  },
  primaryButtonText: { color: '#08202b', fontSize: 16, fontWeight: '800' },
  summaryCard: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
  },
  statusIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: BrandColors.primarySoft,
  },
  summaryTitle: { color: BrandColors.text, fontSize: 19, lineHeight: 25, fontWeight: '800', textAlign: 'center' },
  summaryHint: { color: BrandColors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  retryButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: BrandColors.primarySoft,
  },
  retryButtonText: { color: BrandColors.primary, fontSize: 15, fontWeight: '800' },
  balanceCard: {
    gap: 8,
    padding: 19,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dce8d7',
    backgroundColor: '#f1f7e9',
  },
  balanceHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: BrandColors.surface,
  },
  balanceHeadingCopy: { flex: 1, gap: 2 },
  budgetName: { color: BrandColors.muted, fontSize: 14, fontWeight: '600' },
  balanceLabel: { color: BrandColors.primary, fontSize: 15, fontWeight: '800', marginTop: 8 },
  balanceAmount: { color: BrandColors.primary, fontSize: 38, lineHeight: 46, fontWeight: '900' },
  overBudgetAmount: { color: BrandColors.red },
  balanceContext: { color: BrandColors.text, fontSize: 16, lineHeight: 23 },
  progressTrack: { height: 12, overflow: 'hidden', marginTop: 8, borderRadius: 8, backgroundColor: '#e5e3d6' },
  progressFill: { height: '100%', borderRadius: 8 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  progressLabel: { color: BrandColors.muted, fontSize: 12, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 3 },
  statusText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  sectionHeading: { marginTop: 1 },
  sectionTitle: { color: BrandColors.text, fontSize: 19, fontWeight: '800' },
  sectionCaption: { color: BrandColors.muted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  actionCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 142,
    minHeight: 138,
    justifyContent: 'center',
    gap: 7,
    padding: 15,
    borderRadius: 19,
  },
  actionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  actionTitle: { color: BrandColors.text, fontSize: 16, fontWeight: '800' },
  actionText: { color: BrandColors.muted, fontSize: 14, lineHeight: 19 },
  assistantCard: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#f0d7b6',
    backgroundColor: '#fff3e4',
  },
  assistantIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: BrandColors.surface },
  assistantCopy: { flex: 1, gap: 3 },
  assistantTitle: { color: BrandColors.text, fontSize: 15, fontWeight: '800' },
  assistantText: { color: BrandColors.muted, fontSize: 14, lineHeight: 19 },
  pressed: { opacity: 0.78 },
});
