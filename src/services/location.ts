import * as Location from 'expo-location';

import type { Coordinates } from '../types';

export type LocationResult =
  | { ok: true; coords: Coordinates; uf: string | null; city: string | null }
  | { ok: false; reason: 'permission-denied' | 'unavailable' };

/**
 * Obtém a posição do usuário e o estado correspondente.
 *
 * O estado vem do geocoding reverso do próprio aparelho: nenhuma coordenada
 * é enviada a terceiros para descobrir a UF. Só a latitude/longitude e a
 * sigla do estado seguem para o backend, que precisa delas para calcular a
 * distância e escolher a base do CNES.
 */
export const getCurrentLocation = async (): Promise<LocationResult> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      return { ok: false, reason: 'permission-denied' };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords: Coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    let uf: string | null = null;
    let city: string | null = null;

    try {
      const [place] = await Location.reverseGeocodeAsync(coords);
      uf = place?.region ?? null;
      city = place?.city ?? place?.subregion ?? null;
    } catch {
      // Sem geocoding reverso o app cai no seletor manual de estado.
    }

    return { ok: true, coords, uf, city };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
};
