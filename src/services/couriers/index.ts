import type { CourierId, CourierService } from '@/types/tracking';
import { blueExpressService } from './blueExpress';
import { pullmanCargoService } from './pullmanCargo';
import { varmonttService } from './varmontt';

export const courierServices: Record<CourierId, CourierService> = {
  'blue-express': blueExpressService,
  'pullman-cargo': pullmanCargoService,
  varmontt: varmonttService,
  starken: {
    id: 'starken', name: 'Starken',
  },
  chilexpress: {
    id: 'chilexpress', name: 'Chilexpress',
  },
  'correos-chile': {
    id: 'correos-chile', name: 'Correos de Chile',
  },
  '17track': {
    id: '17track', name: '17TRACK',
  },
};

export const getCourierService = (id: CourierId) => courierServices[id];
