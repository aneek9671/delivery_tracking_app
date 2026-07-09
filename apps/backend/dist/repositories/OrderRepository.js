"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRepository = exports.OrderRepository = void 0;
class OrderRepository {
    orders = new Map();
    async create(order) {
        this.orders.set(order.orderId, order);
        return order;
    }
    async getById(orderId) {
        return this.orders.get(orderId) || null;
    }
    async update(orderId, updates) {
        const existing = this.orders.get(orderId);
        if (!existing)
            return null;
        const updatedOrder = { ...existing, ...updates };
        this.orders.set(orderId, updatedOrder);
        return updatedOrder;
    }
    async getAll() {
        return Array.from(this.orders.values());
    }
}
exports.OrderRepository = OrderRepository;
// Export a singleton instance for now
exports.orderRepository = new OrderRepository();
