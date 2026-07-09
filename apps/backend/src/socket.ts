import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ClientToServerEvents, ServerToClientEvents } from '@delivery-tracker/types';
import { orderRepository } from './repositories/OrderRepository';
import { LocationSchema, OrderIdSchema, RiderNameSchema } from './validation';
import { locationRateLimiter, statusRateLimiter } from './rateLimiter';

/**
 * Allowed origins for Socket.IO CORS.
 * In development we allow localhost on common Vite ports.
 * In production this MUST be set via the ALLOWED_ORIGINS env var.
 */
function getAllowedOrigins(): string[] {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  }
  // Development defaults
  return [
    'http://localhost:5173', // Vite default
    'http://localhost:5174', // Second Vite instance
    'http://localhost:3000',
  ];
}

export function setupSocket(httpServer: HttpServer) {
  const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
    },
    // Tuned for real-time tracking:
    // - Lower pingInterval means faster detection of dead connections
    // - Lower pingTimeout means we reclaim resources sooner
    pingInterval: 10_000, // 10s (default is 25s)
    pingTimeout: 5_000,   // 5s  (default is 20s)
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // -----------------------------------------------------------
    // Room management
    // -----------------------------------------------------------

    socket.on('join-order', (orderId) => {
      const result = OrderIdSchema.safeParse(orderId);
      if (!result.success) {
        socket.emit('error', `Invalid orderId: ${result.error.issues[0].message}`);
        return;
      }
      socket.join(result.data);
      console.log(`[Socket] ${socket.id} joined room: ${result.data}`);
    });

    socket.on('leave-order', (orderId) => {
      const result = OrderIdSchema.safeParse(orderId);
      if (!result.success) return; // Silently ignore — they're leaving anyway
      socket.leave(result.data);
      console.log(`[Socket] ${socket.id} left room: ${result.data}`);
    });

    // -----------------------------------------------------------
    // Location streaming (HOT PATH — latency-critical)
    // -----------------------------------------------------------

    socket.on('location-update', async (orderId, location) => {
      // 1. Validate inputs
      const orderResult = OrderIdSchema.safeParse(orderId);
      const locResult = LocationSchema.safeParse(location);
      if (!orderResult.success || !locResult.success) {
        socket.emit('error', 'Invalid location-update payload');
        return;
      }

      // 2. Rate limit — prevent flooding
      if (!locationRateLimiter.allow(socket.id, 'location-update')) {
        return; // Silently drop — the next update will go through
      }

      const validOrderId = orderResult.data;
      const validLocation = locResult.data;

      // 3. Broadcast FIRST, persist SECOND (latency optimization).
      //    The customer sees the update immediately. The repository write
      //    happens async in the background. If the write fails, the next
      //    update will overwrite it anyway — location data is ephemeral.
      io.to(validOrderId).emit('location-updated', validLocation);

      // Fire-and-forget the persistence — don't await on the hot path
      orderRepository.update(validOrderId, {
        riderLocation: validLocation
      }).catch((err) => {
        console.error(`[Socket] Failed to persist location for ${validOrderId}:`, err);
      });
    });

    // -----------------------------------------------------------
    // Customer location (low frequency — one-time or drag)
    // -----------------------------------------------------------

    socket.on('customer-location', async (orderId, location) => {
      const orderResult = OrderIdSchema.safeParse(orderId);
      const locResult = LocationSchema.safeParse(location);
      if (!orderResult.success || !locResult.success) {
        socket.emit('error', 'Invalid customer-location payload');
        return;
      }

      await orderRepository.update(orderResult.data, {
        customerLocation: locResult.data,
      });
    });

    // -----------------------------------------------------------
    // Trip lifecycle events
    // -----------------------------------------------------------

    socket.on('trip-start', async (orderId, riderName) => {
      const orderResult = OrderIdSchema.safeParse(orderId);
      const nameResult = RiderNameSchema.safeParse(riderName);
      if (!orderResult.success || !nameResult.success) {
        socket.emit('error', 'Invalid trip-start payload');
        return;
      }
      if (!statusRateLimiter.allow(socket.id, 'trip-status')) return;

      const order = await orderRepository.update(orderResult.data, {
        status: 'WAITING',
        riderName: nameResult.data,
      });
      if (order) io.to(orderResult.data).emit('status-updated', 'WAITING');
    });

    socket.on('trip-picked', async (orderId) => {
      const orderResult = OrderIdSchema.safeParse(orderId);
      if (!orderResult.success) {
        socket.emit('error', 'Invalid orderId');
        return;
      }
      if (!statusRateLimiter.allow(socket.id, 'trip-status')) return;

      const order = await orderRepository.update(orderResult.data, { status: 'PICKED_UP' });
      if (order) io.to(orderResult.data).emit('status-updated', 'PICKED_UP');
    });

    socket.on('trip-complete', async (orderId) => {
      const orderResult = OrderIdSchema.safeParse(orderId);
      if (!orderResult.success) {
        socket.emit('error', 'Invalid orderId');
        return;
      }
      if (!statusRateLimiter.allow(socket.id, 'trip-status')) return;

      const order = await orderRepository.update(orderResult.data, {
        status: 'DELIVERED',
        completedAt: Date.now(),
      });
      if (order) io.to(orderResult.data).emit('status-updated', 'DELIVERED');
    });

    // -----------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      // Clean up rate limiter state to prevent memory leaks
      locationRateLimiter.cleanup(socket.id);
      statusRateLimiter.cleanup(socket.id);
    });
  });

  return io;
}
