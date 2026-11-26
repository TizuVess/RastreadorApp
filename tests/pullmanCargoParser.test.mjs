import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parsePullmanTrackingPayload,
  unflattenDevalue,
  unpackPullmanDataEnvelope,
  validatePullmanOdt,
} from '../src/services/couriers/pullmanCargoParser.ts';

// Mismos patrones usados en DashboardScreen.tsx y PackageDetailScreen.tsx
const isDelivered = (status = '') => /entregad|recibid|complet|finaliz/i.test(status);

test('validatePullmanOdt acepta ODT numericas validas y limpia espacios', () => {
  assert.equal(validatePullmanOdt('  25500123456  '), '25500123456');
  assert.equal(validatePullmanOdt('123456'), '123456');
});

test('validatePullmanOdt rechaza valores vacios, ceros o no numericos', () => {
  assert.throws(() => validatePullmanOdt('   '), /Ingresa un número/);
  assert.throws(() => validatePullmanOdt('00000000000'), /válida/);
  assert.throws(() => validatePullmanOdt('ODT-123456'), /válida/);
  assert.throws(() => validatePullmanOdt('12345'), /válida/);
});

test('unflattenDevalue reconstruye estructuras SvelteKit con indices, null y Date', () => {
  const flat = [
    { seguimiento: 1, odt: 2, extra: -6, missing: -1 },
    [3],
    '25500123456',
    { estadoWeb: 4, fecha: 5 },
    'En reparto',
    ['Date', '2026-11-24T12:00:00Z'],
  ];

  const result = unflattenDevalue(flat);
  assert.deepEqual(result, {
    seguimiento: [{ estadoWeb: 'En reparto', fecha: '2026-11-24T12:00:00Z' }],
    odt: '25500123456',
    extra: null,
    missing: undefined,
  });
});

test('parsePullmanTrackingPayload parsea respuesta real __data.json de SvelteKit con historial y ruta', () => {
  const svelteKitPayload = {
    type: 'data',
    nodes: [
      null,
      {
        type: 'data',
        data: [
          { seguimiento: 1, odt: 2 },
          [3, 4],
          '25500123456',
          {
            numeroODT: 2,
            estadoWeb: 5,
            agencia: 6,
            fecha: 7,
            origen: 8,
            destino: 9,
            tipoEntrega: 10,
            tipo: 11,
            paso: 12,
          },
          {
            numeroODT: 2,
            estadoWeb: 13,
            agencia: 14,
            fecha: 15,
            origen: 8,
            destino: 9,
            tipoEntrega: 10,
            tipo: 11,
            paso: 16,
          },
          'Entregado',
          'CONCEPCION CENTRO',
          '2026-11-23T18:30:00Z[UTC]',
          'SANTIAGO MAIPU',
          'CONCEPCION',
          'DOM',
          'ODR',
          5,
          'En reparto',
          'CONCEPCION DISTRIBUCION',
          '2026-11-23T09:00:00Z[UTC]',
          4,
        ],
        uses: { params: ['id'] },
      },
    ],
  };

  const result = parsePullmanTrackingPayload(svelteKitPayload, '25500123456');

  assert.equal(result.courier, 'pullman-cargo');
  assert.equal(result.trackingNumber, '25500123456');
  assert.equal(result.status, 'Entregado');
  assert.equal(isDelivered(result.status), true);
  assert.equal(result.detail, 'Entregado · CONCEPCION CENTRO');
  assert.equal(result.origin, 'SANTIAGO MAIPU');
  assert.equal(result.destination, 'CONCEPCION');
  assert.ok(result.lastUpdated);
  assert.equal(result.events?.length, 2);
  assert.equal(result.events?.[0].title, 'Entregado');
  assert.equal(result.events?.[0].isActive, true);
  assert.equal(result.events?.[1].title, 'En reparto');
  assert.equal(result.events?.[1].isActive, false);
  assert.ok(result.info?.some((item) => item.label === 'Tipo de entrega' && item.value === 'Domicilio'));
  assert.ok(result.info?.some((item) => item.label === 'Tipo de orden' && item.value === 'Retiro a domicilio (ODR)'));
  assert.ok(result.info?.some((item) => item.label === 'Agencia actual' && item.value === 'CONCEPCION CENTRO'));
});

test('parsePullmanTrackingPayload soporta formato directo y estado activo en agencia', () => {
  const result = parsePullmanTrackingPayload(
    {
      odt: '25500999888',
      seguimiento: [
        {
          numeroODT: '25500999888',
          estadoWeb: 'Preparando envío',
          agencia: 'VALPARAISO',
          fecha: '2026-11-24T10:15:00Z[UTC]',
          origen: 'SANTIAGO',
          destino: 'VALPARAISO',
          tipoEntrega: 'AGE',
          paso: 2,
        },
      ],
    },
    '25500999888',
  );

  assert.equal(result.status, 'Preparando envío');
  assert.equal(isDelivered(result.status), false);
  assert.ok(result.info?.some((item) => item.label === 'Tipo de entrega' && item.value === 'Retiro en agencia'));
});

test('parsePullmanTrackingPayload lanza error claro cuando Pullman devuelve seguimiento vacio', () => {
  // Exacta respuesta real observada en https://pullmancargo.cl/seguimiento/25500000001/__data.json
  const emptyRealPayload = {
    type: 'data',
    nodes: [
      null,
      {
        type: 'data',
        data: [{ seguimiento: 1, odt: 2 }, [], '25500000001'],
        uses: { params: ['id'] },
      },
    ],
  };

  assert.throws(
    () => parsePullmanTrackingPayload(emptyRealPayload, '25500000001'),
    /no encontró información/i,
  );
  assert.throws(() => unpackPullmanDataEnvelope({ type: 'data', nodes: [{ type: 'error' }] }), /devolvió un error/i);
  assert.throws(() => unpackPullmanDataEnvelope(null), /respuesta inválida/i);
});

test('parsePullmanTrackingPayload parsea respuesta real de ejemplo 57400022666 (8 hitos, piezas, fechaEmision)', () => {
  const realExamplePayload = {
    type: 'data',
    nodes: [
      null,
      {
        type: 'data',
        data: [
          { seguimiento: 1, odt: 8 },
          [2, 14, 18, 22, 25, 28, 32, 35],
          { agencia: 3, destino: 4, estadoWeb: 5, fecha: 6, fechaEmision: 7, numeroODT: 8, origen: 9, paso: 10, piezas: 11, tipo: 12, tipoEntrega: 13 },
          'VIÑA DEL MAR CENTRO DISTRIBUCION',
          'VIÑA DEL MAR',
          'Encomienda entregada',
          '2020-07-28T18:50:04.237Z[UTC]',
          '2020-07-09T17:56:38Z[UTC]',
          '57400022666',
          'SANTIAGO',
          4,
          1,
          'ODT',
          'DOM',
          { agencia: 3, destino: 4, estadoWeb: 15, fecha: 16, fechaEmision: 7, numeroODT: 8, origen: 9, paso: 17, piezas: 11, tipo: 12, tipoEntrega: 13 },
          'En reparto',
          '2020-07-28T14:10:49.277Z[UTC]',
          3,
          { agencia: 3, destino: 4, estadoWeb: 19, fecha: 20, fechaEmision: 7, numeroODT: 8, origen: 9, paso: 21, piezas: 11, tipo: 12, tipoEntrega: 13 },
          'En espera de reparto',
          '2020-07-28T14:06:18.747Z[UTC]',
          2,
          { agencia: 3, destino: 4, estadoWeb: 23, fecha: 24, fechaEmision: 7, numeroODT: 8, origen: 9, paso: 21, piezas: 11, tipo: 12, tipoEntrega: 13 },
          'Encomienda viajando entre agencias',
          '2020-07-10T21:22:21.957Z[UTC]',
          { agencia: 3, destino: 4, estadoWeb: 26, fecha: 27, fechaEmision: 7, numeroODT: 8, origen: 9, paso: 21, piezas: 11, tipo: 12, tipoEntrega: 13 },
          'Encomienda recibida en agencia de destino',
          '2020-07-10T21:22:21.903Z[UTC]',
          { agencia: 29, destino: 4, estadoWeb: 30, fecha: 31, fechaEmision: 7, numeroODT: 8, origen: 9, paso: 21, piezas: 11, tipo: 12, tipoEntrega: 13 },
          'LONQUEN CENTRO DISTRIBUCION',
          'Encomienda viajando entre regiones',
          '2020-07-10T16:44:06.333Z[UTC]',
          { agencia: 29, destino: 4, estadoWeb: 33, fecha: 34, fechaEmision: 7, numeroODT: 8, origen: 9, paso: 21, piezas: 11, tipo: 12, tipoEntrega: 13 },
          'Encomienda recibida en agencia',
          '2020-07-09T23:31:51.08Z[UTC]',
          { agencia: 36, destino: 4, estadoWeb: 37, fecha: 38, fechaEmision: 7, numeroODT: 8, origen: 9, paso: 11, piezas: 11, tipo: 12, tipoEntrega: 13 },
          'QUILICURA ',
          'Venta Creada',
          '2020-07-09T17:56:37.92Z[UTC]',
        ],
        uses: { params: ['id'] },
      },
    ],
  };

  const result = parsePullmanTrackingPayload(realExamplePayload, '57400022666');
  assert.equal(result.status, 'Entregado');
  assert.equal(isDelivered(result.status), true);
  assert.equal(result.origin, 'SANTIAGO');
  assert.equal(result.destination, 'VIÑA DEL MAR');
  assert.equal(result.events?.length, 8);
  assert.ok(result.info?.some((item) => item.label === 'Bultos / Piezas' && item.value === '1'));
  assert.ok(result.info?.some((item) => item.label === 'Fecha de emisión'));

  // Verifica que un paso intermedio "Encomienda recibida en agencia" no se clasifique como entregado
  const intermediate = parsePullmanTrackingPayload(
    {
      odt: '57400022666',
      seguimiento: [
        {
          numeroODT: '57400022666',
          estadoWeb: 'Encomienda recibida en agencia',
          agencia: 'LONQUEN CENTRO DISTRIBUCION',
          origen: 'SANTIAGO',
          destino: 'VIÑA DEL MAR',
          paso: 2,
          tipo: 'ODT',
        },
      ],
    },
    '57400022666',
  );
  assert.equal(isDelivered(intermediate.status), false);
});
