import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UsersServiceModule } from './users-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UsersServiceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URI ?? 'amqp://localhost:5672'],
        queue: process.env.USERS_QUEUE ?? 'users_queue',
        queueOptions: { durable: true },
      },
    },
  );
  await app.listen();
}
bootstrap();
