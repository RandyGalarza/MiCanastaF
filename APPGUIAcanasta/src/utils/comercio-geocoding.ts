export type CoordenadasComercio = { latitud: number; longitud: number };

export const UBICACION_CENTRO_RIOHACHA: CoordenadasComercio = {
  latitud: 11.5449387,
  longitud: -72.9150522,
};

export class GeocodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeocodingError';
  }
}

type PhotonResponse = {
  features?: {
    geometry?: { coordinates?: [number, number] };
    properties?: {
      countrycode?: string;
      name?: string;
      street?: string;
      type?: string;
    };
  }[];
};

const GEOCODING_API_URL = 'https://photon.komoot.io/api/';
const REQUEST_INTERVAL_MS = 1000;
const REQUEST_TIMEOUT_MS = 12000;
const geocodingCache = new Map<string, CoordenadasComercio>();
const inFlightRequests = new Map<string, Promise<CoordenadasComercio>>();
let requestQueue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function buildAddressQuery(address: string) {
  const normalizedAddress = address.trim();
  const includesCountry = /\bcolombia\b/i.test(normalizedAddress);
  const includesCityOrCountry = /\briohacha\b/i.test(normalizedAddress) || includesCountry;
  const localAddress = includesCityOrCountry
    ? normalizedAddress
    : `${normalizedAddress}, Riohacha, La Guajira`;
  return includesCountry ? localAddress : `${localAddress}, Colombia`;
}

function normalizeStreetDesignation(value: string) {
  const match = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/\b(calle|cll\.?|carrera|cra\.?|avenida|av\.?|diagonal|diag\.?|transversal|trans\.?)\s*(\d{1,3}\s*[a-z]{0,2})/i);
  if (!match) return '';

  const prefix = match[1].toLowerCase().replace(/\./g, '');
  const streetType = prefix.startsWith('cll') ? 'calle'
    : prefix.startsWith('cra') ? 'carrera'
      : prefix.startsWith('av') ? 'avenida'
        : prefix.startsWith('diag') ? 'diagonal'
          : prefix.startsWith('trans') ? 'transversal'
            : prefix;
  const number = match[2].toLowerCase().replace(/\s+/g, '').replace(/(ra|ro|da|do)$/, '');
  return `${streetType}${number}`;
}

function queueRequest<T>(request: () => Promise<T>): Promise<T> {
  const queuedRequest = requestQueue.then(async () => {
    const wait = Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return request();
  });
  requestQueue = queuedRequest.then(() => undefined, () => undefined);
  return queuedRequest;
}

async function fetchCoordinates(query: string): Promise<CoordenadasComercio> {
  const params = new URLSearchParams({
    q: query,
    limit: '1',
    lat: String(UBICACION_CENTRO_RIOHACHA.latitud),
    lon: String(UBICACION_CENTRO_RIOHACHA.longitud),
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEOCODING_API_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new GeocodingError('El servicio de ubicación no está disponible. Inténtalo de nuevo más tarde.');
    }

    const data = await response.json() as PhotonResponse;
    const feature = data.features?.[0];
    const properties = feature?.properties;
    const countryCode = properties?.countrycode?.toUpperCase();
    const coordinates = feature?.geometry?.coordinates;
    const longitud = Number(coordinates?.[0]);
    const latitud = Number(coordinates?.[1]);

    if (countryCode && countryCode !== 'CO') {
      throw new GeocodingError('No encontramos esa dirección en Colombia. Completa la ciudad y el departamento.');
    }
    const requestedStreet = normalizeStreetDesignation(query);
    if (requestedStreet) {
      const resultStreet = properties?.street ?? (properties?.type === 'street' ? properties.name : undefined);
      const resolvedStreet = resultStreet ? normalizeStreetDesignation(resultStreet) : '';
      if (!resolvedStreet || requestedStreet !== resolvedStreet) {
        throw new GeocodingError('No encontramos esa calle. Completa la dirección o usa una vía e intersección reconocible.');
      }
    }
    if (
      !Number.isFinite(latitud) || latitud < -90 || latitud > 90 ||
      !Number.isFinite(longitud) || longitud < -180 || longitud > 180
    ) {
      throw new GeocodingError('No encontramos esa dirección. Agrega ciudad, departamento y país.');
    }

    return { latitud, longitud };
  } catch (error) {
    if (error instanceof GeocodingError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GeocodingError('La búsqueda de la dirección tardó demasiado. Inténtalo de nuevo.');
    }
    throw new GeocodingError('No se pudo consultar la ubicación. Revisa tu conexión e inténtalo de nuevo.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function geocodificarDireccionComercio(address: string): Promise<CoordenadasComercio> {
  if (!address.trim()) {
    throw new GeocodingError('Escribe la dirección del comercio para ubicarlo en el mapa.');
  }

  const query = buildAddressQuery(address);
  const cacheKey = query.toLocaleLowerCase('es-CO');
  const cachedCoordinates = geocodingCache.get(cacheKey);
  if (cachedCoordinates) return cachedCoordinates;

  let request = inFlightRequests.get(cacheKey);
  if (!request) {
    request = queueRequest(() => fetchCoordinates(query));
    inFlightRequests.set(cacheKey, request);
  }

  try {
    const coordinates = await request;
    geocodingCache.set(cacheKey, coordinates);
    return coordinates;
  } finally {
    if (inFlightRequests.get(cacheKey) === request) inFlightRequests.delete(cacheKey);
  }
}
