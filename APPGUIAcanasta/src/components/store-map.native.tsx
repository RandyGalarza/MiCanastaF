import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Platform, StyleSheet } from 'react-native';
import { Comercio } from '@/types/database';

type Store = Comercio & { canasta_estimada?: number | null };
type Props = { stores: Store[]; cheapestId?: number; region: Region; onRegionChange: (region: Region) => void; onSelect: (id: number) => void; showsUserLocation: boolean };

export function StoreMap({ stores, cheapestId, region, onRegionChange, onSelect, showsUserLocation }: Props) {
  return (
    <MapView provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} style={styles.map} region={region} onRegionChangeComplete={onRegionChange} showsUserLocation={showsUserLocation}>
      {stores.map((store) => <Marker key={store.id_comercio} coordinate={{ latitude: Number(store.latitud), longitude: Number(store.longitud) }} title={store.nombre} description={store.canasta_estimada == null ? 'Sin precios registrados' : `Canasta: $${Number(store.canasta_estimada).toLocaleString('es-CO')}`} pinColor={store.id_comercio === cheapestId ? '#168344' : '#d97706'} onPress={() => onSelect(store.id_comercio)} />)}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { flex: 1, marginTop: 10 } });
