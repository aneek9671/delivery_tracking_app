export type OrderStatus = 'WAITING' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface Order {
  orderId: string;
  riderId?: string;
  riderName?: string;
  status: OrderStatus;
  riderLocation?: Location;
  customerLocation?: Location;
  distance?: number; // in meters
  eta?: number; // in minutes
  startedAt?: number;
  completedAt?: number;
}

// Socket.IO Events

// Events emitted by the Client and listened to by the Server
export interface ClientToServerEvents {
  'join-order': (orderId: string) => void;
  'leave-order': (orderId: string) => void;
  'location-update': (orderId: string, location: Location) => void;
  'customer-location': (orderId: string, location: Location) => void;
  'trip-start': (orderId: string, riderName: string) => void;
  'trip-picked': (orderId: string) => void;
  'trip-complete': (orderId: string) => void;
}

// Events emitted by the Server and listened to by the Client
export interface ServerToClientEvents {
  'order-updated': (order: Order) => void;
  'location-updated': (location: Location) => void;
  'eta-updated': (eta: number, distance: number) => void;
  'status-updated': (status: OrderStatus) => void;
  'error': (message: string) => void;
}
