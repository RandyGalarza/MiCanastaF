import { StoreMap as WebStoreMap } from './store-map.web';
import type { Comercio } from '@/types/database';

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
type Store = Comercio & { canasta_estimada?: number | null };
type Props = { stores: Store[]; cheapestId?: number; region: Region; onRegionChange: (region: Region) => void; onSelect: (id: number) => void; showsUserLocation: boolean };

export function StoreMap(_props: Props) {
  return <WebStoreMap />;
}
