import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { UsersController } from './users/users.controller';
import { AuthController } from './auth/auth.controller';
import { OrdersController } from './orders/orders.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ClientsModule.registerAsync([
      {
        name: 'USERS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URI', 'amqp://localhost:5672')],
            queue: 'users_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URI', 'amqp://localhost:5672')],
            queue: 'auth_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: 'ORDERS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URI', 'amqp://localhost:5672')],
            queue: 'orders_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [HealthController, UsersController, AuthController, OrdersController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
