import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { ComponentType } from 'react';
import type { Comercio } from '@/types/database';

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
type Store = Comercio & { canasta_estimada?: number | null };
type Props = {
  stores: Store[];
  cheapestId?: number;
  region: Region;
  onRegionChange: (region: Region) => void;
  onSelect: (id: number) => void;
  showsUserLocation: boolean;
  userLocation?: { latitude: number; longitude: number };
};
type LeafletMapComponent = ComponentType<Props>;

export function StoreMap(props: Props) {
  const [LeafletMap, setLeafletMap] = useState<LeafletMapComponent | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void import('./leaflet-store-map.web')
      .then(({ LeafletStoreMap }) => {
        if (isMounted) setLeafletMap(() => LeafletStoreMap);
      })
      .catch((error: unknown) => {
        console.error('No se pudo inicializar el mapa web de tiendas:', error);
        if (isMounted) setLoadFailed(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container} accessibilityLabel="Mapa de tiendas">
      {LeafletMap ? (
        <LeafletMap {...props} />
      ) : (
        <View style={styles.message}>
          {loadFailed ? null : <ActivityIndicator color="#168344" />}
          <Text style={styles.messageText}>
            {loadFailed ? 'No se pudo cargar el mapa. Revisa tu conexión e inténtalo de nuevo.' : 'Preparando mapa…'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 220, marginTop: 10 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  messageText: { color: '#718076', fontSize: 12, textAlign: 'center' },
});
