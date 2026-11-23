type LocatedStore = {
  id_comercio: number;
  latitud?: number | null;
  longitud?: number | null;
};

export type StoreLocationGroup<T> = {
  key: string;
  latitude: number;
  longitude: number;
  stores: T[];
};

export function groupStoresByCoordinates<T extends LocatedStore>(stores: T[]): StoreLocationGroup<T>[] {
  const groups = new Map<string, StoreLocationGroup<T>>();

  for (const store of stores) {
    const latitude = Number(store.latitud);
    const longitude = Number(store.longitud);
    if (
      store.latitud == null || store.longitud == null ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude)
    ) continue;

    const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const group = groups.get(key);
    if (group) {
      group.stores.push(store);
    } else {
      groups.set(key, { key, latitude, longitude, stores: [store] });
    }
  }

  return [...groups.values()];
}
