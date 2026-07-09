import { z } from 'zod';

/**
 * Zod schemas for validating Socket.IO event payloads.
 * 
 * Why validate socket events?
 * Unlike REST endpoints (which we already validate with Zod), socket events
 * bypass Express middleware entirely. A malicious client can emit any payload
 * shape they want. Without validation, we'd be writing unvalidated data into
 * our repository and broadcasting it to other clients — a serious security gap.
 */

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000), // meters — cap at 100km to reject garbage
  timestamp: z.number().int().positive(),
});

export const OrderIdSchema = z.string()
  .min(1, 'orderId cannot be empty')
  .max(128, 'orderId too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'orderId contains invalid characters');

export const RiderNameSchema = z.string()
  .min(1, 'riderName cannot be empty')
  .max(100, 'riderName too long');
