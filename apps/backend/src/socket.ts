import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ClientToServerEvents, ServerToClientEvents } from '@delivery-tracker/types';
import { orderRepository } from './repositories/OrderRepository';
import { LocationSchema, OrderIdSchema, RiderNameSchema } from './validation';
import { locationRateLimiter, statusRateLimiter } from './rateLimiter';

function getAllowedOrigins(): string[] {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  }
  return [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ];
}

export function setupSocket(httpServer: HttpServer) {
  const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
    },
    pingInterval: 10_000,
    pingTimeout: 5_000,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join-order', (orderId) => {
      const result = OrderIdSchema.safeParse(orderId);
      if (!result.success) return;
      socket.join(result.data);
      console.log(`[Socket] ${socket.id} joined room: ${result.data}`);
    });

    socket.on('leave-order', (orderId) => {
      const result = OrderIdSchema.safeParse(orderId);
      if (!result.success) return;
      socket.leave(result.data);
      console.log(`[Socket] ${socket.id} left room: ${result.data}`);
    });

    socket.on('location-update', async (orderId, location) => {
      const orderResult = OrderIdSchema.safeParse(orderId);
      const locResult = LocationSchema.safeParse(location);
      if (!orderResult.success || !locResult.success) return;
      if (!locationRateLimiter.allow(socket.id, 'location-update')) return;

      const validOrderId = orderResult.data;
      const validLocation = locResult.data;

      // Broadcast FIRST, persist SECOND (latency optimization)
      io.to(validOrderId).emit('location-updated', validLocation);

      orderRepository.update(validOrderId, {
        riderLocation: validLocation
      }).catch((err) => {
        console.error(`[Socket] Failed to persist location for ${validOrderId}:`, err);
      });
    });

    socket.on('trip-picked', async (orderId) => {
      const orderResult = OrderIdSchema.safeParse(orderId);
      if (!orderResult.success) return;
      if (!statusRateLimiter.allow(socket.id, 'trip-status')) return;

      const order = await orderRepository.update(orderResult.data, { status: 'PICKED_UP' });
      if (order) io.to(orderResult.data).emit('status-updated', 'PICKED_UP');
    });

    socket.on('trip-complete', async (orderId) => {
      const orderResult = OrderIdSchema.safeParse(orderId);
      if (!orderResult.success) return;
      if (!statusRateLimiter.allow(socket.id, 'trip-status')) return;

      const order = await orderRepository.update(orderResult.data, { status: 'DELIVERED' });
      if (order) io.to(orderResult.data).emit('status-updated', 'DELIVERED');
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      locationRateLimiter.cleanup(socket.id);
      statusRateLimiter.cleanup(socket.id);
    });
  });

  return io;
}
