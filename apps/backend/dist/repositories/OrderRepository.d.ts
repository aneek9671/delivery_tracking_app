import { Order } from '@delivery-tracker/types';
export declare class OrderRepository {
    private orders;
    create(order: Order): Promise<Order>;
    getById(orderId: string): Promise<Order | null>;
    update(orderId: string, updates: Partial<Order>): Promise<Order | null>;
    getAll(): Promise<Order[]>;
}
export declare const orderRepository: OrderRepository;
//# sourceMappingURL=OrderRepository.d.ts.map