import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { obtenerCatalogoParaRecomendacion } from '@/repositories/productoRepository';
import type { ProductoParaRecomendacion } from '@/repositories/productoRepository';
import { recomendarRecetasEconomicas } from '@/utils/recetas-economicas';

const money = (value: number) => `$${Number(value).toLocaleString('es-CO')}`;
const parseAmount = (value: string) => Number(value.replace(/\D/g, ''));

export default function RecetasEconomicasScreen() {
  const [catalog, setCatalog] = useState<ProductoParaRecomendacion[]>([]);
  const [budgetText, setBudgetText] = useState('30000');
  const [budget, setBudget] = useState(30000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const recipes = useMemo(() => recomendarRecetasEconomicas(catalog, budget), [budget, catalog]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCatalog(await obtenerCatalogoParaRecomendacion());
    } catch (loadError) {
      console.error('No se pudo cargar el catálogo para las recetas:', loadError);
      setError('No pudimos consultar los precios del catálogo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadCatalog(); }, [loadCatalog]));

  const applyBudget = () => {
    const parsedBudget = parseAmount(budgetText);
    if (!Number.isSafeInteger(parsedBudget) || parsedBudget <= 0) {
      setError('Ingresa un presupuesto entero mayor que cero.');
      return;
    }
    setError('');
    setBudget(parsedBudget);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Link href="/presupuesto" style={styles.backButton} accessibilityRole="link" accessibilityLabel="Volver al presupuesto">
          <Ionicons name="arrow-back" size={20} color="#166534" />
        </Link>
        <View style={styles.headerCopy}>
          <Text style={styles.title} accessibilityRole="header">Recetas económicas</Text>
          <Text style={styles.muted}>Ideas costeñas con productos del catálogo local</Text>
        </View>
      </View>

      <View style={styles.budgetCard}>
        <Text style={styles.budgetLabel}>¿Cuánto quieres gastar en los ingredientes?</Text>
        <View style={styles.budgetRow}>
          <TextInput value={budgetText} onChangeText={setBudgetText} style={styles.budgetInput} placeholder="30000" keyboardType="numeric" maxLength={14} accessibilityLabel="Presupuesto para las recetas en pesos colombianos" />
          <Pressable onPress={applyBudget} style={styles.applyButton} accessibilityRole="button"><Text style={styles.applyText}>Aplicar</Text></Pressable>
        </View>
        <Text style={styles.budgetHint}>El estimado considera comprar un empaque de cada ingrediente; las porciones pueden dejar sobrantes y los precios varían por tienda.</Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.error} accessibilityRole="alert">{error}</Text>
          {loading ? null : <Pressable onPress={() => void loadCatalog()}><Text style={styles.retry}>Volver a cargar precios</Text></Pressable>}
        </View>
      ) : null}
      {loading ? (
        <View style={styles.emptyCard}><ActivityIndicator color="#168344" /><Text style={styles.muted}>Buscando ingredientes y precios…</Text></View>
      ) : recipes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="restaurant-outline" size={28} color="#168344" />
          <Text style={styles.emptyTitle}>No encontramos recetas con ese tope</Text>
          <Text style={styles.muted}>Prueba con un monto mayor o verifica que el catálogo tenga precios para los ingredientes.</Text>
        </View>
      ) : recipes.map((recipe) => (
        <View key={recipe.id} style={styles.recipeCard}>
          <View style={styles.recipeHeader}>
            <View style={styles.recipeIcon}><Ionicons name="restaurant-outline" size={20} color="#168344" /></View>
            <View style={styles.recipeCopy}>
              <Text style={styles.recipeTitle}>{recipe.nombre}</Text>
              <Text style={styles.recipeMeta}>{recipe.origen} · {recipe.porciones} porciones</Text>
            </View>
          </View>
          <View style={styles.estimateRow}>
            <Text style={styles.estimateLabel}>Ingredientes estimados</Text>
            <Text style={styles.estimateAmount}>{money(recipe.costoEstimado)}</Text>
          </View>
          <Text style={styles.subheading}>Ingredientes</Text>
          {recipe.ingredientes.map((ingredient) => (
            <View key={ingredient.producto.id_producto} style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>{ingredient.cantidad} · {ingredient.producto.nombre}</Text>
              <Text style={styles.ingredientCost}>{money(ingredient.costoEstimado)}</Text>
            </View>
          ))}
          <Text style={styles.subheading}>Preparación</Text>
          {recipe.preparacion.map((step, index) => (
            <Text key={`${recipe.id}-step-${index}`} style={styles.step}>{index + 1}. {step}</Text>
          ))}
          <View style={styles.nutritionNote}>
            <Ionicons name="leaf-outline" size={17} color="#166534" />
            <Text style={styles.nutritionText}>{recipe.orientacionNutricional}</Text>
          </View>
        </View>
      ))}
      <Text style={styles.disclaimer}>Las cantidades y costos son orientativos, no sustituyen recomendaciones nutricionales profesionales.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9f6' },
  content: { padding: 18, paddingBottom: 36, gap: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 3 },
  backButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#eaf5e9', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: '#193d27', fontSize: 20, fontWeight: '800' },
  muted: { color: '#718076', fontSize: 12, lineHeight: 18 },
  budgetCard: { padding: 15, borderRadius: 17, backgroundColor: '#14532d', gap: 8 },
  budgetLabel: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  budgetRow: { flexDirection: 'row', gap: 8 },
  budgetInput: { flex: 1, minHeight: 44, backgroundColor: '#ffffff', borderRadius: 11, paddingHorizontal: 12, color: '#193d27', fontSize: 14 },
  applyButton: { minWidth: 82, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#bbf7d0', paddingHorizontal: 13 },
  applyText: { color: '#14532d', fontSize: 12, fontWeight: '800' },
  budgetHint: { color: '#dcfce7', fontSize: 10, lineHeight: 15 },
  errorCard: { padding: 13, borderRadius: 13, backgroundColor: '#fef2f2', gap: 6 },
  error: { color: '#b91c1c', fontSize: 12 },
  retry: { color: '#168344', fontSize: 11, fontWeight: '800', paddingVertical: 5 },
  emptyCard: { minHeight: 120, backgroundColor: '#ffffff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  emptyTitle: { color: '#193d27', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  recipeCard: { padding: 15, borderRadius: 17, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7', gap: 9 },
  recipeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recipeIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#eaf5e9', alignItems: 'center', justifyContent: 'center' },
  recipeCopy: { flex: 1, gap: 3 },
  recipeTitle: { color: '#193d27', fontSize: 14, fontWeight: '800' },
  recipeMeta: { color: '#718076', fontSize: 10 },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#edf1ed' },
  estimateLabel: { color: '#536358', fontSize: 11, fontWeight: '700' },
  estimateAmount: { color: '#15803d', fontSize: 15, fontWeight: '900' },
  subheading: { color: '#365e3e', fontSize: 11, fontWeight: '800', marginTop: 2 },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  ingredientName: { flex: 1, color: '#536358', fontSize: 10, lineHeight: 15 },
  ingredientCost: { color: '#536358', fontSize: 10, fontWeight: '700' },
  step: { color: '#536358', fontSize: 10, lineHeight: 16 },
  nutritionNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 10, borderRadius: 11, backgroundColor: '#f0f7ef', marginTop: 2 },
  nutritionText: { flex: 1, color: '#365e3e', fontSize: 10, lineHeight: 15 },
  disclaimer: { color: '#718076', fontSize: 10, textAlign: 'center', lineHeight: 15, marginTop: 3 },
});
