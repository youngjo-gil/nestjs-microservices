import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  @Get()
  getOrders() {
    return { message: 'Orders endpoint' };
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return { message: `Get order ${id}` };
  }

  @Post()
  createOrder(@Body() body: any) {
    return { message: 'Create order', data: body };
  }
}
