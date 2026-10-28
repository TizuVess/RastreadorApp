import type { CourierService, TrackingResult } from '@/types/tracking';

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

const displayValue = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return '';
  return JSON.stringify(value);
};

const labelFromKey = (key: string) => key
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const resultFromPayload = (payload: BlueExpressResponse, trackingNumber: string): TrackingResult => {
  const states = payload.data?.macroState?.data?.traceMacrostates?.macrostates ?? [];
  const state = states.find((candidate) => candidate.isActive) ?? states[states.length - 1];
  const status = state?.title?.trim() || state?.message?.trim();
  if (!status || payload.status === 'Error') {
    throw new Error(payload.message ?? 'Blue Express no devolvió un estado para este número de seguimiento.');
  }

  const generalInfo = payload.data?.generalInfo?.data ?? {};
  const details = [
    ...states.map((candidate) => [candidate.title, candidate.message].filter(Boolean).join(': ')),
    ...Object.entries(generalInfo).map(([key, value]) => {
      const displayed = displayValue(value);
      return displayed ? `${labelFromKey(key)}: ${displayed}` : '';
    }),
  ].filter(Boolean);
  const normalizedInfo = Object.entries(generalInfo).map(([key, value]) => [
    key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    displayValue(value),
  ]);
  const valueFor = (pattern: RegExp) => normalizedInfo.find(([key, value]) => pattern.test(key) && value)?.[1];

  return {
    courier: 'blue-express',
    trackingNumber,
    status,
    detail: details.join('\n') || status,
    ...(valueFor(/origen|origin/) ? { origin: valueFor(/origen|origin/) } : {}),
    ...(valueFor(/destino|destination/) ? { destination: valueFor(/destino|destination/) } : {}),
    ...(valueFor(/fecha|date|actualizado|updated/) ? { lastUpdated: valueFor(/fecha|date|actualizado|updated/) } : {}),
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