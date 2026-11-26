import type { TrackingEvent, TrackingInfo, TrackingResult } from '@/types/tracking';

export type VarmonttHito = {
  Estado?: string | null;
  Agencia?: string | null;
  Fecha?: string | null;
  'Nombre Entrega'?: string | null;
  'Rut Entrega'?: string | null;
  [key: string]: unknown;
};

export type VarmonttResponse = {
  success?: boolean;
  os?: string;
  tiene_imagen?: boolean;
  hitos?: VarmonttHito[];
  message?: string;
};

const cleanText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
};

export const validateVarmonttOs = (rawTrackingNumber: string): string => {
  const clean = rawTrackingNumber.trim();
  if (!clean) {
    throw new Error('Ingresa un número de Orden de Servicio (OS) de Varmontt.');
  }
  if (!/^[0-9]{1,15}$/.test(clean) || /^0+$/.test(clean)) {
    throw new Error('La Orden de Servicio (OS) de Varmontt debe contener solo dígitos numéricos.');
  }
  return clean;
};

export const normalizeVarmonttOs = (cleanOs: string): string =>
  cleanOs.length < 12 ? cleanOs.padStart(12, '0') : cleanOs;

export const cleanVarmonttAgency = (name?: string | null): string => {
  const raw = cleanText(name);
  if (!raw) return '';
  const parenCleaned = raw.replace(/^\d+\s*\((.*?)\)$/, '$1').trim();
  const cleaned = parenCleaned === raw ? raw.replace(/^\d+\s+/, '').trim() : parenCleaned;
  return cleaned;
};

const parseVarmonttTimestamp = (rawDate?: string | null): number => {
  const value = cleanText(rawDate);
  if (!value) return Number.NaN;

  // Soporta formato chileno DD/MM/YYYY [HH:mm[:ss]] o DD-MM-YYYY [HH:mm[:ss]]
  const clMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (clMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = clMatch;
    const ts = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return ts;
  }

  return Date.parse(value);
};

// Evita que estados intermedios como "Recibido en agencia origen" disparen isDelivered (/recibid/i).
const sanitizeStatusForBadge = (rawStatus: string): string => {
  if (/entregad/i.test(rawStatus)) return rawStatus;
  if (/recibid/i.test(rawStatus)) {
    return rawStatus.replace(/recibid[oa]s?/gi, 'Recepcionado');
  }
  return rawStatus;
};

export const parseVarmonttTrackingPayload = (
  payload: unknown,
  trackingNumber: string,
): TrackingResult => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Varmontt devolvió una respuesta inválida.');
  }

  const data = payload as VarmonttResponse;
  const hitos = Array.isArray(data.hitos)
    ? data.hitos.filter((item): item is VarmonttHito => typeof item === 'object' && item !== null)
    : [];

  if (data.success === false || hitos.length === 0) {
    throw new Error(data.message ?? 'No se encontraron datos para esta Orden de Servicio (OS) en Varmontt.');
  }

  // En el portal de Varmontt los hitos suelen venir en orden cronológico (antiguo -> reciente).
  const indexed = hitos.map((hito, index) => ({
    hito,
    index,
    ts: parseVarmonttTimestamp(hito.Fecha),
  }));

  const hasValidDates = indexed.some((entry) => !Number.isNaN(entry.ts));
  const newestFirst = [...indexed].sort((a, b) => {
    if (hasValidDates) {
      if (Number.isNaN(a.ts) && Number.isNaN(b.ts)) return b.index - a.index;
      if (Number.isNaN(a.ts)) return 1;
      if (Number.isNaN(b.ts)) return -1;
      if (b.ts !== a.ts) return b.ts - a.ts;
    }
    return b.index - a.index;
  });

  const chronological = [...newestFirst].reverse();
  const deliveredEntry = newestFirst.find(({ hito }) => /entregad/i.test(cleanText(hito.Estado)));
  const latestHito = (deliveredEntry ?? newestFirst[0]).hito;

  const rawStatus = cleanText(latestHito.Estado) || 'En tránsito';
  const status = sanitizeStatusForBadge(rawStatus);
  const latestAgency = cleanVarmonttAgency(latestHito.Agencia);
  const detail = latestAgency && !rawStatus.toLowerCase().includes(latestAgency.toLowerCase())
    ? `${rawStatus} · ${latestAgency}`
    : rawStatus;

  let origin: string | undefined;
  let destination: string | undefined;

  for (const { hito } of chronological) {
    const estadoLower = cleanText(hito.Estado).toLowerCase();
    const agency = cleanVarmonttAgency(hito.Agencia);

    if (!origin && estadoLower.includes('agencia origen') && agency) {
      origin = agency;
    }

    if (estadoLower.includes('ruta a')) {
      const match = /ruta\s+a\s+(.*)/i.exec(cleanText(hito.Estado));
      const routeDest = cleanVarmonttAgency(match?.[1]);
      if (routeDest) destination = routeDest;
    }

    if ((estadoLower.includes('arrib') || estadoLower.includes('reparto') || estadoLower.includes('entregad')) && agency) {
      destination = agency;
    }
  }

  if (!origin) {
    origin = cleanVarmonttAgency(chronological[0]?.hito.Agencia) || undefined;
  }
  if (!destination && latestAgency && latestAgency.toLowerCase() !== (origin ?? '').toLowerCase()) {
    destination = latestAgency;
  }

  const events: TrackingEvent[] = newestFirst.map(({ hito }, idx) => {
    const title = cleanText(hito.Estado) || 'Actualización de estado';
    const fecha = cleanText(hito.Fecha);
    const agency = cleanVarmonttAgency(hito.Agencia);
    const description = [fecha, agency].filter(Boolean).join(' · ') || undefined;
    return {
      title,
      ...(description ? { description } : {}),
      isActive: idx === 0,
    };
  });

  const lastUpdated =
    cleanText(latestHito.Fecha) ||
    newestFirst.map(({ hito }) => cleanText(hito.Fecha)).find(Boolean) ||
    undefined;

  const info: TrackingInfo[] = [];
  const pushInfo = (label: string, value?: string) => {
    const clean = cleanText(value);
    if (clean) info.push({ label, value: clean });
  };

  pushInfo('Agencia actual', latestAgency);

  const deliveredName = cleanText(deliveredEntry?.hito['Nombre Entrega']);
  if (deliveredName && deliveredName.toUpperCase() !== 'N/A') {
    pushInfo('Entregado a', deliveredName);
  }

  const normalizedOs = cleanText(data.os);
  if (normalizedOs && normalizedOs !== trackingNumber) {
    pushInfo('OS normalizada', normalizedOs);
  }

  if (data.tiene_imagen) {
    pushInfo('Comprobante digital', 'Disponible en varmontt.cl');
  }

  return {
    courier: 'varmontt',
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
