import { Router } from 'express';
import { z } from 'zod';
import { orderRepository } from '../repositories/OrderRepository';

export const tripRouter: Router = Router();

const StartTripSchema = z.object({
  riderName: z.string().min(1),
  orderId: z.string().min(1),
});

tripRouter.post('/start', async (req, res) => {
  try {
    const data = StartTripSchema.parse(req.body);

    const order = await orderRepository.update(data.orderId, {
      riderName: data.riderName,
      status: 'WAITING',
    });

    res.json({ success: true, order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

const UpdateStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(['WAITING', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']),
});

tripRouter.post('/status', async (req, res) => {
  try {
    const data = UpdateStatusSchema.parse(req.body);
    const order = await orderRepository.update(data.orderId, {
      status: data.status,
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

tripRouter.get('/:id', async (req, res) => {
  const order = await orderRepository.getById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ order });
});
