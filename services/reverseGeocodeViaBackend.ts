import { API_ENDPOINTS } from '@/constants/api';
import { ApiError, api } from '@/services/api.service';

export type ReverseGeocodeResult = {
  displayName: string | null;
  lat: number;
  lon: number;
  placeId: number | null;
  address: Record<string, string>;
};

export type MappedAddressFormFields = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
};

function addrValue(address: Record<string, string>, ...keys: string[]): string {
  const entries = Object.entries(address);
  for (const want of keys) {
    const w = want.toLowerCase();
    for (const [k, v] of entries) {
      if (k.toLowerCase() === w && v != null && String(v).trim()) {
        return String(v).trim();
      }
    }
  }
  return '';
}

/**
 * Maps backend `data.address` keys (road, city, state, postcode, …) to profile form fields.
 */
export function mapReverseGeocodeAddressToForm(
  address: Record<string, string>,
  displayName: string | null
): MappedAddressFormFields {
  const line1 = [
    addrValue(address, 'house_number', 'houseNumber', 'housenumber'),
    addrValue(address, 'road', 'street', 'route', 'pedestrian'),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const city = addrValue(
    address,
    'city',
    'town',
    'village',
    'municipality',
    'county',
    'state_district',
    'stateDistrict',
    'district'
  );

  const line2 = [
    addrValue(address, 'suburb', 'neighbourhood', 'neighborhood', 'quarter', 'hamlet'),
  ]
    .filter(Boolean)
    .join(', ')
    .trim();

  const state = addrValue(address, 'state', 'region');
  const pincode = addrValue(address, 'postcode', 'postal_code', 'postalCode', 'pincode', 'zip');

  const addressLine1 =
    line1 ||
    (displayName ? displayName.split(',')[0]?.trim() ?? '' : '') ||
    '';

  return {
    addressLine1,
    addressLine2: line2 || undefined,
    city,
    state,
    pincode,
  };
}

/**
 * GET `/geocode/reverse` — same auth as profile (`api` injects Bearer + refresh).
 * Do not call from WebView HTML; use only from React Native / web bundle.
 */
function normalizeAddressRecord(addr: unknown): Record<string, string> {
  if (!addr || typeof addr !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(addr as Record<string, unknown>)) {
    if (v != null && v !== '') out[k] = String(v);
  }
  return out;
}

export async function reverseGeocodeWithBackend(
  lat: number,
  lon: number,
  acceptLanguage?: string
): Promise<ReverseGeocodeResult> {
  const lang = acceptLanguage ?? 'en-IN';
  const raw = await api.get<ReverseGeocodeResult | undefined>(
    API_ENDPOINTS.GEOCODE.REVERSE,
    {
      lat,
      lon,
      acceptLanguage: lang,
    },
    {
      headers: {
        Accept: 'application/json',
        'Accept-Language': `${lang},en;q=0.9`,
      },
    }
  );
  if (!raw || typeof raw !== 'object' || typeof raw.lat !== 'number' || typeof raw.lon !== 'number') {
    throw new ApiError('Invalid geocode response', 502);
  }
  return {
    displayName: raw.displayName ?? null,
    lat: raw.lat,
    lon: raw.lon,
    placeId: raw.placeId ?? null,
    address: normalizeAddressRecord(raw.address),
  };
}
