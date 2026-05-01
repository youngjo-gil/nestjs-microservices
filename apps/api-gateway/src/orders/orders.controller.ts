import { Controller, Get, Post, Body, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ORDERS_PATTERNS } from '@app/shared';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDERS_SERVICE')
    private readonly ordersClient: ClientProxy,
  ) { }

  @Get()
  async getOrders() {
    console.log('getOrders :::::: ');
    return await lastValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.GET_ORDERS, {}).pipe(
        timeout(5000),
      ),
    );
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return await lastValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.GET_ORDER, { id }).pipe(
        timeout(5000),
      ),
    );
  }

  @Post()
  async createOrder(@Body() body: any) {
    return await lastValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.CREATE_ORDER, body).pipe(
        timeout(5000),
      ),
    );
  }
}
