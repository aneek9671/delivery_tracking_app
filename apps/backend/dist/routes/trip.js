"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tripRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const OrderRepository_1 = require("../repositories/OrderRepository");
const uuid_1 = require("uuid");
const validation_1 = require("../validation");
exports.tripRouter = (0, express_1.Router)();
// -----------------------------------------------------------
// POST /trip/start
// -----------------------------------------------------------
const StartTripSchema = zod_1.z.object({
    riderName: validation_1.RiderNameSchema,
    orderId: validation_1.OrderIdSchema,
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
});
exports.tripRouter.post('/start', async (req, res) => {
    try {
        const data = StartTripSchema.parse(req.body);
        let order = await OrderRepository_1.orderRepository.getById(data.orderId);
        if (order) {
            order = await OrderRepository_1.orderRepository.update(data.orderId, {
                riderId: (0, uuid_1.v4)(),
                riderName: data.riderName,
                status: 'WAITING',
                startedAt: Date.now(),
                completedAt: undefined, // Reset if re-starting
            });
        }
        else {
            order = await OrderRepository_1.orderRepository.create({
                orderId: data.orderId,
                riderId: (0, uuid_1.v4)(),
                riderName: data.riderName,
                status: 'WAITING',
                startedAt: Date.now(),
            });
        }
        res.json({ success: true, order });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('[Trip] Error in /start:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// -----------------------------------------------------------
// POST /trip/status
// -----------------------------------------------------------
const UpdateStatusSchema = zod_1.z.object({
    orderId: validation_1.OrderIdSchema,
    status: zod_1.z.enum(['WAITING', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']),
});
exports.tripRouter.post('/status', async (req, res) => {
    try {
        const data = UpdateStatusSchema.parse(req.body);
        const order = await OrderRepository_1.orderRepository.update(data.orderId, {
            status: data.status,
            ...(data.status === 'DELIVERED' ? { completedAt: Date.now() } : {}),
        });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true, order });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('[Trip] Error in /status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// -----------------------------------------------------------
// GET /trip/:id
// -----------------------------------------------------------
exports.tripRouter.get('/:id', async (req, res) => {
    // Validate the route param too — don't trust URL input
    const result = validation_1.OrderIdSchema.safeParse(req.params.id);
    if (!result.success) {
        return res.status(400).json({ error: 'Invalid order ID format' });
    }
    const order = await OrderRepository_1.orderRepository.getById(result.data);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ order });
});
