import type { CourierId, CourierService } from '@/types/tracking';
import { blueExpressService } from './blueExpress';

export const courierServices: Record<CourierId, CourierService> = {
  'blue-express': blueExpressService,
  chilexpress: {
    id: 'chilexpress', name: 'Chilexpress', trackingUrl: 'https://www.chilexpress.cl/',
    buildInjectedJavaScript: () => '', parseMessage: () => ({ message: 'Courier pendiente de integración' }),
  },
  'correos-chile': {
    id: 'correos-chile', name: 'Correos de Chile', trackingUrl: 'https://www.correos.cl/',
    buildInjectedJavaScript: () => '', parseMessage: () => ({ message: 'Courier pendiente de integración' }),
  },
  '17track': {
    id: '17track', name: '17TRACK', trackingUrl: 'https://www.17track.net/',
    buildInjectedJavaScript: () => '', parseMessage: () => ({ message: 'Courier pendiente de integración' }),
  },
};

export const getCourierService = (id: CourierId) => courierServices[id];