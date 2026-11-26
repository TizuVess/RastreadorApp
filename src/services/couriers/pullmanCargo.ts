import type { CourierService, TrackingResult } from '@/types/tracking';
import { parsePullmanTrackingPayload, validatePullmanOdt } from './pullmanCargoParser';

const PULLMAN_TRACKING_BASE_URL = 'https://pullmancargo.cl/seguimiento';
const REQUEST_TIMEOUT_MS = 12_000;

const lookup = async (trackingNumber: string): Promise<TrackingResult> => {
  const cleanOdt = validatePullmanOdt(trackingNumber);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${PULLMAN_TRACKING_BASE_URL}/${encodeURIComponent(cleanOdt)}/__data.json`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw new Error('La consulta a Pullman Cargo tardó demasiado. Intenta nuevamente.');
    }
    throw new Error(cause instanceof Error ? cause.message : 'No se pudo conectar con Pullman Cargo.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Pullman Cargo respondió con el código ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Pullman Cargo devolvió una respuesta que no es JSON válido.');
  }

  return parsePullmanTrackingPayload(payload, cleanOdt);
};

export const pullmanCargoService: CourierService = {
  id: 'pullman-cargo',
  name: 'Pullman Cargo',
  placeholder: 'Ej: 25500123456',
  hint: 'Ejemplo: Orden de Transporte (ODT) de 11 dígitos',
  validate: validatePullmanOdt,
  lookup,
};
