import { z } from 'zod';

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0),
  timestamp: z.number(),
});

export const OrderIdSchema = z.string().min(1).max(100);

export const RiderNameSchema = z.string().min(1).max(100);
