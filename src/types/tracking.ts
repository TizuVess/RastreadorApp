export type CourierId = 'blue-express' | 'chilexpress' | 'correos-chile' | '17track' | 'starken';

export type TrackingResult = {
  courier: CourierId;
  trackingNumber: string;
  status: string;
  detail: string;
  origin?: string;
  destination?: string;
  lastUpdated?: string;
  raw: unknown;
};

export type CourierService = {
  id: CourierId;
  name: string;
  lookup?: (trackingNumber: string) => Promise<TrackingResult>;
};