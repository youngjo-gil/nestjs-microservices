import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { Order } from './orders/order.entity';
// import { OrderItem } from './orders/order-item.entity';

@Injectable()
export class OrdersServiceService {
  constructor(
    // @InjectRepository(Order)
    // private readonly orderRepository: Repository<Order>,
    // @InjectRepository(OrderItem)
    // private readonly orderItemRepository: Repository<OrderItem>,
  ) { }

  async getOrders(): Promise<any[]> {
    // return this.orderRepository.find({ relations: ['items'] });
    return [];
  }

  async getOrder(id: string): Promise<any | null> {
    // return this.orderRepository.findOne({
    //   where: { id },
    //   relations: ['items'],
    // });
    return null;
  }

  async createOrder(data: any): Promise<any> {
    return null;
    // const order = this.orderRepository.create({
    //   userId: data.userId,
    //   status: 'pending',
    // });
    // const savedOrder = await this.orderRepository.save(order);

    // if (data.items && Array.isArray(data.items)) {
    //   const items = data.items.map((item: any) =>
    //     this.orderItemRepository.create({
    //       ...item,
    //       order: savedOrder,
    //     }),
    //   );
    //   await this.orderItemRepository.save(items);
    //   savedOrder.items = items;
    // }

    // return savedOrder;
  }

  async updateOrder(id: string, data: any): Promise<any> {
    // await this.orderRepository.update(id, {
    //   status: data.status || 'pending',
    // });
    // return this.getOrder(id);
    return null;
  }

  async deleteOrder(id: string): Promise<{ success: boolean }> {
    // await this.orderRepository.delete(id);
    return { success: true };

  }
}
