import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ApiModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URI ?? 'amqp://localhost:5672'],
        queue: process.env.API_QUEUE ?? 'api_queue',
        noAck: false,
        queueOptions: { durable: true },
      },
    },
  );

  await app.listen();
}
bootstrap();
