import test from 'node:test';
import assert from 'node:assert/strict';
import { getOfficialTrackingUrl, formatTrackingShareMessage } from '../src/utils/courierUrls.ts';

test('getOfficialTrackingUrl genera URLs oficiales validas para cada courier', () => {
  assert.equal(
    getOfficialTrackingUrl('blue-express', '3716170135'),
    'https://www.blue.cl/seguimiento/?os=3716170135'
  );
  assert.equal(
    getOfficialTrackingUrl('pullman-cargo', '57400022666'),
    'https://pullmancargo.cl/seguimiento/57400022666'
  );
  assert.equal(
    getOfficialTrackingUrl('varmontt', '216003254001'),
    'https://varmontt.cl/seguimiento/?os=216003254001'
  );
  assert.equal(
    getOfficialTrackingUrl('starken', '262004822'),
    'https://www.starken.cl/seguimiento?codigo=262004822'
  );
});

test('formatTrackingShareMessage produce formato limpio con emojis para WhatsApp', () => {
  const message = formatTrackingShareMessage({
    alias: 'Zapatillas Nike',
    trackingNumber: '3716170135',
    courierName: 'Blue Express',
    courierId: 'blue-express',
    statusText: 'En tránsito a destino',
    detail: 'El envío va en ruta de entrega',
    origin: 'Santiago',
    destination: 'Viña del Mar',
    lastUpdated: '27-11-2026 14:30',
  });

  assert.ok(message.includes('📦 *Seguimiento de Encomienda*'));
  assert.ok(message.includes('🏷️ *Nombre:* Zapatillas Nike'));
  assert.ok(message.includes('🚚 *Courier:* Blue Express'));
  assert.ok(message.includes('🔢 *Nº de Orden:* 3716170135'));
  assert.ok(message.includes('📍 *Estado:* En tránsito a destino'));
  assert.ok(message.includes('💬 *Detalle:* El envío va en ruta de entrega'));
  assert.ok(message.includes('🗺️ *Ruta:* Santiago ➔ Viña del Mar'));
  assert.ok(message.includes('🕒 *Actualizado:* 27-11-2026 14:30'));
  assert.ok(message.includes('https://www.blue.cl/seguimiento/?os=3716170135'));
  assert.ok(message.includes('_Compartido desde RastreoFácil_'));
});
