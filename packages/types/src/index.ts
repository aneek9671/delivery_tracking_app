// ─── Domain Models ───────────────────────────────────────────────

export type OrderStatus = 'WAITING' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface Order {
  id: string;
  riderName: string;
  status: OrderStatus;
  riderLocation?: Location;
  customerLocation?: Location;
  locationHistory: Location[];
  createdAt: number;
  updatedAt: number;
}

// ─── Socket.IO Event Types ───────────────────────────────────────

export interface ServerToClientEvents {
  'location-updated': (location: Location) => void;
  'status-updated': (status: OrderStatus) => void;
}

export interface ClientToServerEvents {
  'join-order': (orderId: string) => void;
  'leave-order': (orderId: string) => void;
  'location-update': (orderId: string, location: Location) => void;
  'trip-picked': (orderId: string) => void;
  'trip-complete': (orderId: string) => void;
}
