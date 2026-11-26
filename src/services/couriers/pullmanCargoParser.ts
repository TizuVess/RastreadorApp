import type { TrackingEvent, TrackingInfo, TrackingResult } from '@/types/tracking';

export type PullmanMovement = {
  numeroODT?: string | number | null;
  estadoWeb?: string | null;
  agencia?: string | null;
  fecha?: string | null;
  fechaEmision?: string | null;
  origen?: string | null;
  destino?: string | null;
  tipoEntrega?: string | null;
  tipo?: string | null;
  paso?: number | string | null;
  piezas?: number | string | null;
};

export type PullmanUnpackedData = {
  odt?: string;
  seguimiento: PullmanMovement[];
};

const cleanText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
};

export const validatePullmanOdt = (rawTrackingNumber: string): string => {
  const clean = rawTrackingNumber.trim();
  if (!clean) {
    throw new Error('Ingresa un número de Orden de Transporte (ODT) de Pullman Cargo.');
  }
  if (!/^[0-9]{6,20}$/.test(clean) || /^0+$/.test(clean)) {
    throw new Error('Ingresa una ODT de Pullman Cargo válida (solo dígitos, por ejemplo 11 dígitos).');
  }
  return clean;
};

// Decodifica el formato plano `devalue` utilizado por SvelteKit en respuestas __data.json.
export const unflattenDevalue = (values: unknown[]): unknown => {
  if (!Array.isArray(values) || values.length === 0) return undefined;

  const cache = new Map<number, unknown>();

  const hydrate = (index: number): unknown => {
    if (index === -1) return undefined;
    if (index === -2) return Number.NaN;
    if (index === -3) return Number.POSITIVE_INFINITY;
    if (index === -4) return Number.NEGATIVE_INFINITY;
    if (index === -5) return -0;
    if (index === -6) return null;
    if (index < 0 || index >= values.length) return undefined;
    if (cache.has(index)) return cache.get(index);

    const raw = values[index];
    if (raw === null || typeof raw !== 'object') {
      cache.set(index, raw);
      return raw;
    }

    if (Array.isArray(raw)) {
      if (raw.length === 2 && raw[0] === 'Date' && typeof raw[1] === 'string') {
        cache.set(index, raw[1]);
        return raw[1];
      }
      const list: unknown[] = [];
      cache.set(index, list);
      for (const item of raw) {
        list.push(typeof item === 'number' ? hydrate(item) : item);
      }
      return list;
    }

    const record: Record<string, unknown> = {};
    cache.set(index, record);
    for (const [key, ref] of Object.entries(raw as Record<string, unknown>)) {
      record[key] = typeof ref === 'number' ? hydrate(ref) : ref;
    }
    return record;
  };

  return hydrate(0);
};

export const unpackPullmanDataEnvelope = (payload: unknown): PullmanUnpackedData => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Pullman Cargo devolvió una respuesta inválida.');
  }

  const obj = payload as Record<string, unknown>;

  // Formato directo (fallback si ya viene sin devalue).
  if (Array.isArray(obj.seguimiento)) {
    return {
      odt: cleanText(obj.odt) || undefined,
      seguimiento: obj.seguimiento.filter(
        (item): item is PullmanMovement => typeof item === 'object' && item !== null,
      ),
    };
  }

  // Formato SvelteKit __data.json: { type: "data", nodes: [..., { type: "data", data: [...] }] }
  if (Array.isArray(obj.nodes)) {
    for (let i = obj.nodes.length - 1; i >= 0; i -= 1) {
      const node = obj.nodes[i];
      if (typeof node !== 'object' || node === null) continue;
      const nodeRecord = node as Record<string, unknown>;
      if (nodeRecord.type === 'error') {
        throw new Error('Pullman Cargo devolvió un error al consultar esta ODT.');
      }
      if (nodeRecord.type === 'data' && Array.isArray(nodeRecord.data)) {
        const unpacked = unflattenDevalue(nodeRecord.data);
        if (typeof unpacked === 'object' && unpacked !== null) {
          const unpackedRecord = unpacked as Record<string, unknown>;
          if (Array.isArray(unpackedRecord.seguimiento)) {
            return {
              odt: cleanText(unpackedRecord.odt) || undefined,
              seguimiento: unpackedRecord.seguimiento.filter(
                (item): item is PullmanMovement => typeof item === 'object' && item !== null,
              ),
            };
          }
        }
      }
    }
  }

  throw new Error('Pullman Cargo devolvió una respuesta con formato no reconocido.');
};

const formatPullmanDate = (rawDate?: string | null): string | undefined => {
  const cleaned = cleanText(rawDate).replace(/\[UTC\]$/i, '').trim();
  if (!cleaned) return undefined;

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return cleaned;

  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  } catch {
    return cleaned;
  }
};

const STEP_LABELS_STANDARD: Record<number, string> = {
  1: 'Venta realizada',
  2: 'Preparando envío',
  3: 'En reparto',
  4: 'Entregado',
};

const STEP_LABELS_ODR: Record<number, string> = {
  1: 'Venta realizada',
  2: 'En camino a buscar',
  3: 'Preparando envío',
  4: 'En reparto',
  5: 'Entregado',
};

const resolveStepFallback = (movement: PullmanMovement): string => {
  const step = Number(movement.paso);
  const map = cleanText(movement.tipo).toUpperCase() === 'ODR' ? STEP_LABELS_ODR : STEP_LABELS_STANDARD;
  return map[step] ?? 'En tránsito';
};

export const parsePullmanTrackingPayload = (
  payload: unknown,
  trackingNumber: string,
): TrackingResult => {
  const unpacked = unpackPullmanDataEnvelope(payload);
  const movements = unpacked.seguimiento;

  if (movements.length === 0) {
    throw new Error('Pullman Cargo no encontró información para esta Orden de Transporte (ODT).');
  }

  // Pullman Cargo entrega el movimiento más reciente en la posición 0.
  const latest = movements[0];
  const rawStatus = cleanText(latest.estadoWeb) || resolveStepFallback(latest);
  const finalStep = cleanText(latest.tipo).toUpperCase() === 'ODR' ? 5 : 4;
  const currentStep = Number(latest.paso);
  const isIntermediateStep = Number.isFinite(currentStep) && currentStep > 0 && currentStep < finalStep;
  // Normaliza estados finales a "Entregado" y evita que estados intermedios con "recibida" disparen isDelivered.
  const status = /entregad/i.test(rawStatus)
    ? 'Entregado'
    : isIntermediateStep && /recibid/i.test(rawStatus)
      ? rawStatus.replace(/recibid[oa]s?/gi, 'recepcionada')
      : rawStatus;
  const latestAgency = cleanText(latest.agencia);
  const detail = latestAgency && !rawStatus.toLowerCase().includes(latestAgency.toLowerCase())
    ? `${rawStatus} · ${latestAgency}`
    : rawStatus;

  const origin = cleanText(latest.origen) || undefined;
  const destination = cleanText(latest.destino) || undefined;

  const events: TrackingEvent[] = movements.map((movement, index) => {
    const title = cleanText(movement.estadoWeb) || resolveStepFallback(movement);
    const formattedDate = formatPullmanDate(movement.fecha);
    const agency = cleanText(movement.agencia);
    const description = [formattedDate, agency].filter(Boolean).join(' · ') || undefined;
    return {
      title,
      ...(description ? { description } : {}),
      isActive: index === 0,
    };
  });

  const lastUpdated =
    formatPullmanDate(latest.fecha) ??
    movements.map((m) => formatPullmanDate(m.fecha)).find(Boolean);

  const info: TrackingInfo[] = [];
  const pushInfo = (label: string, value?: string) => {
    const clean = cleanText(value);
    if (clean) info.push({ label, value: clean });
  };

  const deliveryTypeCode = cleanText(latest.tipoEntrega).toUpperCase();
  if (deliveryTypeCode) {
    pushInfo('Tipo de entrega', deliveryTypeCode === 'DOM' ? 'Domicilio' : 'Retiro en agencia');
  }

  pushInfo('Agencia actual', latestAgency);
  pushInfo('Fecha de emisión', formatPullmanDate(latest.fechaEmision));
  pushInfo('Bultos / Piezas', cleanText(latest.piezas));

  const serviceType = cleanText(latest.tipo).toUpperCase();
  if (serviceType) {
    pushInfo('Tipo de orden', serviceType === 'ODR' ? 'Retiro a domicilio (ODR)' : serviceType);
  }

  const odtFromApi = cleanText(latest.numeroODT) || cleanText(unpacked.odt);
  if (odtFromApi && odtFromApi !== trackingNumber) {
    pushInfo('Número ODT', odtFromApi);
  }

  return {
    courier: 'pullman-cargo',
    trackingNumber: odtFromApi || trackingNumber,
    status,
    detail,
    ...(origin ? { origin } : {}),
    ...(destination ? { destination } : {}),
    ...(lastUpdated ? { lastUpdated } : {}),
    events: events.length > 0 ? events : undefined,
    info: info.length > 0 ? info : undefined,
    raw: unpacked,
  };
};
