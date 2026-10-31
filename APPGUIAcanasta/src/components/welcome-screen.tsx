import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';

const QUICK_TIPS = [
  { icon: 'list-outline' as const, title: 'Planea antes de salir', text: 'Arma tu lista y evita olvidar lo que necesitas.' },
  { icon: 'pricetag-outline' as const, title: 'Compara con calma', text: 'Consulta los precios disponibles por comercio.' },
  { icon: 'leaf-outline' as const, title: 'Compra con intención', text: 'Organiza tu mercado según tus necesidades.' },
];

const QUICK_ACTIONS = [
  {
    href: '/(tabs)/lista-compra' as const,
    icon: 'cart-outline' as const,
    title: 'Mi lista',
    text: 'Organiza tu próxima compra',
    color: '#15803d',
    background: '#dcfce7',
  },
  {
    href: '/(tabs)/productos' as const,
    icon: 'basket-outline' as const,
    title: 'Productos',
    text: 'Explora el catálogo',
    color: '#0369a1',
    background: '#e0f2fe',
  },
  {
    href: '/(tabs)/presupuesto' as const,
    icon: 'wallet-outline' as const,
    title: 'Presupuesto',
    text: 'Revisa tu planeación',
    color: '#7c3aed',
    background: '#ede9fe',
  },
  {
    href: '/historial-compras' as const,
    icon: 'receipt-outline' as const,
    title: 'Mis compras',
    text: 'Consulta tus facturas',
    color: '#b45309',
    background: '#fef3c7',
  },
];

export function WelcomeScreen() {
  const { user, isAdmin, isComercio } = useAuth();
  const firstName = user?.nombre?.trim().split(/\s+/)[0];
  const roleLabel = isAdmin ? 'Administrador' : isComercio ? 'Comercio afiliado' : 'Tu espacio personal';
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Buenos días' : greetingHour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Ionicons name="basket" size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.brandName}>Mi Canasta</Text>
            <Text style={styles.brandCaption}>RIOHACHA · LA GUAJIRA</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/cuenta')}
          style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={user ? 'Abrir mi cuenta' : 'Iniciar sesión o crear cuenta'}
        >
          <Ionicons name={user ? 'person' : 'person-outline'} size={19} color="#166534" />
        </Pressable>
      </View>

      <View style={[styles.hero, user ? styles.heroSignedIn : styles.heroGuest]}>
        <View style={styles.heroDecorationLarge} />
        <View style={styles.heroDecorationSmall} />
        <View style={styles.heroContent}>
          <View style={styles.heroEyebrow}>
            <Ionicons name={user ? 'sunny-outline' : 'sparkles-outline'} size={15} color="#bbf7d0" />
            <Text style={styles.eyebrowText}>
              {user ? greeting.toUpperCase() : 'TU MERCADO, MÁS SENCILLO'}
            </Text>
          </View>
          <Text style={styles.title}>
            {user ? `Hola, ${firstName || 'bienvenido'} 👋` : 'Tu mercado, mejor organizado'}
          </Text>
          <Text style={styles.heroText}>
            {user
              ? 'Todo listo para planear tu compra, revisar productos y llevar tus gastos al día.'
              : 'Encuentra productos, revisa precios y prepara tus compras en un solo lugar.'}
          </Text>
          {user ? (
            <View style={styles.rolePill}>
              <Ionicons
                name={isAdmin ? 'shield-checkmark-outline' : isComercio ? 'storefront-outline' : 'person-outline'}
                size={14}
                color="#dcfce7"
              />
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/(tabs)/productos')}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.heroButtonText}>Explorar productos</Text>
              <Ionicons name="arrow-forward" size={17} color="#14532d" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>{user ? 'Tus accesos rápidos' : 'Empieza por aquí'}</Text>
          <Text style={styles.sectionCaption}>
            {user ? 'Tus herramientas para organizar el mercado' : 'Lo esencial para organizar tus compras'}
          </Text>
        </View>
        <Ionicons name="apps-outline" size={21} color="#15803d" />
      </View>

      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.title}
            onPress={() => router.push(action.href)}
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
            accessibilityRole="button"
          >
            <View style={[styles.actionIcon, { backgroundColor: action.background }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionText}>{action.text}</Text>
            <Ionicons name="arrow-forward" size={16} color="#94a3b8" style={styles.actionArrow} />
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Ideas para tu próxima compra</Text>
          <Text style={styles.sectionCaption}>Pequeños hábitos que ayudan a organizarte</Text>
        </View>
        <Ionicons name="leaf-outline" size={21} color="#15803d" />
      </View>

      {QUICK_TIPS.map((tip, index) => (
        <View key={tip.title} style={styles.tipCard}>
          <View style={styles.tipNumber}>
            <Text style={styles.tipNumberText}>0{index + 1}</Text>
          </View>
          <View style={styles.tipIcon}>
            <Ionicons name={tip.icon} size={20} color="#15803d" />
          </View>
          <View style={styles.tipCopy}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        </View>
      ))}

      <View style={styles.localCard}>
        <View style={styles.localIcon}>
          <Ionicons name="location" size={18} color="#0369a1" />
        </View>
        <View style={styles.localCopy}>
          <Text style={styles.localTitle}>Hecho para Riohacha</Text>
          <Text style={styles.localText}>
            Explora el catálogo y compara la información disponible de los comercios locales.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6' },
  content: {
    padding: 18,
    paddingTop: 18,
    paddingBottom: 30,
    gap: 14,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803d',
  },
  brandName: { color: '#14532d', fontSize: 16, fontWeight: '800' },
  brandCaption: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },
  accountButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  hero: { position: 'relative', borderRadius: 25, padding: 22, overflow: 'hidden' },
  heroSignedIn: { backgroundColor: '#14532d' },
  heroGuest: { backgroundColor: '#166534' },
  heroContent: { zIndex: 1 },
  heroDecorationLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.07)',
    right: -78,
    top: -82,
  },
  heroDecorationSmall: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(134,239,172,0.1)',
    right: 28,
    bottom: -74,
  },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrowText: { color: '#bbf7d0', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#ffffff', fontSize: 28, lineHeight: 34, fontWeight: '800', marginTop: 12 },
  heroText: { maxWidth: 520, color: '#dcfce7', fontSize: 14, lineHeight: 21, marginTop: 8 },
  rolePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(220,252,231,0.25)',
  },
  rolePillText: { color: '#f0fdf4', fontSize: 11, fontWeight: '700' },
  heroButton: {
    alignSelf: 'flex-start',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 15,
    marginTop: 18,
    borderRadius: 13,
    backgroundColor: '#ffffff',
  },
  heroButtonText: { color: '#14532d', fontSize: 13, fontWeight: '800' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
    marginBottom: 1,
  },
  sectionTitle: { color: '#14532d', fontSize: 18, fontWeight: '800' },
  sectionCaption: { color: '#64748b', fontSize: 12, marginTop: 3 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    position: 'relative',
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 145,
    minHeight: 142,
    padding: 14,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eee7',
  },
  actionPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  actionText: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 3, paddingRight: 12 },
  actionArrow: { position: 'absolute', right: 13, bottom: 14 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5eee7',
  },
  tipNumber: { width: 24, alignItems: 'center' },
  tipNumberText: { color: '#94a3b8', fontSize: 10, fontWeight: '800' },
  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCopy: { flex: 1, gap: 3 },
  tipTitle: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  tipText: { color: '#64748b', fontSize: 11, lineHeight: 16 },
  localCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  localIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  localCopy: { flex: 1, gap: 3 },
  localTitle: { color: '#1e3a8a', fontSize: 13, fontWeight: '800' },
  localText: { color: '#1e40af', fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.76 },
});
