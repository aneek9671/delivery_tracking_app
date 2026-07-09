"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiderNameSchema = exports.OrderIdSchema = exports.LocationSchema = void 0;
const zod_1 = require("zod");
/**
 * Zod schemas for validating Socket.IO event payloads.
 *
 * Why validate socket events?
 * Unlike REST endpoints (which we already validate with Zod), socket events
 * bypass Express middleware entirely. A malicious client can emit any payload
 * shape they want. Without validation, we'd be writing unvalidated data into
 * our repository and broadcasting it to other clients — a serious security gap.
 */
exports.LocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    accuracy: zod_1.z.number().min(0).max(100000), // meters — cap at 100km to reject garbage
    timestamp: zod_1.z.number().int().positive(),
});
exports.OrderIdSchema = zod_1.z.string()
    .min(1, 'orderId cannot be empty')
    .max(128, 'orderId too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'orderId contains invalid characters');
exports.RiderNameSchema = zod_1.z.string()
    .min(1, 'riderName cannot be empty')
    .max(100, 'riderName too long');
