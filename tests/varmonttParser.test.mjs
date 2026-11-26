import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanVarmonttAgency,
  normalizeVarmonttOs,
  parseVarmonttTrackingPayload,
  validateVarmonttOs,
} from '../src/services/couriers/varmonttParser.ts';

// Mismos patrones usados en DashboardScreen.tsx y PackageDetailScreen.tsx
const isDelivered = (status = '') => /entregad|recibid|complet|finaliz/i.test(status);

test('validateVarmonttOs y normalizeVarmonttOs validan digitos y rellenan a 12 caracteres', () => {
  assert.equal(validateVarmonttOs('  12345678  '), '12345678');
  assert.equal(normalizeVarmonttOs('12345678'), '000012345678');
  assert.equal(normalizeVarmonttOs('1234567890123'), '1234567890123');

  assert.throws(() => validateVarmonttOs('   '), /Ingresa un número/);
  assert.throws(() => validateVarmonttOs('000000'), /dígitos numéricos/);
  assert.throws(() => validateVarmonttOs('OS-12345'), /dígitos numéricos/);
});

test('cleanVarmonttAgency limpia prefijos numericos y parentesis de agencias', () => {
  assert.equal(cleanVarmonttAgency('12 (SANTIAGO CENTRO)'), 'SANTIAGO CENTRO');
  assert.equal(cleanVarmonttAgency('05 PUERTO MONTT'), 'PUERTO MONTT');
  assert.equal(cleanVarmonttAgency('CONCEPCION'), 'CONCEPCION');
});

test('parseVarmonttTrackingPayload mapea envio entregado con hitos cronologicos, ruta y entrega', () => {
  const payload = {
    success: true,
    os: '000012345678',
    tiene_imagen: true,
    hitos: [
      {
        Estado: 'En Agencia Origen',
        Agencia: '01 (SANTIAGO)',
        Fecha: '20/11/2026 09:30',
      },
      {
        Estado: 'En Ruta a 14 (PUERTO MONTT)',
        Agencia: '01 (SANTIAGO)',
        Fecha: '21/11/2026 03:15',
      },
      {
        Estado: 'Entregado',
        Agencia: '14 (PUERTO MONTT)',
        Fecha: '22/11/2026 15:40',
        'Nombre Entrega': 'MARIA PEREZ',
        'Rut Entrega': '12.345.678-9',
      },
    ],
  };

  const result = parseVarmonttTrackingPayload(payload, '12345678');

  assert.equal(result.courier, 'varmontt');
  assert.equal(result.trackingNumber, '12345678');
  assert.equal(result.status, 'Entregado');
  assert.equal(isDelivered(result.status), true);
  assert.equal(result.detail, 'Entregado · PUERTO MONTT');
  assert.equal(result.origin, 'SANTIAGO');
  assert.equal(result.destination, 'PUERTO MONTT');
  assert.equal(result.lastUpdated, '22/11/2026 15:40');
  assert.equal(result.events?.length, 3);
  assert.equal(result.events?.[0].title, 'Entregado');
  assert.equal(result.events?.[0].isActive, true);
  assert.equal(result.events?.[2].title, 'En Agencia Origen');
  assert.equal(result.events?.[2].isActive, false);
  assert.ok(result.info?.some((item) => item.label === 'Entregado a' && item.value === 'MARIA PEREZ'));
  assert.ok(result.info?.some((item) => item.label === 'Comprobante digital'));
  assert.ok(result.info?.some((item) => item.label === 'OS normalizada' && item.value === '000012345678'));
});

test('Estado intermedio con "Recibido" no se clasifica como entregado en DashboardScreen', () => {
  const result = parseVarmonttTrackingPayload(
    {
      success: true,
      os: '000099988877',
      tiene_imagen: false,
      hitos: [
        {
          Estado: 'Recibido en agencia origen',
          Agencia: '01 SANTIAGO',
          Fecha: '24/11/2026 10:00',
        },
      ],
    },
    '99988877',
  );

  assert.equal(isDelivered(result.status), false);
  assert.equal(result.origin, 'SANTIAGO');
});

test('Respuesta real sin hitos de Varmontt lanza error claro', () => {
  // Exacta respuesta real observada en api_tracking.php?os=000012345678
  const emptyRealPayload = {
    success: true,
    os: '000012345678',
    tiene_imagen: false,
    hitos: [],
  };

  assert.throws(
    () => parseVarmonttTrackingPayload(emptyRealPayload, '12345678'),
    /No se encontraron datos/i,
  );
});
