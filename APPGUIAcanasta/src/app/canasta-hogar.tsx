import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { crearListaCompraConItems } from '@/repositories/listacompraRepository';
import {
  guardarIntegrantesHogar,
  obtenerPerfilHogar,
} from '@/repositories/perfilHogarRepository';
import {
  obtenerCatalogoParaRecomendacion,
  ProductoParaRecomendacion,
} from '@/repositories/productoRepository';
import { generarCanastaHogar } from '@/utils/canasta-hogar';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;

export default function CanastaHogarScreen() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<ProductoParaRecomendacion[]>([]);
  const [integrantes, setIntegrantes] = useState('4');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    if (!user) {
      setProductos([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      const [catalogo, perfil] = await Promise.all([
        obtenerCatalogoParaRecomendacion(),
        obtenerPerfilHogar(user.id_usuario),
      ]);
      setProductos(catalogo);
      setIntegrantes(String(perfil?.integrantes ?? 4));
    } catch (loadError) {
      console.error('No se pudo cargar la canasta del hogar:', loadError);
      setError('No pudimos cargar el catálogo o el tamaño del hogar.');
    } finally {
      setCargando(false);
    }
  }, [user]);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const miembros = Number(integrantes);
  const recomendaciones = useMemo(
    () => generarCanastaHogar(productos, miembros),
    [miembros, productos]
  );
  const total = recomendaciones.reduce(
    (sum, item) => sum + item.producto.precio * item.cantidad,
    0
  );

  const guardarPerfil = async () => {
    if (!user || guardando) return;
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await guardarIntegrantesHogar(user.id_usuario, miembros);
      setMensaje('Tamaño del hogar guardado en este dispositivo.');
    } catch (saveError) {
      console.error('No se pudo guardar el tamaño del hogar:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No pudimos guardar el tamaño del hogar.');
    } finally {
      setGuardando(false);
    }
  };

  const crearLista = async () => {
    if (!user || guardando) return;
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await guardarIntegrantesHogar(user.id_usuario, miembros);
      const idLista = await crearListaCompraConItems(
        user.id_usuario,
        `Canasta semanal · ${miembros} ${miembros === 1 ? 'persona' : 'personas'}`,
        recomendaciones.map((item) => ({
          id_producto: item.producto.id_producto,
          cantidad: item.cantidad,
        }))
      );
      router.push({ pathname: '/lista-compra', params: { id: String(idLista) } });
    } catch (createError) {
      console.error('No se pudo crear la canasta recomendada:', createError);
      setError(createError instanceof Error ? createError.message : 'No pudimos crear la lista.');
    } finally {
      setGuardando(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="people-outline" size={34} color="#166534" />
        <Text style={styles.title} accessibilityRole="header">Canasta de mi hogar</Text>
        <Text style={styles.muted}>Inicia sesión para guardar el tamaño de tu hogar y crear una lista semanal.</Text>
        <Link href="/login" style={styles.primaryButton} accessibilityRole="link">Iniciar sesión</Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Link href="/presupuesto" style={styles.backButton} accessibilityRole="link" accessibilityLabel="Volver al presupuesto">
          <Ionicons name="arrow-back" size={20} color="#166534" />
        </Link>
        <View style={styles.headerCopy}>
          <Text style={styles.title} accessibilityRole="header">Canasta de mi hogar</Text>
          <Text style={styles.muted}>Una referencia semanal que puedes ajustar en tu lista.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>¿Cuántas personas viven en tu hogar?</Text>
        <View style={styles.memberRow}>
          <TextInput
            value={integrantes}
            onChangeText={(value) => setIntegrantes(value.replace(/\D/g, '').slice(0, 2))}
            style={styles.memberInput}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Número de integrantes del hogar"
            accessibilityHint="Ingresa un número entre 1 y 20"
          />
          <Text style={styles.memberSuffix}>personas</Text>
          <Pressable
            onPress={() => void guardarPerfil()}
            disabled={guardando}
            style={styles.saveProfileButton}
            accessibilityRole="button"
            accessibilityLabel="Guardar tamaño del hogar"
            accessibilityState={{ disabled: guardando, busy: guardando }}
          >
            <Text style={styles.saveProfileText}>Guardar</Text>
          </Pressable>
        </View>
        <Text style={styles.helper}>El dato solo se guarda en este dispositivo y no incluye información de salud.</Text>
      </View>

      {cargando ? (
        <View style={styles.emptyCard} accessibilityLiveRegion="polite">
          <ActivityIndicator color="#168344" accessibilityLabel="Cargando productos" />
          <Text style={styles.muted}>Buscando productos con precio disponible…</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle} accessibilityRole="header">Ideas para una semana</Text>
              <Text style={styles.muted}>Cantidades orientativas para {miembros || 0} personas</Text>
            </View>
            <Text style={styles.total}>{currency(total)}</Text>
          </View>
          {recomendaciones.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.muted}>No encontramos estos productos con precios disponibles. Revisa el catálogo e inténtalo de nuevo.</Text>
            </View>
          ) : recomendaciones.map((item) => (
            <View key={item.producto.id_producto} style={styles.productCard}>
              <View style={styles.productIcon}><Ionicons name="basket-outline" size={19} color="#166534" /></View>
              <View style={styles.productCopy}>
                <Text style={styles.productGroup}>{item.grupo}</Text>
                <Text style={styles.productName}>{item.producto.nombre}</Text>
                <Text style={styles.productMeta}>{item.cantidad} {item.producto.unidad_medida} · desde {currency(item.producto.precio)}</Text>
              </View>
              <Text style={styles.productTotal}>{currency(item.producto.precio * item.cantidad)}</Text>
            </View>
          ))}
          <Text style={styles.disclaimer}>
            Es una guía general basada en productos y precios del catálogo, no una recomendación nutricional. Ajusta cantidades, marcas y alimentos según las necesidades de tu hogar.
          </Text>
          {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
          {mensaje ? <Text style={styles.successText} accessibilityLiveRegion="polite">{mensaje}</Text> : null}
          {recomendaciones.length > 0 ? (
            <Pressable
              onPress={() => void crearLista()}
              disabled={guardando || !Number.isInteger(miembros) || miembros < 1 || miembros > 20}
              style={[styles.primaryButton, guardando && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={guardando ? 'Creando lista de compra' : `Crear lista semanal para ${miembros} personas`}
              accessibilityState={{ disabled: guardando, busy: guardando }}
            >
              {guardando ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="cart-outline" size={18} color="#ffffff" />}
              <Text style={styles.primaryButtonText}>{guardando ? 'Creando…' : 'Crear lista semanal'}</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6' },
  content: { padding: 18, paddingBottom: 36, gap: 13 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 28, backgroundColor: '#f7f8f6' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f4e9' },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: '#14532d', fontSize: 21, fontWeight: '800' },
  muted: { color: '#475569', fontSize: 13, lineHeight: 19 },
  card: { gap: 10, padding: 15, borderRadius: 17, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d8e5d8' },
  fieldLabel: { color: '#334155', fontSize: 13, fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberInput: { width: 70, minHeight: 48, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, color: '#1e293b', fontSize: 16, textAlign: 'center' },
  memberSuffix: { flex: 1, color: '#334155', fontSize: 13 },
  saveProfileButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#eaf6eb' },
  saveProfileText: { color: '#166534', fontWeight: '800' },
  helper: { color: '#475569', fontSize: 11, lineHeight: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  sectionHeaderCopy: { flex: 1, gap: 2 },
  sectionTitle: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  total: { color: '#166534', fontSize: 15, fontWeight: '800' },
  emptyCard: { minHeight: 94, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  productCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 15, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  productIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#eaf6eb' },
  productCopy: { flex: 1, gap: 2 },
  productGroup: { color: '#166534', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  productName: { color: '#1e293b', fontSize: 13, fontWeight: '700' },
  productMeta: { color: '#475569', fontSize: 11 },
  productTotal: { color: '#1e293b', fontSize: 12, fontWeight: '800' },
  disclaimer: { color: '#475569', fontSize: 11, lineHeight: 17 },
  errorText: { color: '#991b1b', fontSize: 12, lineHeight: 18 },
  successText: { color: '#166534', fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#168344' },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
