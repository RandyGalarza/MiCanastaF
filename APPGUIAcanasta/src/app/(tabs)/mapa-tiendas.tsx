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
      const firstLocated = enriched.find((store) =>
        store.latitud != null && store.longitud != null &&
        Number.isFinite(Number(store.latitud)) && Number.isFinite(Number(store.longitud)) &&
        Number(store.latitud) >= -90 && Number(store.latitud) <= 90 &&
        Number(store.longitud) >= -180 && Number(store.longitud) <= 180
      );
      if (firstLocated) setRegion({ ...DEFAULT_REGION, latitude: Number(firstLocated.latitud), longitude: Number(firstLocated.longitud) });
    } catch (loadError) {
      console.error('No se pudo cargar el mapa de tiendas:', loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadStores(); }, [loadStores]));

  const locatedStores = useMemo(() => stores.filter((store) =>
    store.latitud != null && store.longitud != null &&
    Number.isFinite(Number(store.latitud)) && Number.isFinite(Number(store.longitud)) &&
    Number(store.latitud) >= -90 && Number(store.latitud) <= 90 &&
    Number(store.longitud) >= -180 && Number(store.longitud) <= 180
  ), [stores]);
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
    : stores.filter((store) =>
        store.latitud != null &&
        store.longitud != null &&
        Number.isFinite(Number(store.latitud)) &&
        Number.isFinite(Number(store.longitud)) &&
        Number(store.latitud) >= -90 &&
        Number(store.latitud) <= 90 &&
        Number(store.longitud) >= -180 &&
        Number(store.longitud) <= 180
      ), [comparableStores, stores, userLocation]);
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
      {cheapest && <View style={styles.cheapestCard}><Ionicons name="pricetag-outline" size={18} color="#15803d"/><Text style={styles.cheapestText}>Menor precio a menos de 3 km, para {commonProductIds.length} productos en común: <Text style={styles.bold}>{cheapest.nombre}</Text> · {money(cheapest.canasta_estimada)}</Text></View>}
      {locationMessage ? <Text style={styles.notice}>{locationMessage}</Text> : null}
      {userLocation && !cheapest && !loading && !error ? <Text style={styles.notice}>Para recomendar la opción más barata necesitamos al menos dos tiendas con precios registrados para los mismos productos dentro de 3 km.</Text> : null}
      <View style={styles.mapArea}>
        {nativeMapConfigured
          ? <StoreMap stores={userLocation ? comparableStores : sortedNearby} cheapestId={cheapest?.id_comercio} region={region} onRegionChange={setRegion} showsUserLocation={Boolean(userLocation)} onSelect={setSelected} />
          : <View style={styles.mapNotice}><Ionicons name="map-outline" size={20} color="#b45309"/><Text style={styles.muted}>Configura GOOGLE_MAPS_API_KEY en el entorno de compilación de Android para habilitar el mapa.</Text></View>}
        {loading ? <View style={styles.mapNotice}><ActivityIndicator color="#168344"/><Text style={styles.muted}>Cargando tiendas…</Text></View> : error ? <View style={styles.mapNotice}><Ionicons name="cloud-offline-outline" size={20} color="#64748b"/><Text style={styles.muted}>No pudimos cargar las tiendas.</Text><Pressable onPress={() => void loadStores()}><Text style={styles.retry}>Intentar de nuevo</Text></Pressable></View> : locatedStores.length === 0 ? <View pointerEvents="none" style={styles.mapNotice}><Ionicons name="location-outline" size={20} color="#168344"/><Text style={styles.muted}>Mapa de Riohacha · Agrega coordenadas a los comercios para ver sus marcadores.</Text></View> : null}
        {selectedStore && <View style={styles.selectedCard}><Text style={styles.bold}>{selectedStore.nombre}</Text><Text style={styles.muted}>{selectedStore.direccion || selectedStore.tipo_comercio || 'Comercio local'} · {userLocation ? `Productos en común: ${money(selectedStore.canasta_estimada)}` : 'Activa tu ubicación para comparar precios a menos de 3 km.'}</Text></View>}
      </View>
      <View style={styles.listHeader}><Text style={styles.listTitle}>Comercios {userLocation ? 'a menos de 3 km' : 'en el mapa'}</Text><Text style={styles.muted}>{sortedNearby.length} en el mapa</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeRow}>
        {sortedNearby.map((store) => <Pressable key={store.id_comercio} onPress={() => { setSelected(store.id_comercio); setRegion({ latitude: Number(store.latitud), longitude: Number(store.longitud), latitudeDelta: 0.035, longitudeDelta: 0.035 }); }} style={[styles.storeCard, selected === store.id_comercio && styles.storeSelected]}><View style={styles.storeIcon}><Ionicons name="storefront-outline" size={18} color="#168344"/></View><View style={styles.storeCopy}><Text style={styles.storeName} numberOfLines={1}>{store.nombre}</Text><Text style={styles.storeMeta}>{store.direccion || store.tipo_comercio || 'Comercio local'}</Text><Text style={styles.storePrice}>{userLocation ? `Productos en común: ${money(store.canasta_estimada)}` : 'Ubica el mapa para comparar precios'}</Text></View><Text style={styles.distance}>{userLocation ? `${distance(userLocation.latitude, userLocation.longitude, Number(store.latitud), Number(store.longitud)).toFixed(1)} km` : ''}</Text></Pressable>)}
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
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  headingIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#eaf5e9', alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, gap: 3 }, title: { color: '#193d27', fontSize: 18, fontWeight: '800' }, subtitle: { color: '#718076', fontSize: 11 },
  locationButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce5dc', alignItems: 'center', justifyContent: 'center' },
  cheapestCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 9, padding: 11, borderRadius: 14, backgroundColor: '#eaf5e9' }, cheapestText: { flex: 1, color: '#365e3e', fontSize: 11 }, bold: { color: '#14532d', fontWeight: '800' }, notice: { marginHorizontal: 16, marginTop: 8, color: '#92400e', fontSize: 11 },
  mapArea: { flex: 1, minHeight: 220, position: 'relative' }, mapNotice: { position: 'absolute', left: 24, right: 24, top: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, backgroundColor: '#ffffff', boxShadow: '0px 3px 10px rgba(31,56,38,0.14)' }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }, muted: { color: '#718076', fontSize: 11, textAlign: 'center' }, retry: { color: '#168344', fontWeight: '800', padding: 8 },
  selectedCard: { position: 'absolute', bottom: 15, left: 16, right: 16, padding: 13, borderRadius: 15, backgroundColor: '#ffffff', boxShadow: '0px 3px 10px rgba(31,56,38,0.14)', gap: 4 }, listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 13, paddingBottom: 7 }, listTitle: { color: '#193d27', fontSize: 13, fontWeight: '800' }, storeRow: { gap: 9, paddingHorizontal: 16, paddingBottom: 12 }, storeCard: { width: 260, minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 15, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' }, storeSelected: { borderColor: '#86c992' }, storeIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#eaf5e9', alignItems: 'center', justifyContent: 'center' }, storeCopy: { flex: 1, gap: 3 }, storeName: { color: '#193d27', fontSize: 11, fontWeight: '800' }, storeMeta: { color: '#718076', fontSize: 9 }, storePrice: { color: '#168344', fontSize: 10, fontWeight: '800' }, distance: { color: '#718076', fontSize: 9 },
});
