import type { CourierService, TrackingResult } from '@/types/tracking';
import {
  normalizeVarmonttOs,
  parseVarmonttTrackingPayload,
  validateVarmonttOs,
  type VarmonttResponse,
} from './varmonttParser';

const VARMONTT_TRACKING_URL = 'https://varmontt.cl/wp-content/themes/ChildThemeDivi/api_tracking.php';
const REQUEST_TIMEOUT_MS = 12_000;

const fetchVarmonttOs = async (osValue: string): Promise<VarmonttResponse> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${VARMONTT_TRACKING_URL}?os=${encodeURIComponent(osValue)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw new Error('La consulta a Varmontt tardó demasiado. Intenta nuevamente.');
    }
    throw new Error(cause instanceof Error ? cause.message : 'No se pudo conectar con Varmontt.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Varmontt respondió con el código ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Varmontt devolvió una respuesta que no es JSON válido.');
  }

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Varmontt devolvió una respuesta inválida.');
  }
  return payload as VarmonttResponse;
};

const lookup = async (trackingNumber: string): Promise<TrackingResult> => {
  const cleanOs = validateVarmonttOs(trackingNumber);
  const normalizedOs = normalizeVarmonttOs(cleanOs);

  // Replica la lógica del sitio de Varmontt: consulta primero con padding a 12 dígitos
  // y reintenta con el valor original si no trae hitos para mantener compatibilidad con OS antiguas.
  let payload = await fetchVarmonttOs(normalizedOs);
  const hasHitos = Boolean(payload.success && Array.isArray(payload.hitos) && payload.hitos.length > 0);
  if (!hasHitos && normalizedOs !== cleanOs) {
    payload = await fetchVarmonttOs(cleanOs);
  }

  return parseVarmonttTrackingPayload(payload, cleanOs);
};

export const varmonttService: CourierService = {
  id: 'varmontt',
  name: 'Varmontt',
  placeholder: 'Ej: 12345678',
  hint: 'Ejemplo: Orden de Servicio (OS) numérica de Varmontt',
  validate: validateVarmonttOs,
  lookup,
};
