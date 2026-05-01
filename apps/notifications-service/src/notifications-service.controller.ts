import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsServiceService } from './notifications-service.service';
import { ORDER_EVENTS, USER_EVENTS } from '@app/shared';

@Controller()
export class NotificationsServiceController {
  constructor(private readonly notificationService: NotificationsServiceService) {}

  @EventPattern(ORDER_EVENTS.CREATED)
  async onOrderCreated(@Payload() data: any) {
    await this.notificationService.sendOrderNotification(
      data,
      'Order Created',
      `Your order #${data.orderId} has been created successfully!`,
    );
  }

  @EventPattern(ORDER_EVENTS.UPDATED)
  async onOrderUpdated(@Payload() data: any) {
    await this.notificationService.sendOrderNotification(
      data,
      'Order Updated',
      `Your order #${data.orderId} status has been updated to ${data.status}`,
    );
  }

  @EventPattern(ORDER_EVENTS.SHIPPED)
  async onOrderShipped(@Payload() data: any) {
    await this.notificationService.sendOrderNotification(
      data,
      'Order Shipped',
      `Your order #${data.orderId} has been shipped!`,
    );
  }

  @EventPattern(ORDER_EVENTS.DELIVERED)
  async onOrderDelivered(@Payload() data: any) {
    await this.notificationService.sendOrderNotification(
      data,
      'Order Delivered',
      `Your order #${data.orderId} has been delivered!`,
    );
  }

  @EventPattern(USER_EVENTS.REGISTERED)
  async onUserRegistered(@Payload() data: any) {
    await this.notificationService.sendWelcomeEmail(data);
  }

  @EventPattern(USER_EVENTS.DELETED)
  async onUserDeleted(@Payload() data: any) {
    await this.notificationService.sendGoodbyeEmail(data);
  }
}
