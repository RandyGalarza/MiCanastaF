import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const QUICK_TIPS = [
  { icon: 'list-outline' as const, title: 'Planea antes de salir', text: 'Arma tu lista y evita olvidar lo que necesitas.' },
  { icon: 'pricetag-outline' as const, title: 'Compara con calma', text: 'Consulta los precios del catálogo por comercio.' },
  { icon: 'leaf-outline' as const, title: 'Compra lo necesario', text: 'Organiza tu mercado según tu presupuesto.' },
];

export function WelcomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="basket" size={28} color="#ffffff" /></View>
        <Text style={styles.eyebrow}>MI CANASTA FAMILIAR</Text>
        <Text style={styles.title}>Tu mercado, mejor organizado</Text>
        <Text style={styles.heroText}>Encuentra productos, revisa precios y prepara tus compras para Riohacha.</Text>
        <Link href="/(tabs)/productos" asChild>
          <Text style={styles.heroLink}>Explorar productos  ›</Text>
        </Link>
        <Text style={styles.demoLabel}>Contenido informativo de ejemplo</Text>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Ideas para ahorrar</Text>
        <Text style={styles.sectionCaption}>Consejos prácticos para tu próxima compra</Text>
      </View>

      {QUICK_TIPS.map((tip) => (
        <View key={tip.title} style={styles.tipCard}>
          <View style={styles.tipIcon}><Ionicons name={tip.icon} size={21} color="#15803d" /></View>
          <View style={styles.tipCopy}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </View>
      ))}

      <View style={styles.promoCard}>
        <View style={styles.promoTag}><Ionicons name="sparkles" size={13} color="#92400e" /><Text style={styles.promoTagText}>EJEMPLO</Text></View>
        <Text style={styles.promoTitle}>Semana de la canasta</Text>
        <Text style={styles.promoText}>Pronto encontrarás aquí promociones y novedades de los comercios locales.</Text>
        <Text style={styles.promoFine}>Promoción ilustrativa. No corresponde a un descuento vigente.</Text>
      </View>

      <View style={styles.localCard}>
        <Ionicons name="location-outline" size={20} color="#0369a1" />
        <Text style={styles.localText}>Pensado para ayudarte a comparar comercios y productos disponibles en Riohacha.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 18, paddingTop: 24, paddingBottom: 32, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  hero: { backgroundColor: '#15803d', borderRadius: 24, padding: 22, overflow: 'hidden' },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  eyebrow: { color: '#bbf7d0', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#ffffff', fontSize: 27, lineHeight: 33, fontWeight: '800', marginTop: 7 },
  heroText: { color: '#dcfce7', fontSize: 14, lineHeight: 21, marginTop: 8 },
  heroLink: { alignSelf: 'flex-start', color: '#14532d', backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 10, fontWeight: '700', marginTop: 17 },
  demoLabel: { color: '#bbf7d0', fontSize: 10, marginTop: 14 },
  sectionHeading: { marginTop: 12, marginBottom: 2 },
  sectionTitle: { color: '#14532d', fontSize: 19, fontWeight: '800' },
  sectionCaption: { color: '#64748b', fontSize: 12, marginTop: 3 },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#dcfce7' },
  tipIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  tipCopy: { flex: 1, gap: 3 },
  tipTitle: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  tipText: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  promoCard: { padding: 17, marginTop: 5, borderRadius: 18, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  promoTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  promoTagText: { color: '#92400e', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  promoTitle: { color: '#713f12', fontSize: 17, fontWeight: '800', marginTop: 10 },
  promoText: { color: '#854d0e', fontSize: 13, lineHeight: 19, marginTop: 4 },
  promoFine: { color: '#a16207', fontSize: 10, marginTop: 10 },
  localCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eff6ff', padding: 13, borderRadius: 14, marginTop: 3 },
  localText: { flex: 1, color: '#1e40af', fontSize: 12, lineHeight: 18 },
});
