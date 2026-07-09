import { Router } from 'express';
import { z } from 'zod';
import { orderRepository } from '../repositories/OrderRepository';
import { v4 as uuidv4 } from 'uuid';
import { OrderIdSchema, RiderNameSchema } from '../validation';

export const tripRouter = Router();

// -----------------------------------------------------------
// POST /trip/start
// -----------------------------------------------------------

const StartTripSchema = z.object({
  riderName: RiderNameSchema,
  orderId: OrderIdSchema,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

tripRouter.post('/start', async (req, res) => {
  try {
    const data = StartTripSchema.parse(req.body);

    let order = await orderRepository.getById(data.orderId);

    if (order) {
      order = await orderRepository.update(data.orderId, {
        riderId: uuidv4(),
        riderName: data.riderName,
        status: 'WAITING',
        startedAt: Date.now(),
        completedAt: undefined, // Reset if re-starting
      });
    } else {
      order = await orderRepository.create({
        orderId: data.orderId,
        riderId: uuidv4(),
        riderName: data.riderName,
        status: 'WAITING',
        startedAt: Date.now(),
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('[Trip] Error in /start:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -----------------------------------------------------------
// POST /trip/status
// -----------------------------------------------------------

const UpdateStatusSchema = z.object({
  orderId: OrderIdSchema,
  status: z.enum(['WAITING', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']),
});

tripRouter.post('/status', async (req, res) => {
  try {
    const data = UpdateStatusSchema.parse(req.body);
    const order = await orderRepository.update(data.orderId, {
      status: data.status,
      ...(data.status === 'DELIVERED' ? { completedAt: Date.now() } : {}),
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('[Trip] Error in /status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -----------------------------------------------------------
// GET /trip/:id
// -----------------------------------------------------------

tripRouter.get('/:id', async (req, res) => {
  // Validate the route param too — don't trust URL input
  const result = OrderIdSchema.safeParse(req.params.id);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid order ID format' });
  }

  const order = await orderRepository.getById(result.data);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ order });
});
