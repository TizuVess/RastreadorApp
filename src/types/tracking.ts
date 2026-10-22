export type CourierId = 'blue-express' | 'chilexpress' | 'correos-chile' | '17track';

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

export type TrackingError = {
  message: string;
};

export type CourierService = {
  id: CourierId;
  name: string;
  trackingUrl: string;
  buildInjectedJavaScript: (trackingNumber: string) => string;
  parseMessage: (message: string) => TrackingResult | TrackingError | null;
};