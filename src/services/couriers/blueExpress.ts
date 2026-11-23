import type { CourierService, TrackingEvent, TrackingInfo, TrackingResult } from '@/types/tracking';

type MacroState = {
  isActive?: boolean;
  title?: string;
  message?: string;
};

type BlueExpressResponse = {
  status?: string;
  message?: string;
  data?: {
    generalInfo?: { data?: Record<string, unknown> };
    macroState?: { data?: { traceMacrostates?: { macrostates?: MacroState[] } } };
    coreOs?: { data?: Record<string, unknown> };
  };
};

const displayValue = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
};

const labelFromKey = (key: string): string => {
  const dictionary: Record<string, string> = {
    origincity: 'Ciudad de origen',
    destinationcity: 'Ciudad de destino',
    commune: 'Comuna de entrega',
    deliverytype: 'Tipo de entrega',
    servicetype: 'Tipo de servicio',
    estimateddate: 'Fecha estimada',
    deliverydate: 'Fecha de entrega',
    creationdate: 'Fecha de admisión',
    recipient: 'Destinatario',
    sender: 'Remitente',
  };

  const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
  if (dictionary[normalized]) return dictionary[normalized];

  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
};

const resultFromPayload = (payload: BlueExpressResponse, trackingNumber: string): TrackingResult => {
  const states = payload.data?.macroState?.data?.traceMacrostates?.macrostates ?? [];
  const activeState = states.find((candidate) => candidate.isActive) ?? states[states.length - 1];
  const status = activeState?.title?.trim() || activeState?.message?.trim();

  if (!status || payload.status === 'Error') {
    throw new Error(payload.message ?? 'Blue Express no devolvió un estado para este número de seguimiento.');
  }

  const generalInfo = payload.data?.generalInfo?.data ?? {};

  // Extraer eventos limpios para el timeline
  const events: TrackingEvent[] = states
    .filter((s) => Boolean(s.title || s.message))
    .map((s) => ({
      title: s.title?.trim() || 'Actualización de estado',
      description: s.message?.trim() || undefined,
      isActive: Boolean(s.isActive),
    }));

  // Extraer valores clave
  const normalizedEntries = Object.entries(generalInfo).map(([k, v]) => [
    k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, ''),
    displayValue(v),
    k,
  ] as const);

  const findValue = (regex: RegExp) => {
    const match = normalizedEntries.find(([norm, val]) => regex.test(norm) && Boolean(val));
    return match ? match[1] : undefined;
  };

  const origin = findValue(/origen|origincity/);
  const destination = findValue(/destino|destinationcity|comuna|commune/);
  const lastUpdated = findValue(/fecha|date|actualizado|updated/);

  // Lista de atributos útiles formateados para info cards
  const ignoredKeys = /id|token|hash|raw|icon|color|status|code|trace/i;
  const info: TrackingInfo[] = [];

  for (const [key, value] of Object.entries(generalInfo)) {
    const strVal = displayValue(value);
    if (!strVal || ignoredKeys.test(key)) continue;
    // Evitar duplicar si es idéntico a origen o destino
    const label = labelFromKey(key);
    info.push({ label, value: strVal });
  }

  // Detalle conciso del estado actual en lugar de un volcado masivo
  const detail = activeState?.message?.trim() || activeState?.title?.trim() || status;

  return {
    courier: 'blue-express',
    trackingNumber,
    status,
    detail,
    ...(origin ? { origin } : {}),
    ...(destination ? { destination } : {}),
    ...(lastUpdated ? { lastUpdated } : {}),
    events: events.length > 0 ? events : undefined,
    info: info.length > 0 ? info : undefined,
    raw: payload,
  };
};

const lookup = async (trackingNumber: string): Promise<TrackingResult> => {
  let response: Response;
  try {
    response = await fetch('https://www.blue.cl/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ os: trackingNumber }),
    });
  } catch (cause) {
    throw new Error(cause instanceof Error ? cause.message : 'No se pudo conectar con Blue Express.');
  }

  let payload: BlueExpressResponse;
  try {
    payload = await response.json() as BlueExpressResponse;
  } catch {
    throw new Error('Blue Express devolvió una respuesta que no es JSON válido.');
  }

  if (!response.ok) {
    throw new Error(payload.message ?? `Blue Express respondió con el código ${response.status}.`);
  }
  return resultFromPayload(payload, trackingNumber);
};

export const blueExpressService: CourierService = {
  id: 'blue-express',
  name: 'Blue Express',
  lookup,
};