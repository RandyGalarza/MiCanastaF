import { useEffect } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { StyleSheet, View } from 'react-native';
import type { Comercio } from '@/types/database';
import { UBICACION_CENTRO_RIOHACHA } from '@/utils/comercio-geocoding';
import { groupStoresByCoordinates } from '@/utils/store-map-groups';

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

export function LeafletStoreMap({ stores, cheapestId, region, onRegionChange, onSelect, userLocation }: Props) {
  const storeGroups = groupStoresByCoordinates(stores);
  return (
    <View style={styles.container}>
      <MapContainer
        center={[region.latitude, region.longitude]}
        zoom={12}
        style={styles.map}
        scrollWheelZoom
      >
        <MapRegionController region={region} onRegionChange={onRegionChange} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {storeGroups.map((group) => {
          const color = group.stores.some((store) => store.id_comercio === cheapestId)
            ? '#168344'
            : '#d97706';
          const firstStore = group.stores[0];
          const isCityReference =
            Math.abs(group.latitude - UBICACION_CENTRO_RIOHACHA.latitud) < 0.00001 &&
            Math.abs(group.longitude - UBICACION_CENTRO_RIOHACHA.longitud) < 0.00001;
          return (
            <CircleMarker
              key={group.key}
              center={[group.latitude, group.longitude]}
              radius={group.stores.length === 1 ? 9 : Math.min(20, 10 + Math.log2(group.stores.length) * 2)}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 1 }}
              eventHandlers={{ click: () => onSelect(firstStore.id_comercio) }}
            >
              {group.stores.length > 1 ? (
                <Tooltip permanent direction="center">{group.stores.length}</Tooltip>
              ) : null}
              <Popup>
                <div>
                  {isCityReference ? <div>Ubicación aproximada: centro de Riohacha</div> : null}
                  <strong>
                    {group.stores.length === 1
                      ? firstStore.nombre
                      : `${group.stores.length} comercios en esta ubicación`}
                  </strong>
                  {group.stores.map((store) => (
                    <div key={store.id_comercio}>
                      {group.stores.length > 1 ? <strong>{store.nombre} · </strong> : null}
                      {store.direccion || store.tipo_comercio || 'Comercio local'}
                      {store.canasta_estimada == null
                        ? ' · Sin precios registrados'
                        : ` · Canasta: $${Number(store.canasta_estimada).toLocaleString('es-CO')}`}
                    </div>
                  ))}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {userLocation ? (
          <CircleMarker
            center={[userLocation.latitude, userLocation.longitude]}
            radius={7}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
          >
            <Popup>Tu ubicación</Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
    </View>
  );
}

function MapRegionController({ region, onRegionChange }: Pick<Props, 'region' | 'onRegionChange'>) {
  const map = useMap();

  useEffect(() => {
    const center = map.getCenter();
    const longitudeDelta = Math.max(0.001, Math.min(360, Math.abs(region.longitudeDelta)));
    const targetZoom = Math.max(3, Math.min(19, Math.log2((360 * map.getSize().x) / (256 * longitudeDelta))));
    const centerChanged =
      Math.abs(center.lat - region.latitude) > 0.0001 ||
      Math.abs(center.lng - region.longitude) > 0.0001;
    const zoomChanged = Math.abs(map.getZoom() - targetZoom) > 0.25;

    if (centerChanged || zoomChanged) {
      map.setView([region.latitude, region.longitude], targetZoom, { animate: false });
    }
  }, [map, region.latitude, region.longitude, region.longitudeDelta]);

  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      onRegionChange({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: Math.max(0.001, bounds.getNorth() - bounds.getSouth()),
        longitudeDelta: Math.max(0.001, bounds.getEast() - bounds.getWest()),
      });
    },
  });

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 220 },
  map: { flex: 1, height: '100%', width: '100%' },
});
