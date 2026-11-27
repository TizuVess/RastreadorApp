import type { CourierId } from '@/types/tracking';

/**
 * Retorna la URL directa del sitio web oficial del courier para consultar la orden.
 */
export function getOfficialTrackingUrl(courier: CourierId, trackingNumber: string): string {
  const cleanNumber = trackingNumber.trim();
  const encoded = encodeURIComponent(cleanNumber);

  switch (courier) {
    case 'blue-express':
      return `https://www.blue.cl/seguimiento/?os=${encoded}`;
    case 'pullman-cargo':
      return `https://pullmancargo.cl/seguimiento/${encoded}`;
    case 'varmontt':
      return `https://varmontt.cl/seguimiento/?os=${encoded}`;
    case 'starken':
      return `https://www.starken.cl/seguimiento?codigo=${encoded}`;
    case 'chilexpress':
      return `https://www.chilexpress.cl/tracking?orden=${encoded}`;
    case 'correos-chile':
      return `https://www.correos.cl/seguimiento-en-linea?envio=${encoded}`;
    case '17track':
      return `https://t.17track.net/es#nums=${encoded}`;
    default:
      return `https://www.google.com/search?q=${encoded}+tracking`;
  }
}

/**
 * Genera el texto formateado con emojis para compartir por WhatsApp u otras apps.
 */
export function formatTrackingShareMessage(params: {
  alias?: string;
  trackingNumber: string;
  courierName: string;
  courierId: CourierId;
  statusText: string;
  detail?: string;
  origin?: string;
  destination?: string;
  lastUpdated?: string;
}): string {
  const { alias, trackingNumber, courierName, courierId, statusText, detail, origin, destination, lastUpdated } = params;
  const officialUrl = getOfficialTrackingUrl(courierId, trackingNumber);

  const lines: string[] = [
    '📦 *Seguimiento de Encomienda*',
    '--------------------------------',
  ];

  if (alias && alias !== trackingNumber) {
    lines.push(`🏷️ *Nombre:* ${alias}`);
  }

  lines.push(`🚚 *Courier:* ${courierName}`);
  lines.push(`🔢 *Nº de Orden:* ${trackingNumber}`);
  lines.push(`📍 *Estado:* ${statusText}`);

  if (detail) {
    lines.push(`💬 *Detalle:* ${detail}`);
  }

  if (origin || destination) {
    lines.push(`🗺️ *Ruta:* ${origin ?? 'Por confirmar'} ➔ ${destination ?? 'Por confirmar'}`);
  }

  if (lastUpdated) {
    lines.push(`🕒 *Actualizado:* ${lastUpdated}`);
  }

  lines.push('--------------------------------');
  lines.push(`🔗 *Ver en sitio oficial:*`);
  lines.push(officialUrl);
  lines.push('');
  lines.push('_Compartido desde RastreoFácil_');

  return lines.join('\n');
}
