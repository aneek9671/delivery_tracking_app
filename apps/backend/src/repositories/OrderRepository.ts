import { Order, OrderStatus } from '@delivery-tracker/types';

export class OrderRepository {
  private orders: Map<string, Order> = new Map();

  async create(order: Order): Promise<Order> {
    this.orders.set(order.orderId, order);
    return order;
  }

  async getById(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  async update(orderId: string, updates: Partial<Order>): Promise<Order | null> {
    const existing = this.orders.get(orderId);
    if (!existing) return null;

    const updatedOrder = { ...existing, ...updates };
    this.orders.set(orderId, updatedOrder);
    return updatedOrder;
  }

  async getAll(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }
}

// Export a singleton instance for now
export const orderRepository = new OrderRepository();
