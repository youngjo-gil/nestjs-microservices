import { Controller } from '@nestjs/common';
import { MessagePattern, Ctx, RmqContext, Payload } from '@nestjs/microservices';
import { OrdersServiceService } from './orders-service.service';
import { ORDERS_PATTERNS } from '@app/shared';

@Controller()
export class OrdersServiceController {
  constructor(
    private readonly ordersServiceService: OrdersServiceService,
  ) { }

  @MessagePattern(ORDERS_PATTERNS.GET_ORDERS)
  async getOrders(@Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    channel.ack(ctx.getMessage());
    // return this.ordersServiceService.getOrders();
    return { message: "success" };
  }

  @MessagePattern(ORDERS_PATTERNS.GET_ORDER)
  async getOrder(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    channel.ack(ctx.getMessage());
    return this.ordersServiceService.getOrder(data.id);
  }

  @MessagePattern(ORDERS_PATTERNS.CREATE_ORDER)
  async createOrder(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    channel.ack(ctx.getMessage());

    const newOrder = await this.ordersServiceService.createOrder(data);

    // TODO: Emit event for notifications service (fire-and-forget)

    return newOrder;
  }

  @MessagePattern(ORDERS_PATTERNS.UPDATE_ORDER)
  async updateOrder(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    channel.ack(ctx.getMessage());
    return this.ordersServiceService.updateOrder(data.id, data);
  }

  @MessagePattern(ORDERS_PATTERNS.DELETE_ORDER)
  async deleteOrder(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    channel.ack(ctx.getMessage());
    return this.ordersServiceService.deleteOrder(data.id);
  }
}
