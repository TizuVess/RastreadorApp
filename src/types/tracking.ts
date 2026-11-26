export type CourierId = 'blue-express' | 'pullman-cargo' | 'varmontt' | 'chilexpress' | 'correos-chile' | '17track' | 'starken';

export type TrackingEvent = {
  title: string;
  description?: string;
  isActive?: boolean;
};

export type TrackingInfo = {
  label: string;
  value: string;
};

export type TrackingResult = {
  courier: CourierId;
  trackingNumber: string;
  status: string;
  detail: string;
  origin?: string;
  destination?: string;
  lastUpdated?: string;
  events?: TrackingEvent[];
  info?: TrackingInfo[];
  raw: unknown;
};

export type CourierService = {
  id: CourierId;
  name: string;
  placeholder?: string;
  hint?: string;
  validate?: (trackingNumber: string) => string;
  lookup?: (trackingNumber: string) => Promise<TrackingResult>;
};