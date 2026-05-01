import { Module } from '@nestjs/common';
import { OrdersServiceController } from './orders-service.controller';
import { OrdersServiceService } from './orders-service.service';
// import { Order } from './orders/order.entity';
// import { OrderItem } from './orders/order-item.entity';

@Module({
  controllers: [OrdersServiceController],
  providers: [OrdersServiceService],
})
export class OrdersServiceModule { }
