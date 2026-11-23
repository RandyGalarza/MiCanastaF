import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { obtenerComercios } from '@/repositories/comercioRepository';
import { getDatabase } from '@/database/database';
import { Comercio } from '@/types/database';
import { StoreMap } from '@/components/store-map';

type StoreWithPrice = Comercio & {
  canasta_estimada?: number | null;
  productos_con_precio?: number;
  precios_por_producto: Record<number, number>;
};
type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
const DEFAULT_REGION: Region = { latitude: 11.5449, longitude: -72.9072, latitudeDelta: 0.12, longitudeDelta: 0.12 };
const NEARBY_RADIUS_KM = 3;
const money = (value?: number | null) => value == null ? 'Sin precios registrados' : `$${Number(value).toLocaleString('es-CO')}`;

function hasValidLocation(store: Pick<Comercio, 'latitud' | 'longitud'>) {
  const latitude = Number(store.latitud);
  const longitude = Number(store.longitud);
  return store.latitud != null && store.longitud != null &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function regionForStores(stores: StoreWithPrice[]): Region | null {
  const located = stores.filter(hasValidLocation);
  if (located.length === 0) return null;

  const latitudes = located.map((store) => Number(store.latitud));
  const longitudes = located.map((store) => Number(store.longitud));
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);

  return {
    latitude: (minimumLatitude + maximumLatitude) / 2,
    longitude: (minimumLongitude + maximumLongitude) / 2,
    latitudeDelta: Math.max((maximumLatitude - minimumLatitude) * 1.5, 0.025),
    longitudeDelta: Math.max((maximumLongitude - minimumLongitude) * 1.5, 0.025),
  };
}

export default function MapaTiendasScreen() {
  const [stores, setStores] = useState<StoreWithPrice[]>([]);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState(false);

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [commerceList, db] = await Promise.all([obtenerComercios(), getDatabase()]);
      const prices = await db.getAllAsync<{ id_producto: number; id_comercio: number; precio: number; disponible: number }>('SELECT id_producto, id_comercio, precio, disponible FROM precios');
      const pricesByStore = new Map<number, Record<number, number>>();
      for (const price of prices) {
        const storeId = Number(price.id_comercio);
        const productId = Number(price.id_producto);
        const amount = Number(price.precio);
        if (
          Number(price.disponible ?? 1) !== 1 ||
          !Number.isFinite(amount) ||
          amount <= 0 ||
          !Number.isInteger(storeId) ||
          !Number.isInteger(productId)
        ) continue;
        const storePrices = pricesByStore.get(storeId) ?? {};
        storePrices[productId] = Math.min(storePrices[productId] ?? Infinity, amount);
        pricesByStore.set(storeId, storePrices);
      }
      const enriched = commerceList.map((store) => {
        return { ...store, precios_por_producto: pricesByStore.get(Number(store.id_comercio)) ?? {} };
      });
      setStores(enriched);
      const storeRegion = regionForStores(enriched);
      if (storeRegion) setRegion(storeRegion);
    } catch (loadError) {
      console.error('No se pudo cargar el mapa de tiendas:', loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadStores(); }, [loadStores]));

  const locatedStores = useMemo(() => stores.filter(hasValidLocation), [stores]);
  const hasDemoReferenceAddresses = useMemo(
    () => stores.some((store) => /\(referencia demo\)/i.test(store.direccion ?? '')),
    [stores]
  );
  const storesInRange = useMemo(() => userLocation
    ? locatedStores.filter((store) =>
        distance(userLocation.latitude, userLocation.longitude, Number(store.latitud), Number(store.longitud)) <= NEARBY_RADIUS_KM
      )
    : [], [locatedStores, userLocation]);
  const commonProductIds = useMemo(() => {
    const storesWithPrices = storesInRange.filter((store) => Object.keys(store.precios_por_producto).length > 0);
    if (storesWithPrices.length === 0) return [];
    return Object.keys(storesWithPrices[0].precios_por_producto)
      .map(Number)
      .filter((productId) => storesWithPrices.every((store) => store.precios_por_producto[productId] != null));
  }, [storesInRange]);
  const comparableStores = useMemo(() => storesInRange.map((store) => ({
    ...store,
    canasta_estimada: commonProductIds.length > 0 && commonProductIds.every((productId) =>
      Number.isFinite(store.precios_por_producto[productId])
    )
      ? commonProductIds.reduce((sum, productId) => sum + store.precios_por_producto[productId], 0)
      : null,
    productos_con_precio: commonProductIds.length > 0 && commonProductIds.every((productId) =>
      Number.isFinite(store.precios_por_producto[productId])
    ) ? commonProductIds.length : 0,
  })), [commonProductIds, storesInRange]);
  const sortedNearby = useMemo(() => userLocation
    ? [...comparableStores].sort((a, b) =>
        distance(userLocation.latitude, userLocation.longitude, Number(a.latitud), Number(a.longitud)) -
        distance(userLocation.latitude, userLocation.longitude, Number(b.latitud), Number(b.longitud))
      )
    : locatedStores, [comparableStores, locatedStores, userLocation]);
  const cheapest = useMemo(() => {
    const storesWithComparablePrices = comparableStores.filter((store) => store.canasta_estimada != null);
    return userLocation && storesWithComparablePrices.length > 1
      ? storesWithComparablePrices.sort((a, b) => Number(a.canasta_estimada) - Number(b.canasta_estimada))[0]
      : undefined;
  }, [comparableStores, userLocation]);
  const selectedStore = sortedNearby.find((store) => store.id_comercio === selected);
  const nativeMapConfigured = Platform.OS !== 'android' || Constants.expoConfig?.extra?.googleMapsApiKeyConfigured === true;

  const locateUser = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setLocationMessage('Puedes usar el mapa sin ubicación. Activa el permiso cuando quieras ver las tiendas más cercanas.'); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation(location.coords);
      setRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 });
      setLocationMessage('');
    } catch {
      setLocationMessage('No pudimos obtener la ubicación. Puedes explorar el mapa manualmente.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headingIcon}><Ionicons name="map-outline" size={22} color="#168344" /></View>
        <View style={styles.headingCopy}><Text style={styles.title} accessibilityRole="header">Tiendas cerca de ti</Text><Text style={styles.subtitle}>Compara precios y encuentra mercados</Text></View>
        <Pressable onPress={() => void locateUser()} style={styles.locationButton} accessibilityRole="button" accessibilityLabel="Centrar mapa en mi ubicación"><Ionicons name="locate-outline" size={19} color="#166534" /></Pressable>
      </View>
      {hasDemoReferenceAddresses
        ? <Text style={styles.demoNotice}>Las direcciones de referencia demo son aleatorias y no están verificadas.</Text>
        : null}
      {cheapest && <View style={styles.cheapestCard}><Ionicons name="pricetag-outline" size={18} color="#15803d"/><Text style={styles.cheapestText}>Menor precio a menos de 3 km, para {commonProductIds.length} productos en común: <Text style={styles.bold}>{cheapest.nombre}</Text> · {money(cheapest.canasta_estimada)}</Text></View>}
      {locationMessage ? <Text style={styles.notice}>{locationMessage}</Text> : null}
      {userLocation && !cheapest && !loading && !error ? <Text style={styles.notice}>Para recomendar la opción más barata necesitamos al menos dos tiendas con precios registrados para los mismos productos dentro de 3 km.</Text> : null}
      <View style={styles.mapArea}>
        {nativeMapConfigured
          ? <StoreMap stores={userLocation ? comparableStores : sortedNearby} cheapestId={cheapest?.id_comercio} region={region} onRegionChange={setRegion} userLocation={userLocation ?? undefined} showsUserLocation={Boolean(userLocation)} onSelect={setSelected} />
          : <View style={styles.mapNotice}><Ionicons name="map-outline" size={20} color="#b45309"/><Text style={styles.muted}>Configura GOOGLE_MAPS_API_KEY en el entorno de compilación de Android para habilitar el mapa.</Text></View>}
        {loading ? <View style={styles.mapNotice}><ActivityIndicator color="#168344"/><Text style={styles.muted}>Cargando tiendas…</Text></View> : error ? <View style={styles.mapNotice}><Ionicons name="cloud-offline-outline" size={20} color="#64748b"/><Text style={styles.muted}>No pudimos cargar las tiendas.</Text><Pressable onPress={() => void loadStores()}><Text style={styles.retry}>Intentar de nuevo</Text></Pressable></View> : locatedStores.length === 0 ? <View pointerEvents="none" style={styles.mapNotice}><Ionicons name="location-outline" size={20} color="#168344"/><Text style={styles.muted}>Mapa de Riohacha · Agrega coordenadas a los comercios para ver sus marcadores.</Text></View> : null}
        {selectedStore && <View style={styles.selectedCard}><Text style={styles.bold} numberOfLines={1}>{selectedStore.nombre}</Text><Text style={styles.muted} numberOfLines={2}>{selectedStore.direccion || selectedStore.tipo_comercio || 'Comercio local'} · {userLocation ? `Productos en común: ${money(selectedStore.canasta_estimada)}` : 'Activa tu ubicación para comparar precios.'}</Text></View>}
      </View>
      <View style={styles.listHeader}><Text style={styles.listTitle}>Comercios</Text><Text style={styles.muted}>{userLocation ? `${sortedNearby.length} cercanos` : `${locatedStores.length} ubicados`} · {stores.length - locatedStores.length} sin ubicación</Text></View>
      <ScrollView horizontal style={styles.storeScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeRow}>
        {sortedNearby.map((store) => <Pressable key={store.id_comercio} onPress={() => { setSelected(store.id_comercio); setRegion({ latitude: Number(store.latitud), longitude: Number(store.longitud), latitudeDelta: 0.035, longitudeDelta: 0.035 }); }} style={[styles.storeCard, selected === store.id_comercio && styles.storeSelected]}><View style={styles.storeIcon}><Ionicons name="storefront-outline" size={15} color="#168344"/></View><View style={styles.storeCopy}><Text style={styles.storeName} numberOfLines={1}>{store.nombre}</Text><Text style={styles.storePrice} numberOfLines={1}>{userLocation ? `${money(store.canasta_estimada)} · ${distance(userLocation.latitude, userLocation.longitude, Number(store.latitud), Number(store.longitud)).toFixed(1)} km` : 'Ver en mapa'}</Text></View></Pressable>)}
        {sortedNearby.length === 0 && !loading ? <Text style={styles.muted}>{userLocation ? 'No hay comercios con coordenadas dentro de 3 km.' : 'Agrega coordenadas a los comercios y activa tu ubicación para comparar precios.'}</Text> : null}
      </ScrollView>
    </View>
  );
}

function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1); const deltaLon = radians(lon2 - lon1);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9f6', paddingTop: 12 },
  demoNotice: { marginHorizontal: 16, marginTop: 5, color: '#64748b', fontSize: 10 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  headingIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#eaf5e9', alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, gap: 3 }, title: { color: '#193d27', fontSize: 18, fontWeight: '800' }, subtitle: { color: '#718076', fontSize: 11 },
  locationButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce5dc', alignItems: 'center', justifyContent: 'center' },
  cheapestCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 9, padding: 11, borderRadius: 14, backgroundColor: '#eaf5e9' }, cheapestText: { flex: 1, color: '#365e3e', fontSize: 11 }, bold: { color: '#14532d', fontWeight: '800' }, notice: { marginHorizontal: 16, marginTop: 8, color: '#92400e', fontSize: 11 },
  mapArea: { flex: 1, minHeight: 220, position: 'relative' }, mapNotice: { position: 'absolute', left: 24, right: 24, top: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, backgroundColor: '#ffffff', boxShadow: '0px 3px 10px rgba(31,56,38,0.14)' }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }, muted: { color: '#718076', fontSize: 11, textAlign: 'center' }, retry: { color: '#168344', fontWeight: '800', padding: 8 },
  selectedCard: { position: 'absolute', bottom: 8, left: 10, right: 10, padding: 8, borderRadius: 11, backgroundColor: '#ffffff', boxShadow: '0px 3px 10px rgba(31,56,38,0.14)', gap: 2 }, listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 5, paddingBottom: 3 }, listTitle: { color: '#193d27', fontSize: 12, fontWeight: '800' }, storeScroll: { flexGrow: 0, flexShrink: 0 }, storeRow: { gap: 6, paddingHorizontal: 12, paddingBottom: 5 }, storeCard: { width: 176, height: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' }, storeSelected: { borderColor: '#86c992' }, storeIcon: { width: 27, height: 27, borderRadius: 8, backgroundColor: '#eaf5e9', alignItems: 'center', justifyContent: 'center' }, storeCopy: { flex: 1, gap: 1 }, storeName: { color: '#193d27', fontSize: 10, fontWeight: '800' }, storePrice: { color: '#168344', fontSize: 9, fontWeight: '800' },
});
