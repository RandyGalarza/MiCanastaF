import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Comercio } from '@/types/database';
import { UBICACION_CENTRO_RIOHACHA } from '@/utils/comercio-geocoding';
import { groupStoresByCoordinates } from '@/utils/store-map-groups';

type Store = Comercio & { canasta_estimada?: number | null };
type Props = { stores: Store[]; cheapestId?: number; region: Region; onRegionChange: (region: Region) => void; onSelect: (id: number) => void; showsUserLocation: boolean; userLocation?: { latitude: number; longitude: number } };

export function StoreMap({ stores, cheapestId, region, onRegionChange, onSelect, showsUserLocation }: Props) {
  const storeGroups = groupStoresByCoordinates(stores);
  return (
    <MapView provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} style={styles.map} region={region} onRegionChangeComplete={onRegionChange} showsUserLocation={showsUserLocation}>
      {storeGroups.map((group) => {
        const firstStore = group.stores[0];
        const color = group.stores.some((store) => store.id_comercio === cheapestId) ? '#168344' : '#d97706';
        const isCityReference =
          Math.abs(group.latitude - UBICACION_CENTRO_RIOHACHA.latitud) < 0.00001 &&
          Math.abs(group.longitude - UBICACION_CENTRO_RIOHACHA.longitud) < 0.00001;
        return (
          <Marker
            key={group.key}
            coordinate={{ latitude: group.latitude, longitude: group.longitude }}
            title={group.stores.length === 1
              ? firstStore.nombre
              : `${group.stores.length} comercios en esta ubicación`}
            description={[
              isCityReference ? 'Ubicación aproximada: centro de Riohacha' : null,
              ...group.stores.map((store) =>
                `${store.nombre}${store.direccion ? ` — ${store.direccion}` : ''}`
              ),
            ].filter(Boolean).join('\n')}
            pinColor={color}
            onPress={() => onSelect(firstStore.id_comercio)}
          >
            {group.stores.length > 1 ? (
              <View style={[styles.clusterMarker, { backgroundColor: color }]}>
                <Text style={styles.clusterMarkerText}>{group.stores.length}</Text>
              </View>
            ) : null}
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, marginTop: 10 },
  clusterMarker: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 5,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterMarkerText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
});
