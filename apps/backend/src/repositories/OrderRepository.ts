import { Order } from '@delivery-tracker/types';

export class OrderRepository {
  private orders: Map<string, Order> = new Map();

  async create(order: Order): Promise<Order> {
    this.orders.set(order.id, order);
    return order;
  }

  async getById(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  async update(orderId: string, updates: Partial<Order>): Promise<Order | null> {
    const existing = this.orders.get(orderId);
    if (!existing) {
      // Auto-create if doesn't exist (for first location-update)
      const newOrder: Order = {
        id: orderId,
        riderName: '',
        status: 'WAITING',
        locationHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...updates,
      };
      this.orders.set(orderId, newOrder);
      return newOrder;
    }

    const updatedOrder = { ...existing, ...updates, updatedAt: Date.now() };
    this.orders.set(orderId, updatedOrder);
    return updatedOrder;
  }

  async getAll(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }
}

// Export a singleton instance
export const orderRepository = new OrderRepository();
